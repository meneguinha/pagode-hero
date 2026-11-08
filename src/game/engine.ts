import confetti from 'canvas-confetti';
import type { Song, Note, GameScore, Difficulty } from '../types';
import { soundEngine, MUTE_STAGES } from '../audio/soundEngine';
import { generateChart } from './chartGenerator';
import { ROAST_PHRASES, HYPE_PHRASES, pickPhrase } from './phrases';

// Frases da resenha: só em momentos marcantes, nunca a cada nota
// Os intervalos são sorteados a cada vez para não ficar previsível.
const HYPE_STREAK_GAP: [number, number] = [5, 15]; // acertos seguidos até a próxima frase de apoio
const ROAST_FIRST_MISSES: [number, number] = [3, 5]; // erros seguidos até a primeira zoeira
const ROAST_MISS_GAP: [number, number] = [4, 8]; // se continuar errando, erros até a próxima zoeira
const CALLOUT_COOLDOWN = 7; // segundos mínimos entre duas frases, para não poluir a tela

const randomBetween = ([min, max]: [number, number]) => min + Math.floor(Math.random() * (max - min + 1));
const CALLOUT_DURATION = 2.2; // segundos na tela

// Medidor de erro: cada erro soma, cada acerto desconta.
// Ao cruzar cada limiar, mais um estágio de MUTE_STAGES para de tocar.
const ERROR_PER_MISS = 1;
const RECOVERY_PER_HIT = 0.5;
const MUTE_THRESHOLDS = [1, 3, 5, 7]; // 1 erro: cavaco; 3: +pandeiro; 5: +baixo; 7: +violão & banjo
const MAX_ERROR = 9;

// Copo de chopp: começa cheio e cada acerto é um gole. Vazio = hora de chamar o garçom.
// O tamanho do gole é calculado para o copo durar ~SECONDS_TO_EMPTY de jogo bem tocado,
// em qualquer dificuldade.
const SECONDS_TO_EMPTY = 45;
const STAR_POWER_SIP_MULTIPLIER = 3; // nota dourada = golão
const GARCOM_DURATION = 12; // segundos de 4x depois que o garçom enche o copo

// Tempo (s) que a nota leva do topo da pista até o alvo
const SPEED_BY_DIFFICULTY: Record<Difficulty, number> = {
  facil: 2.4,
  medio: 2.05,
  mestre: 1.95,
};

export interface GameEngineOptions {
  canvas: HTMLCanvasElement;
  song: Song;
  difficulty: Difficulty;
  onScoreUpdate: (score: GameScore) => void;
  onSongEnd: (finalScore: GameScore) => void;
  onMuteLevelChange?: (level: number) => void;
  onLoadingProgress?: (msg: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  backgroundVideo?: HTMLVideoElement;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private song: Song;
  private difficulty: Difficulty;
  private notes: Note[];
  private isRunning: boolean = false;
  private isPaused: boolean = false;

  private startTime: number = 0;
  private pauseTime: number = 0;
  private songDuration: number = 0;
  private lastFrameTime: number = 0;

  private errorMeter: number = 0;
  private sipSize: number = 2;
  private muteLevel: number = 0;

  // Parâmetros da Highway (Pista 3D)
  private speed: number;
  private activeKeys: boolean[] = [false, false, false, false];
  private keyGlowIntensity: number[] = [0, 0, 0, 0];

  // Feedback e Partículas
  private callout: { text: string; color: string; createdAt: number } | null = null;
  private lastCalloutAt = -Infinity;
  private lastRoast?: string;
  private lastHype?: string;
  private missStreak = 0;
  private nextHypeAt = randomBetween(HYPE_STREAK_GAP);
  private nextRoastAt = randomBetween(ROAST_FIRST_MISSES);
  private particles: {
    x: number;
    y: number;
    vx: number;
    vy: number;
    color: string;
    life: number;
    size: number;
  }[] = [];

  // Estado do Jogo
  private score: GameScore = {
    points: 0,
    streak: 0,
    maxStreak: 0,
    multiplier: 1,
    resenhaMeter: 100, // começa com o copo cheio
    isChamaGarcom: false,
    chamaGarcomTimeLeft: 0,
    totalNotes: 0,
    hitCount: {
      perfeito: 0,
      bom: 0,
      quase: 0,
      mico: 0,
    },
  };

  // Cores das Faixas (Verde, Vermelho, Amarelo, Azul)
  private readonly trackColors = ['#2ec4a6', '#e76f51', '#f2c46d', '#3d9ad1'];
  private readonly trackKeyLabels = ['A', 'S', 'K', 'L'];

  // Callbacks
  private onScoreUpdate: (score: GameScore) => void;
  private onSongEnd: (finalScore: GameScore) => void;
  private onMuteLevelChange?: (level: number) => void;
  private onLoadingProgress?: (msg: string) => void;
  private onTimeUpdate?: (currentTime: number, duration: number) => void;
  private backgroundVideo?: HTMLVideoElement;

  private animFrameId: number = 0;
  private resizeObserver?: ResizeObserver;

  constructor(options: GameEngineOptions) {
    this.canvas = options.canvas;
    const context = this.canvas.getContext('2d');
    if (!context) throw new Error('Não foi possível obter contexto 2D');
    this.ctx = context;

    this.song = options.song;
    this.difficulty = options.difficulty;
    this.speed = SPEED_BY_DIFFICULTY[options.difficulty];
    this.notes = JSON.parse(JSON.stringify(options.song.notes)); // clone
    this.songDuration = options.song.duration;
    this.score.totalNotes = this.notes.length;

    this.onScoreUpdate = options.onScoreUpdate;
    this.onSongEnd = options.onSongEnd;
    this.onMuteLevelChange = options.onMuteLevelChange;
    this.onLoadingProgress = options.onLoadingProgress;
    this.onTimeUpdate = options.onTimeUpdate;
    this.backgroundVideo = options.backgroundVideo;

    this.resizeCanvas();
    window.addEventListener('resize', this.resizeCanvas);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
      this.resizeObserver.observe(this.canvas);
    }
  }

  private resizeCanvas = () => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  /**
   * Geometria responsiva da Highway em perspectiva, compartilhada entre render() e spawnParticles().
   */
  private getHighwayGeometry(width: number, height: number) {
    const topWidth = Math.min(width * 0.45, 260);
    const bottomWidth = Math.min(width * 0.88, 520);
    const topY = height * 0.11;
    const bottomY = height * 0.91;
    const targetY = height * 0.78;

    const centerX = width / 2;
    const topStartX = centerX - topWidth / 2;
    const bottomStartX = centerX - bottomWidth / 2;

    const targetProgress = (targetY - topY) / (bottomY - topY);
    const targetLaneWidth = (topWidth + (bottomWidth - topWidth) * targetProgress) / 4;
    const targetStartX = centerX - (targetLaneWidth * 4) / 2;

    return {
      topWidth,
      bottomWidth,
      topY,
      bottomY,
      targetY,
      centerX,
      topStartX,
      bottomStartX,
      targetLaneWidth,
      targetStartX,
    };
  }

  public async start() {
    await soundEngine.resume();
    if (this.song.stems) {
      await soundEngine.loadStems(this.song.stems, (msg) => {
        this.onLoadingProgress?.(msg);
      });

      // Mapa gerado do próprio áudio do cavaquinho: notas sincronizadas com as palhetadas
      const guitar = soundEngine.getStemBuffer('guitar');
      if (guitar) {
        this.onLoadingProgress?.('Lendo as palhetadas do cavaquinho...');
        await new Promise((r) => setTimeout(r, 0)); // deixa a mensagem aparecer antes da análise
        this.notes = await generateChart(guitar, this.difficulty, this.song.id);
        this.score.totalNotes = this.notes.length;
      }
    } else if (this.song.audioUrl) {
      await soundEngine.loadAudio(this.song.audioUrl);
    }
    this.sipSize = this.computeSipSize();
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = performance.now();
    this.lastFrameTime = performance.now();

    soundEngine.playAudioTrack(0);
    this.setMuteLevel(0);
    this.syncVideo(0);
    this.loop();
  }

  public getPaused(): boolean {
    return this.isPaused;
  }

  public isGameRunning(): boolean {
    return this.isRunning;
  }

  public pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.pauseTime = performance.now();
    this.activeKeys = [false, false, false, false];
    soundEngine.pauseAudioTrack();
    this.backgroundVideo?.pause();
  }

  public resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    const elapsedPaused = performance.now() - this.pauseTime;
    this.startTime += elapsedPaused;
    const current = this.getSongCurrentTime();
    soundEngine.playAudioTrack(current);
    soundEngine.setMuteLevel(this.muteLevel);
    this.syncVideo(current);
  }

  public stop() {
    this.isRunning = false;
    cancelAnimationFrame(this.animFrameId);
    soundEngine.pauseAudioTrack();
    this.backgroundVideo?.pause();
    window.removeEventListener('resize', this.resizeCanvas);
    this.resizeObserver?.disconnect();
  }

  /**
   * Mantém o clipe de fundo no mesmo ponto da música. Pequenas diferenças são
   * corrigidas ajustando a velocidade; diferenças grandes, pulando direto.
   */
  private syncVideo(songTime: number) {
    const video = this.backgroundVideo;
    if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA) return;

    const target = songTime + (this.song.videoOffset ?? 0);
    if (target < 0 || target >= video.duration) {
      if (!video.paused) video.pause();
      return;
    }

    const drift = video.currentTime - target;
    if (Math.abs(drift) > 0.3) {
      video.currentTime = target;
      video.playbackRate = 1;
    } else {
      video.playbackRate = Math.max(0.95, Math.min(1.05, 1 - drift * 0.5));
    }
    if (video.paused) video.play().catch(() => {});
  }

  public getSongCurrentTime(): number {
    if (!this.isRunning) return 0;
    if (soundEngine.isUsingRealAudio()) {
      return soundEngine.getCurrentTime();
    }
    return (performance.now() - this.startTime) / 1000;
  }

  private computeMultiplier(): number {
    if (this.score.isChamaGarcom) return 4;
    if (this.score.streak >= 25) return 4;
    if (this.score.streak >= 15) return 3;
    if (this.score.streak >= 8) return 2;
    return 1;
  }

  /**
   * Processa entrada de tecla do usuário (down ou up)
   */
  public handleKeyDown(trackIndex: number) {
    if (!this.isRunning || this.isPaused || trackIndex < 0 || trackIndex > 3) return;
    this.activeKeys[trackIndex] = true;
    this.keyGlowIntensity[trackIndex] = 1.0;

    const currentTime = this.getSongCurrentTime();

    // Procura a nota mais próxima na faixa que ainda não foi acertada
    // Janela de hit bem mais ampla e amigável: ±280ms
    const HIT_WINDOW = 0.28;
    let closestNote: Note | null = null;
    let minDiff = Infinity;

    for (const note of this.notes) {
      if (note.track === trackIndex && !note.hit && !note.missed) {
        const diff = Math.abs(note.time - currentTime);
        if (diff <= HIT_WINDOW && diff < minDiff) {
          minDiff = diff;
          closestNote = note;
        }
      }
    }

    if (closestNote) {
      // Acertou a nota!
      closestNote.hit = true;
      let points: number;

      if (minDiff <= 0.09) {
        points = 100;
        this.score.hitCount.perfeito++;
      } else if (minDiff <= 0.19) {
        points = 60;
        this.score.hitCount.bom++;
      } else {
        points = 35;
        this.score.hitCount.quase++;
      }

      this.changeErrorMeter(-RECOVERY_PER_HIT);
      if (this.missStreak > 0) {
        this.missStreak = 0;
        this.nextRoastAt = randomBetween(ROAST_FIRST_MISSES);
      }

      // Incrementa combo & resenha
      this.score.streak++;
      if (this.score.streak > this.score.maxStreak) {
        this.score.maxStreak = this.score.streak;
      }

      // Multiplicador unificado baseado em combo / Chama o Garçom
      this.score.multiplier = this.computeMultiplier();
      this.score.points += points * this.score.multiplier;

      // Cada acerto é um gole no chopp (enquanto o garçom está na mesa, o copo fica cheio)
      if (!this.score.isChamaGarcom) {
        const sip = closestNote.isStarPower ? this.sipSize * STAR_POWER_SIP_MULTIPLIER : this.sipSize;
        this.score.resenhaMeter = Math.max(0, this.score.resenhaMeter - sip);
      }

      if (this.score.streak >= this.nextHypeAt) {
        this.nextHypeAt = this.score.streak + randomBetween(HYPE_STREAK_GAP);
        this.lastHype = pickPhrase(HYPE_PHRASES, this.lastHype);
        this.showCallout(this.lastHype, '#f2c46d');
      }

      this.spawnParticles(trackIndex);
      this.onScoreUpdate({ ...this.score });
    } else {
      // Checa se havia uma nota ativa passando em outra pista (errou a corda!)
      const wrongTrackNote = this.notes.find(
        (n) => !n.hit && !n.missed && Math.abs(n.time - currentTime) <= HIT_WINDOW
      );
      if (wrongTrackNote) {
        wrongTrackNote.missed = true;
        this.registerMiss();
      }
    }
  }

  private computeSipSize() {
    if (this.notes.length < 2) return 2;
    const span = this.notes[this.notes.length - 1].time - this.notes[0].time;
    const notesPerSecond = this.notes.length / Math.max(1, span);
    // Ajuste pelas notas douradas, que valem um golão
    const stars = this.notes.filter((n) => n.isStarPower).length;
    const weighted = (this.notes.length + stars * (STAR_POWER_SIP_MULTIPLIER - 1)) / this.notes.length;
    return 100 / (notesPerSecond * weighted * SECONDS_TO_EMPTY);
  }

  private registerMiss() {
    this.score.streak = 0;
    this.score.multiplier = this.computeMultiplier();
    this.score.hitCount.mico++;
    this.changeErrorMeter(ERROR_PER_MISS);

    // Combo quebrou: sorteia de novo quantos acertos até a próxima frase de apoio
    this.nextHypeAt = randomBetween(HYPE_STREAK_GAP);

    this.missStreak++;
    if (this.missStreak >= this.nextRoastAt) {
      this.nextRoastAt = this.missStreak + randomBetween(ROAST_MISS_GAP);
      this.lastRoast = pickPhrase(ROAST_PHRASES, this.lastRoast);
      this.showCallout(this.lastRoast, '#e76f51');
    }

    this.onScoreUpdate({ ...this.score });
  }

  private showCallout(text: string, color: string) {
    const now = performance.now() / 1000;
    if (now - this.lastCalloutAt < CALLOUT_COOLDOWN) return;
    this.lastCalloutAt = now;
    this.callout = { text, color, createdAt: now };
  }

  private changeErrorMeter(delta: number) {
    this.errorMeter = Math.max(0, Math.min(MAX_ERROR, this.errorMeter + delta));
    const level = MUTE_THRESHOLDS.filter((t) => this.errorMeter >= t).length;
    if (level !== this.muteLevel) this.setMuteLevel(level);
  }

  private setMuteLevel(level: number) {
    this.muteLevel = Math.min(level, MUTE_STAGES.length);
    soundEngine.setMuteLevel(this.muteLevel);
    this.onMuteLevelChange?.(this.muteLevel);
  }

  public handleKeyUp(trackIndex: number) {
    if (trackIndex >= 0 && trackIndex <= 3) {
      this.activeKeys[trackIndex] = false;
    }
  }

  /**
   * Ativação especial "Chama o Garçom!" (Barra de Espaço)
   */
  public activateChamaGarcom() {
    // Só dá para chamar o garçom com o copo vazio
    if (!this.isRunning || this.isPaused || this.score.isChamaGarcom || this.score.resenhaMeter > 0) return;

    this.score.isChamaGarcom = true;
    this.score.chamaGarcomTimeLeft = GARCOM_DURATION;
    this.score.multiplier = 4;
    this.score.resenhaMeter = 100; // o garçom chega e enche o copo

    // Chuva de confete e brilho
    try {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#ffd166', '#06d6a0', '#26a7de', '#ff7b54'],
      });
    } catch {
      // Ignora se indisponível
    }

    this.onScoreUpdate({ ...this.score });
  }

  private spawnParticles(track: number) {
    const rect = this.canvas.getBoundingClientRect();
    const { targetY, targetStartX, targetLaneWidth } = this.getHighwayGeometry(rect.width, rect.height);
    const targetX = targetStartX + track * targetLaneWidth + targetLaneWidth / 2;

    const color = this.trackColors[track];

    for (let i = 0; i < 14; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.particles.push({
        x: targetX,
        y: targetY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        color,
        life: 1.0,
        size: Math.random() * 4 + 2,
      });
    }
  }

  /**
   * Loop Principal de Animação e Renderização Canvas 3D
   */
  private loop = () => {
    if (!this.isRunning) return;

    if (!this.isPaused) {
      const currentTime = this.getSongCurrentTime();
      const now = performance.now();
      const dt = (now - this.lastFrameTime) / 1000;
      this.lastFrameTime = now;

      // Checa fim da música
      if (currentTime >= this.songDuration) {
        this.isRunning = false;
        this.backgroundVideo?.pause();
        this.onSongEnd({ ...this.score });
        return;
      }

      // Atualiza modo "Chama o Garçom"
      if (this.score.isChamaGarcom) {
        this.score.chamaGarcomTimeLeft -= dt;
        if (this.score.chamaGarcomTimeLeft <= 0) {
          this.score.isChamaGarcom = false;
          this.score.multiplier = this.computeMultiplier();
          this.onScoreUpdate({ ...this.score });
        }
      }

      // Checa notas que passaram sem acerto (Mico/Miss)
      for (const note of this.notes) {
        if (!note.hit && !note.missed && currentTime > note.time + 0.28) {
          note.missed = true;
          this.registerMiss();
        }
      }

      // Sincroniza tempo, clipe e renderiza Canvas
      this.onTimeUpdate?.(Math.max(0, currentTime), this.songDuration);
      this.syncVideo(currentTime);
      this.render(currentTime);
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  /**
   * Renderização da Highway 3D no Canvas
   */
  private render(currentTime: number) {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);

    const {
      topWidth,
      bottomWidth,
      topY,
      bottomY,
      targetY,
      centerX,
      topStartX,
      bottomStartX,
      targetLaneWidth,
      targetStartX,
    } = this.getHighwayGeometry(width, height);

    // 1. Fundo da Highway (Asfalto/Madeira de Boteco)
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(topStartX, topY);
    this.ctx.lineTo(topStartX + topWidth, topY);
    this.ctx.lineTo(bottomStartX + bottomWidth, bottomY);
    this.ctx.lineTo(bottomStartX, bottomY);
    this.ctx.closePath();

    const roadGrad = this.ctx.createLinearGradient(0, topY, 0, bottomY);
    if (this.score.isChamaGarcom) {
      // Pôr do sol na praia
      roadGrad.addColorStop(0, 'rgba(45, 25, 60, 0.95)');
      roadGrad.addColorStop(0.5, 'rgba(120, 50, 60, 0.93)');
      roadGrad.addColorStop(1, 'rgba(190, 95, 60, 0.96)');
    } else {
      // As notas vêm do mar ao entardecer e chegam na mesa de madeira do quiosque
      roadGrad.addColorStop(0, 'rgba(15, 36, 48, 0.9)');
      roadGrad.addColorStop(0.55, 'rgba(22, 40, 52, 0.93)');
      roadGrad.addColorStop(0.8, 'rgba(74, 50, 32, 0.95)');
      roadGrad.addColorStop(1, 'rgba(92, 62, 38, 0.97)');
    }
    this.ctx.fillStyle = roadGrad;
    this.ctx.fill();

    // Bordas de Neon da Highway
    this.ctx.lineWidth = this.score.isChamaGarcom ? 6 : 3;
    this.ctx.strokeStyle = this.score.isChamaGarcom ? '#e76f51' : '#f2c46d';
    this.ctx.shadowColor = this.score.isChamaGarcom ? '#ffb38a' : '#e9a04a';
    this.ctx.shadowBlur = this.score.isChamaGarcom ? 18 : 8;

    this.ctx.beginPath();
    this.ctx.moveTo(topStartX, topY);
    this.ctx.lineTo(bottomStartX, bottomY);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(topStartX + topWidth, topY);
    this.ctx.lineTo(bottomStartX + bottomWidth, bottomY);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Divisórias das 4 cordas/faixas
    for (let i = 1; i < 4; i++) {
      const topX = topStartX + (topWidth / 4) * i;
      const btmX = bottomStartX + (bottomWidth / 4) * i;
      this.ctx.beginPath();
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = 'rgba(246, 239, 226, 0.16)';
      this.ctx.moveTo(topX, topY);
      this.ctx.lineTo(btmX, bottomY);
      this.ctx.stroke();
    }

    // Brilho de tecla pressionada na pista
    for (let i = 0; i < 4; i++) {
      const topLaneLeft = topStartX + (topWidth / 4) * i;
      const topLaneRight = topLaneLeft + topWidth / 4;
      const btmLaneLeft = bottomStartX + (bottomWidth / 4) * i;
      const btmLaneRight = btmLaneLeft + bottomWidth / 4;

      if (this.activeKeys[i] || this.keyGlowIntensity[i] > 0.05) {
        const glow = this.keyGlowIntensity[i];
        this.ctx.beginPath();
        this.ctx.moveTo(topLaneLeft, topY);
        this.ctx.lineTo(topLaneRight, topY);
        this.ctx.lineTo(btmLaneRight, bottomY);
        this.ctx.lineTo(btmLaneLeft, bottomY);
        this.ctx.closePath();

        const laneGrad = this.ctx.createLinearGradient(0, topY, 0, bottomY);
        laneGrad.addColorStop(0, 'rgba(0,0,0,0)');
        laneGrad.addColorStop(0.7, `${this.trackColors[i]}${Math.floor(glow * 50).toString(16).padStart(2, '0')}`);
        laneGrad.addColorStop(1, `${this.trackColors[i]}${Math.floor(glow * 140).toString(16).padStart(2, '0')}`);
        this.ctx.fillStyle = laneGrad;
        this.ctx.fill();

        this.keyGlowIntensity[i] *= 0.9;
      }
    }

    // 2. Linha de Alvo / Hit Zone (Onde a palheta acerta!)
    this.ctx.beginPath();
    this.ctx.lineWidth = 4;
    this.ctx.strokeStyle = this.score.isChamaGarcom ? '#ffe29a' : '#f6efe2';
    this.ctx.shadowColor = '#ffffff';
    this.ctx.shadowBlur = 12;
    this.ctx.moveTo(targetStartX, targetY);
    this.ctx.lineTo(targetStartX + targetLaneWidth * 4, targetY);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Alvos circulares nas 4 faixas
    for (let i = 0; i < 4; i++) {
      const targetCenter = targetStartX + targetLaneWidth * i + targetLaneWidth / 2;
      const radius = targetLaneWidth * 0.36;

      this.ctx.beginPath();
      this.ctx.arc(targetCenter, targetY, radius, 0, Math.PI * 2);
      this.ctx.lineWidth = this.activeKeys[i] ? 5 : 2.5;
      this.ctx.strokeStyle = this.trackColors[i];
      this.ctx.fillStyle = this.activeKeys[i] ? this.trackColors[i] : 'rgba(15, 36, 48, 0.85)';
      this.ctx.fill();
      this.ctx.stroke();

      // Letra da tecla dentro do alvo
      this.ctx.fillStyle = this.activeKeys[i] ? '#000000' : '#ffffff';
      this.ctx.font = `${Math.floor(radius * 0.95)}px 'Permanent Marker', sans-serif`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(this.trackKeyLabels[i], targetCenter, targetY);
    }

    // 3. Renderização das Notas descendo pela perspectiva
    for (const note of this.notes) {
      if (note.hit || note.missed) continue;

      const timeDiff = note.time - currentTime;
      // Se a nota está dentro da janela visível (speed até -0.2s)
      if (timeDiff > this.speed || timeDiff < -0.2) continue;

      // Progresso vertical: 0 (no topo) a 1 (na linha de alvo)
      const progress = 1 - timeDiff / this.speed;
      const currentY = topY + (targetY - topY) * progress;

      // Interpolação de largura na perspectiva
      const currentHighwayWidth = topWidth + (bottomWidth - topWidth) * ((currentY - topY) / (bottomY - topY));
      const currentLaneWidth = currentHighwayWidth / 4;
      const currentStartX = centerX - currentHighwayWidth / 2;
      const noteX = currentStartX + currentLaneWidth * note.track + currentLaneWidth / 2;
      const noteRadius = currentLaneWidth * 0.35;

      // Desenha a Nota
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(noteX, currentY, noteRadius, 0, Math.PI * 2);

      const color = note.isStarPower ? '#ffd166' : this.trackColors[note.track];
      this.ctx.fillStyle = color;
      this.ctx.shadowColor = color;
      this.ctx.shadowBlur = note.isStarPower ? 20 : 10;
      this.ctx.fill();

      // Anel interno para efeito de pandeiro / tampinha de chopp
      this.ctx.beginPath();
      this.ctx.arc(noteX, currentY, noteRadius * 0.55, 0, Math.PI * 2);
      this.ctx.fillStyle = note.isStarPower ? '#ffffff' : 'rgba(255, 255, 255, 0.85)';
      this.ctx.fill();

      // Brilho estrela se for Star Power
      if (note.isStarPower) {
        this.ctx.fillStyle = '#b8572f';
        this.ctx.font = `bold ${Math.floor(noteRadius * 0.7)}px sans-serif`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⭐', noteX, currentY);
      }

      this.ctx.restore();
    }

    // 4. Renderização de Partículas
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.035;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;
    }

    // 5. Frase da resenha (zoeira ou apoio), no meio da pista
    if (this.callout) {
      const elapsed = performance.now() / 1000 - this.callout.createdAt;
      if (elapsed > CALLOUT_DURATION) {
        this.callout = null;
      } else {
        const fadeIn = Math.min(1, elapsed / 0.15);
        const fadeOut = Math.min(1, (CALLOUT_DURATION - elapsed) / 0.4);
        const pop = 0.85 + 0.15 * Math.min(1, elapsed / 0.2);
        const y = topY + (targetY - topY) * 0.38 - elapsed * 12;

        this.ctx.save();
        this.ctx.font = "36px 'Permanent Marker', system-ui, sans-serif";
        const textWidth = this.ctx.measureText(this.callout.text).width;
        const fit = Math.min(1, (width * 0.9) / textWidth);
        this.ctx.translate(centerX, y);
        this.ctx.rotate(-0.04);
        this.ctx.scale(pop * fit, pop * fit);
        this.ctx.globalAlpha = Math.min(fadeIn, fadeOut);
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = 8;
        this.ctx.strokeStyle = 'rgba(12, 30, 40, 0.92)';
        this.ctx.strokeText(this.callout.text, 0, 0);
        this.ctx.fillStyle = this.callout.color;
        this.ctx.fillText(this.callout.text, 0, 0);
        this.ctx.restore();
      }
    }

    this.ctx.restore();
  }
}
