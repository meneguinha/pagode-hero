// Motor de Áudio Web Audio API de Alta Precisão (Guitar Hero Engine)
// Utiliza AudioBuffer decodificado para timing perfeito de milissegundo.
// Quanto mais o jogador erra, mais instrumentos param (ver MUTE_STAGES).
// A voz nunca para, para a música seguir reconhecível.

import type { SongStems } from '../types';

export type StemName = 'drums' | 'guitar' | 'vocals' | 'bass' | 'piano' | 'other';

const STEM_NAMES: StemName[] = ['guitar', 'drums', 'vocals', 'bass', 'piano', 'other'];

// Ordem em que os instrumentos param conforme o nível de erro sobe.
// Nível 1 = só o cavaco para; nível 2 = cavaco + pandeiro; e assim por diante.
export const MUTE_STAGES: { label: string; stems: StemName[] }[] = [
  { label: '🪕 Cavaco', stems: ['guitar'] },
  { label: '🥁 Pandeiro', stems: ['drums'] },
  { label: '🎸 Baixo', stems: ['bass'] },
  // O separador chama de "piano"/"other" o que, no pagode, é violão de 7 cordas e banjo
  { label: '🎶 Violão & Banjo', stems: ['piano', 'other'] },
];

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;

  // Cache global por URL para suportar múltiplas músicas sem recarregar nem misturar faixas
  private urlBufferCache = new Map<string, AudioBuffer>();

  // Stems Buffers ativos da música selecionada (PCM em memória)
  private stemBuffers: Partial<Record<StemName, AudioBuffer>> = {};
  private stemUrls: Partial<Record<StemName, string>> = {};

  // Um nó de ganho por stem, para mutar cada instrumento separadamente
  private stemGainNodes: Partial<Record<StemName, GainNode>> = {};

  // Fontes em execução (SourceNodes)
  private stemSources: AudioBufferSourceNode[] = [];

  // Fallback para áudio único (caso não haja stems separados)
  private audioBuffer: AudioBuffer | null = null;
  private currentSourceNode: AudioBufferSourceNode | null = null;
  private musicLowpassFilter: BiquadFilterNode | null = null;
  private musicVolumeGain: GainNode | null = null;

  // Controle de reprodução e tempo
  private audioStartTime: number = 0;
  private pauseOffset: number = 0;
  private isPlaying: boolean = false;
  private muteLevel: number = 0;
  private userLatency: number = 0; // segundos, ajustado pelo jogador nas configurações

  constructor() {}

  public init() {
    if (this.ctx) return;
    const AudioCtxClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new AudioCtxClass();

    // Ganho Master
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.95, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    for (const name of STEM_NAMES) {
      const node = this.ctx.createGain();
      node.gain.setValueAtTime(1.0, this.ctx.currentTime);
      node.connect(this.masterGain);
      this.stemGainNodes[name] = node;
    }

    // Fallback: Filtro Passa-Baixa da Música e Volume Geral para faixas não-separadas
    this.musicLowpassFilter = this.ctx.createBiquadFilter();
    this.musicLowpassFilter.type = 'lowpass';
    this.musicLowpassFilter.frequency.setValueAtTime(20000, this.ctx.currentTime);
    this.musicLowpassFilter.Q.setValueAtTime(1.0, this.ctx.currentTime);

    this.musicVolumeGain = this.ctx.createGain();
    this.musicVolumeGain.gain.setValueAtTime(1.0, this.ctx.currentTime);

    this.musicLowpassFilter.connect(this.musicVolumeGain);
    this.musicVolumeGain.connect(this.masterGain);
  }

  public async resume() {
    if (!this.ctx) this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
  }

  public hasLoadedStems(): boolean {
    return Boolean(this.stemBuffers.drums && this.stemBuffers.guitar);
  }

  public getStemBuffer(name: StemName): AudioBuffer | undefined {
    return this.stemBuffers[name];
  }

  public getCurrentTime(): number {
    if (!this.ctx || !this.isPlaying) return this.pauseOffset;
    // O que sai na caixa de som está atrasado em relação ao relógio do AudioContext;
    // descontar essa latência mantém a tela alinhada com o que se ouve.
    const latency = (this.ctx.outputLatency || this.ctx.baseLatency || 0) + this.userLatency;
    return this.ctx.currentTime - this.audioStartTime - latency;
  }

  public isUsingRealAudio(): boolean {
    return this.isPlaying && (this.hasLoadedStems() || this.audioBuffer !== null);
  }

  /**
   * Define quantos estágios de MUTE_STAGES estão mutados (0 = banda completa).
   */
  public setMuteLevel(level: number) {
    if (!this.ctx) return;
    this.muteLevel = Math.max(0, Math.min(MUTE_STAGES.length, level));
    const now = this.ctx.currentTime;

    const muted = new Set(MUTE_STAGES.slice(0, this.muteLevel).flatMap((stage) => stage.stems));
    for (const name of STEM_NAMES) {
      const node = this.stemGainNodes[name];
      if (!node) continue;
      // Rampa curta para evitar estalo no áudio
      node.gain.cancelScheduledValues(now);
      node.gain.setTargetAtTime(muted.has(name) ? 0.0001 : 1.0, now, muted.has(name) ? 0.025 : 0.02);
    }

    // Sem stems separados: abafa a música inteira proporcionalmente ao nível
    if (!this.hasLoadedStems() && this.musicLowpassFilter && this.musicVolumeGain) {
      const ratio = this.muteLevel / MUTE_STAGES.length;
      this.musicLowpassFilter.frequency.cancelScheduledValues(now);
      this.musicLowpassFilter.frequency.setTargetAtTime(ratio === 0 ? 20000 : 2000 * (1 - ratio) + 400, now, 0.03);
      this.musicVolumeGain.gain.cancelScheduledValues(now);
      this.musicVolumeGain.gain.setTargetAtTime(1 - ratio * 0.6, now, 0.03);
    }
  }

  /**
   * Carrega os stems isolados (drums, guitar, vocals, bass, piano, other),
   * diferenciando por URL para suportar múltiplas músicas no catálogo.
   */
  public async loadStems(stems: SongStems, onProgress?: (msg: string) => void): Promise<void> {
    this.init();
    if (!this.ctx) return;

    const stemKeys: (keyof SongStems)[] = ['guitar', 'drums', 'vocals', 'bass', 'piano', 'other'];
    const available = stemKeys.filter((k) => Boolean(stems[k]));
    const total = available.length;
    let completed = 0;

    // Limpa referências de stems que a nova música não possua
    for (const key of stemKeys) {
      if (!stems[key]) {
        delete this.stemBuffers[key];
        delete this.stemUrls[key];
      }
    }

    await Promise.all(
      available.map(async (key) => {
        const url = stems[key];
        if (!url) return;

        // Se a mesma URL já está no cache, reutiliza instantaneamente
        const cached = this.urlBufferCache.get(url);
        if (cached) {
          this.stemBuffers[key] = cached;
          this.stemUrls[key] = url;
          completed++;
          onProgress?.(`Preparando trilha ${key} (${completed}/${total})...`);
          return;
        }

        try {
          onProgress?.(`Baixando faixa ${key} (${completed + 1}/${total})...`);
          const res = await fetch(url);
          const arrayBuffer = await res.arrayBuffer();
          const decoded = await this.ctx!.decodeAudioData(arrayBuffer);
          this.urlBufferCache.set(url, decoded);
          this.stemBuffers[key] = decoded;
          this.stemUrls[key] = url;
          completed++;
          onProgress?.(`Faixa ${key} pronta (${completed}/${total})`);
        } catch (err) {
          console.error(`Erro ao carregar stem ${key}:`, err);
        }
      })
    );
  }

  /**
   * Fallback para carregar áudio direto ou upload do usuário
   */
  public async loadAudio(
    backingSource: File | string,
    cavacoSource?: File | string
  ): Promise<void> {
    this.init();
    if (!this.ctx) return;

    let arrayBuffer: ArrayBuffer;
    if (typeof backingSource === 'string') {
      const cached = this.urlBufferCache.get(backingSource);
      if (cached) {
        this.audioBuffer = cached;
      } else {
        const response = await fetch(backingSource);
        arrayBuffer = await response.arrayBuffer();
        this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.urlBufferCache.set(backingSource, this.audioBuffer);
      }
    } else {
      arrayBuffer = await backingSource.arrayBuffer();
      this.audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    }

    if (cavacoSource) {
      if (typeof cavacoSource === 'string') {
        const cached = this.urlBufferCache.get(cavacoSource);
        if (cached) {
          this.stemBuffers.guitar = cached;
        } else {
          const response = await fetch(cavacoSource);
          const cavacoArrayBuffer = await response.arrayBuffer();
          const decoded = await this.ctx.decodeAudioData(cavacoArrayBuffer);
          this.urlBufferCache.set(cavacoSource, decoded);
          this.stemBuffers.guitar = decoded;
        }
      } else {
        const cavacoArrayBuffer = await cavacoSource.arrayBuffer();
        this.stemBuffers.guitar = await this.ctx.decodeAudioData(cavacoArrayBuffer);
      }
    }
  }

  public playAudioTrack(startTime: number = 0) {
    if (!this.ctx) return;
    this.stopAudioNodes();

    this.audioStartTime = this.ctx.currentTime - startTime;
    this.pauseOffset = startTime;
    this.isPlaying = true;

    if (this.hasLoadedStems()) {
      // Inicia todos os stems sincronizados na mesma amostra de tempo
      for (const key of STEM_NAMES) {
        const buf = this.stemBuffers[key];
        if (!buf) continue;

        const src = this.ctx.createBufferSource();
        src.buffer = buf;

        src.connect(this.stemGainNodes[key]!);

        src.start(0, startTime);
        this.stemSources.push(src);
      }
    } else if (this.audioBuffer) {
      // Modo fallback
      this.currentSourceNode = this.ctx.createBufferSource();
      this.currentSourceNode.buffer = this.audioBuffer;
      this.currentSourceNode.connect(this.musicLowpassFilter!);
      this.currentSourceNode.start(0, startTime);
    }

    // Garante que o áudio começa com a banda completa
    this.setMuteLevel(0);
  }

  public pauseAudioTrack() {
    if (!this.isPlaying) return;
    if (this.ctx) this.pauseOffset = this.ctx.currentTime - this.audioStartTime;
    this.isPlaying = false;
    this.stopAudioNodes();
  }

  private stopAudioNodes() {
    for (const src of this.stemSources) {
      try {
        src.stop();
        src.disconnect();
      } catch {}
    }
    this.stemSources = [];

    if (this.currentSourceNode) {
      try {
        this.currentSourceNode.stop();
        this.currentSourceNode.disconnect();
      } catch {}
      this.currentSourceNode = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.95, this.ctx.currentTime);
    }
  }

  /** Atraso extra (ms) do som do jogador, ex.: fone Bluetooth. */
  public setUserLatency(ms: number) {
    this.userLatency = ms / 1000;
  }

  public getTotalLatencyMs(): number {
    const hwLatency = this.ctx ? (this.ctx.outputLatency || this.ctx.baseLatency || 0) : 0;
    return Math.round((hwLatency + this.userLatency) * 1000);
  }

  /**
   * Toca um pulso percussivo curto (estilo pandeiro/clave) para calibrar a latência nas configurações.
   */
  public async playCalibrationClick(accent = false): Promise<void> {
    await this.resume();
    if (!this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(accent ? 980 : 660, now);
    osc.frequency.exponentialRampToValueAtTime(accent ? 280 : 190, now + 0.065);

    gain.gain.setValueAtTime(0.45, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);
  }
}

export const soundEngine = new SoundEngine();
