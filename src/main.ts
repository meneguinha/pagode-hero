import './style.css';
import './ageModal.css';
import { SONGS } from './songs';
import type { Song, GameScore, Difficulty } from './types';
import { GameEngine } from './game/engine';
import { soundEngine, MUTE_STAGES } from './audio/soundEngine';
import { renderKiosqueBackground, renderKiosqueFrame } from './ui/kiosqueScene';
import {
  loadSettings,
  saveSettings,
  loadScores,
  addScore,
  bestScore,
  isAgeVerified,
  setAgeVerified,
  type Settings,
} from './storage';

// Pinceladas usadas como máscara nos botões e painéis (cantos irregulares de tinta)
const BRUSH_BAR_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M6 14 C40 8 90 12 140 8 S240 10 300 6 S370 9 394 12 L386 22 L398 31 L388 41 L396 51 L384 61 L392 71 C340 75 280 70 220 74 S110 70 60 74 S20 72 4 68 L12 58 L2 46 L10 36 L0 24 Z"/><path d="M300 2 h70 v3 h-70z M40 76 h90 v3 h-90z"/></svg>`;
const BRUSH_PANEL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" preserveAspectRatio="none"><path d="M10 12 L80 5 L170 10 L260 4 L340 9 L394 6 L390 80 L397 170 L391 260 L398 340 L392 395 L320 390 L230 396 L140 391 L60 397 L5 392 L10 320 L3 230 L9 140 L2 60 Z"/></svg>`;
const svgUrl = (svg: string) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const DIFFICULTY_LABEL: Record<Difficulty, string> = { facil: 'Fácil', medio: 'Médio', mestre: 'Mestre 👑' };

const escapeHtml = (text: string) =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

const formatTime = (seconds: number): string => {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ICONS = {
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z" fill="currentColor"/></svg>',
  music: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18.5a3 3 0 1 1-2-2.83V5l12-2v12.5a3 3 0 1 1-2-2.83V7.4l-8 1.4z" fill="currentColor"/></svg>',
  ranking: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="13" width="4.5" height="8" rx="1" fill="currentColor"/><rect x="9.75" y="8" width="4.5" height="13" rx="1" fill="currentColor"/><rect x="16.5" y="3" width="4.5" height="18" rx="1" fill="currentColor"/></svg>',
  settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3h-4l-.4 2.9a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.6 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1L11 21h4l.4-2.9a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z" fill="currentColor" transform="translate(-1 0)"/></svg>',
};

type MenuView = 'songs' | 'ranking' | 'settings';

// Copo de chopp (unidades do viewBox do SVG): interior vai de y=14 (borda) a y=172 (fundo)
const CHOPP_INTERIOR_HEIGHT = 158;

// Deslocamento do líquido para um nível 0–100. Perto de vazio, desce um pouco além
// do interior para o colarinho sumir no fundo do copo.
function choppOffset(level: number) {
  const fill = Math.max(0, Math.min(1, level / 100));
  return CHOPP_INTERIOR_HEIGHT * (1 - fill) + 14 * Math.max(0, 1 - fill / 0.08);
}

class PagodeHeroApp {
  private currentScreen: 'select' | 'game' | 'results' = 'select';
  private selectedSong: Song = SONGS[0];
  private currentDifficulty: Difficulty;
  private gameEngine: GameEngine | null = null;
  private settings: Settings = loadSettings();
  private menuView: MenuView = 'songs';
  private calibrationTimers: number[] = [];

  private appContainer: HTMLElement;

  constructor() {
    const el = document.getElementById('app');
    if (!el) throw new Error('App root element not found');
    this.appContainer = el;

    this.currentDifficulty = this.settings.difficulty;
    soundEngine.setMuted(this.settings.muted);
    soundEngine.setUserLatency(this.settings.latencyMs);

    // Formatos de pincelada usados por menu, HUD e resultados
    document.documentElement.style.setProperty('--brush-bar', svgUrl(BRUSH_BAR_SVG));
    document.documentElement.style.setProperty('--brush-panel', svgUrl(BRUSH_PANEL_SVG));
    this.renderSongSelect();
    this.setupGlobalShortcuts();

    // Pré-carrega os stems em background para início rápido
    if (this.selectedSong.stems) {
      soundEngine.loadStems(this.selectedSong.stems);
    }
  }

  private clearCalibrationTimers() {
    for (const id of this.calibrationTimers) {
      window.clearTimeout(id);
    }
    this.calibrationTimers = [];
  }

  private renderSongSelect() {
    this.clearCalibrationTimers();
    document.getElementById('pause-modal-overlay')?.remove();
    this.currentScreen = 'select';
    this.appContainer.dataset.screen = 'select';
    let mainContent = document.getElementById('main-content');
    if (!mainContent) {
      mainContent = document.createElement('div');
      mainContent.id = 'main-content';
      mainContent.className = 'screen';
      this.appContainer.appendChild(mainContent);
    }

    const best = bestScore();
    const name = escapeHtml(this.settings.playerName);

    mainContent.innerHTML = `
      <div class="start-screen">
        <div class="start-bg" aria-hidden="true"></div>

        <div class="start-left">
          <div class="logo-brush">
            <span class="logo-crown">👑</span>
            <div class="logo-word logo-word-1">PAGODE</div>
            <div class="logo-word logo-word-2">HERO</div>
          </div>

          <nav class="main-menu" aria-label="Menu principal">
            <button class="menu-item menu-play" id="btn-start-game">${ICONS.play}<span>Jogar</span></button>
            <button class="menu-item" data-view="songs">${ICONS.music}<span>Músicas</span></button>
            <button class="menu-item" data-view="ranking">${ICONS.ranking}<span>Ranking</span></button>
            <button class="menu-item" data-view="settings">${ICONS.settings}<span>Configurações</span></button>
          </nav>
        </div>

        <div class="start-right">
          <div class="player-card brush-panel">
            <div class="player-avatar">🌴</div>
            <div class="player-info">
              <div class="player-name">${name}</div>
              <div class="player-sub">${loadScores().length} partida(s)</div>
            </div>
            <div class="player-best" title="Seu recorde">
              <span>👑</span>
              <strong>${best.toLocaleString('pt-BR')}</strong>
            </div>
          </div>

          <section class="side-panel brush-panel" id="side-panel" aria-live="polite"></section>
        </div>

        <div class="slogan-left">🌴 <span>Sol, samba,<br/>amigos, sempre</span></div>
        <div class="slogan-right">O melhor pagode é aquele<br/>que a gente toca junto! 👑</div>
        <div class="menu-legal-bar">
          <span class="legal-badge-tag">🔞 18+</span>
          <span>Acesso restrito para maiores de 18 anos &bull; <strong>Beba com moderação</strong> &bull; Se beber, não dirija</span>
        </div>
      </div>
    `;

    const menuItems = mainContent.querySelectorAll<HTMLButtonElement>('.menu-item[data-view]');
    menuItems.forEach((item) => {
      item.addEventListener('click', () => {
        this.clearCalibrationTimers();
        this.menuView = item.dataset.view as MenuView;
        this.renderSidePanel();
      });
    });

    const startBtn = mainContent.querySelector('#btn-start-game') as HTMLButtonElement;
    startBtn.addEventListener('click', () => this.launchGame(startBtn));

    this.renderSidePanel();
  }

  private launchGame(button?: HTMLButtonElement) {
    this.clearCalibrationTimers();
    const begin = () => {
      if (button) {
        button.disabled = true;
        const label = button.querySelector('span');
        if (label) label.textContent = 'Carregando...';
      }
      this.startGame();
    };

    if (isAgeVerified()) {
      begin();
      return;
    }

    this.showAgeVerification(begin, () => {
      if (button) {
        button.disabled = false;
        const label = button.querySelector('span');
        if (label) label.textContent = 'Jogar';
      }
    });
  }

  /**
   * Confirmação obrigatória de maioridade (+18) e recado de "Beba com moderação"
   * exibidos antes da primeira partida da sessão.
   */
  private showAgeVerification(onConfirm: () => void, onCancel?: () => void) {
    document.getElementById('age-modal-overlay')?.remove();

    const overlay = document.createElement('div');
    overlay.id = 'age-modal-overlay';
    overlay.className = 'age-modal-overlay';

    // Etapa 1: Confirmação de idade (+18)
    const renderStep1 = () => {
      overlay.innerHTML = `
        <div class="age-modal-card" role="dialog" aria-modal="true" aria-labelledby="age-modal-title">
          <div class="age-modal-badge age-badge-18">🔞 MAIORES DE 18 ANOS</div>
          <h2 id="age-modal-title" class="age-modal-title">Confirmação de Idade</h2>
          <p class="age-modal-desc">
            O <strong>Pagode Hero</strong> tem resenha, samba e chopp gelado! Antes do jogo começar, precisamos confirmar sua idade:
          </p>
          <div class="age-modal-question">
            Você é maior de 18 anos?
          </div>
          <div class="age-modal-actions">
            <button id="btn-age-yes" class="btn-primary age-btn">
              <span>🍺 Sim, sou maior de 18</span>
            </button>
            <button id="btn-age-no" class="btn-secondary age-btn">
              <span>Não, sou menor</span>
            </button>
          </div>
        </div>
      `;

      overlay.querySelector('#btn-age-yes')?.addEventListener('click', () => {
        renderStep2();
      });

      overlay.querySelector('#btn-age-no')?.addEventListener('click', () => {
        renderDenied();
      });
    };

    // Caso o usuário clique em "Não"
    const renderDenied = () => {
      overlay.innerHTML = `
        <div class="age-modal-card age-card-denied" role="dialog" aria-modal="true" aria-labelledby="age-denied-title">
          <div class="age-modal-icon">🚫</div>
          <h2 id="age-denied-title" class="age-modal-title" style="color: #ff6b6b;">Acesso Restrito</h2>
          <p class="age-modal-desc">
            Este jogo contém referências ao consumo de chopp e bebidas alcoólicas. Conforme a legislação brasileira e as diretrizes do CONAR, o acesso é exclusivo para maiores de 18 anos.
          </p>
          <div class="age-modal-actions">
            <button id="btn-age-back" class="btn-secondary age-btn">
              <span>⬅ Voltar ao Menu</span>
            </button>
          </div>
        </div>
      `;

      overlay.querySelector('#btn-age-back')?.addEventListener('click', () => {
        overlay.classList.add('closing');
        setTimeout(() => overlay.remove(), 200);
        onCancel?.();
      });
    };

    // Etapa 2: Recado "Beba com moderação"
    const renderStep2 = () => {
      overlay.innerHTML = `
        <div class="age-modal-card age-card-moderation" role="dialog" aria-modal="true" aria-labelledby="moderation-title">
          <div class="age-modal-icon">🍻</div>
          <div class="age-modal-badge age-badge-moderation">CONSUMO CONSCIENTE</div>
          <h2 id="moderation-title" class="age-modal-title">Beba com Moderação!</h2>
          <div class="age-moderation-box">
            <p class="age-moderation-lead">
              A melhor roda de samba é aquela que a gente curte com responsabilidade e alegria.
            </p>
            <ul class="age-moderation-list">
              <li>
                <span class="mod-icon">🚗</span>
                <span class="mod-text"><strong>Se beber, não dirija.</strong> Pegue carona, táxi ou aplicativo.</span>
              </li>
              <li>
                <span class="mod-icon">🔞</span>
                <span class="mod-text"><strong>Venda e consumo proibidos</strong> para menores de 18 anos.</span>
              </li>
              <li>
                <span class="mod-icon">💧</span>
                <span class="mod-text"><strong>Hidrate-se:</strong> intercale com água e curta o som com a galera!</span>
              </li>
            </ul>
          </div>
          <div class="age-modal-actions">
            <button id="btn-age-start" class="btn-primary age-btn age-btn-glow">
              <span>🎶 Começar o Jogo!</span>
            </button>
          </div>
        </div>
      `;

      overlay.querySelector('#btn-age-start')?.addEventListener('click', () => {
        setAgeVerified();
        overlay.classList.add('closing');
        setTimeout(() => {
          overlay.remove();
          onConfirm();
        }, 200);
      });
    };

    renderStep1();
    document.body.appendChild(overlay);
  }

  /** Painel da direita: muda conforme o item do menu (músicas, ranking ou configurações). */
  private renderSidePanel() {
    const panel = document.getElementById('side-panel');
    if (!panel) return;

    document.querySelectorAll<HTMLButtonElement>('.menu-item[data-view]').forEach((item) => {
      item.classList.toggle('active', item.dataset.view === this.menuView);
    });

    if (this.menuView === 'songs') {
      panel.innerHTML = `
        <h2 class="panel-title">Músicas em destaque</h2>
        <ul class="song-list">
          ${SONGS.map(
            (song) => `
            <li>
              <button class="song-row ${song.id === this.selectedSong.id ? 'selected' : ''}" data-id="${song.id}">
                <span class="song-cover" style="--cover: ${song.color}">${song.coverImage || '🪕'}</span>
                <span class="song-text">
                  <span class="song-title">${song.title}</span>
                  <span class="song-artist">${song.artist}</span>
                </span>
                <span class="song-play" aria-hidden="true">${ICONS.play}</span>
              </button>
            </li>`
          ).join('')}
        </ul>
        <div class="panel-label">Dificuldade</div>
        <div class="difficulty-pills" role="radiogroup" aria-label="Dificuldade">
          ${(Object.keys(DIFFICULTY_LABEL) as Difficulty[])
            .map(
              (d) =>
                `<button class="diff-pill ${d === this.currentDifficulty ? 'active' : ''}" data-diff="${d}" role="radio" aria-checked="${d === this.currentDifficulty}">${DIFFICULTY_LABEL[d]}</button>`
            )
            .join('')}
        </div>
        <div class="key-hint">
          <kbd class="k0">A</kbd><kbd class="k1">S</kbd><kbd class="k2">K</kbd><kbd class="k3">L</kbd>
          <span class="key-hint-sep">🍺</span><kbd>ESPAÇO</kbd>
          <span class="key-hint-sep">⏸</span><kbd>ESC</kbd>
        </div>`;

      panel.querySelectorAll<HTMLButtonElement>('.song-row').forEach((row) => {
        row.addEventListener('click', () => {
          const found = SONGS.find((song) => song.id === row.dataset.id);
          if (!found) return;
          // Clicar na música já selecionada começa a partida
          if (found.id === this.selectedSong.id) {
            this.launchGame(document.getElementById('btn-start-game') as HTMLButtonElement);
            return;
          }
          this.selectedSong = found;
          if (found.stems) {
            soundEngine.loadStems(found.stems);
          }
          this.renderSidePanel();
        });
      });

      panel.querySelectorAll<HTMLButtonElement>('.diff-pill').forEach((pill) => {
        pill.addEventListener('click', () => {
          this.currentDifficulty = pill.dataset.diff as Difficulty;
          this.settings.difficulty = this.currentDifficulty;
          saveSettings(this.settings);
          this.renderSidePanel();
        });
      });
      return;
    }

    if (this.menuView === 'ranking') {
      const scores = loadScores().slice(0, 8);
      const songTitle = (id: string) => SONGS.find((song) => song.id === id)?.title ?? id;
      panel.innerHTML = `
        <h2 class="panel-title">Ranking</h2>
        ${
          scores.length === 0
            ? `<p class="panel-empty">Ninguém tocou ainda.<br/>Bora abrir a roda! 🎶</p>`
            : `<ol class="ranking-list">
                ${scores
                  .map(
                    (entry, i) => `
                  <li class="ranking-row">
                    <span class="ranking-pos">${i === 0 ? '👑' : i + 1}</span>
                    <span class="ranking-info">
                      <span class="ranking-name">${escapeHtml(entry.playerName)}</span>
                      <span class="ranking-meta">${DIFFICULTY_LABEL[entry.difficulty]} • ${entry.accuracy}% • ${songTitle(entry.songId)}</span>
                    </span>
                    <span class="ranking-points">${entry.points.toLocaleString('pt-BR')}</span>
                  </li>`
                  )
                  .join('')}
              </ol>`
        }`;
      return;
    }

    // Configurações
    panel.innerHTML = `
      <h2 class="panel-title">Configurações</h2>
      <label class="setting-row">
        <span>Seu nome</span>
        <input id="set-name" type="text" maxlength="16" value="${escapeHtml(this.settings.playerName)}" />
      </label>
      <label class="setting-row">
        <span>Som</span>
        <input id="set-sound" type="checkbox" class="switch" ${this.settings.muted ? '' : 'checked'} />
      </label>
      <label class="setting-row">
        <span>Clipe no fundo da pista</span>
        <input id="set-video" type="checkbox" class="switch" ${this.settings.showVideo ? 'checked' : ''} />
      </label>
      <label class="setting-row setting-column">
        <span>Atraso do som: <strong id="set-latency-value">${this.settings.latencyMs} ms</strong></span>
        <input id="set-latency" type="range" min="-100" max="300" step="10" value="${this.settings.latencyMs}" />
        <small>Notas chegando antes do som? Aumente. Fone Bluetooth costuma pedir 150–250 ms.</small>
        <div class="latency-tester">
          <button type="button" id="btn-test-latency" class="btn-secondary latency-test-btn">
            🥁 Testar Batida (4x)
          </button>
          <span id="latency-beat-dot" class="latency-beat-dot" title="Pisca junto com o som calibrado"></span>
        </div>
      </label>`;

    const nameInput = panel.querySelector('#set-name') as HTMLInputElement;
    nameInput.addEventListener('change', () => {
      this.settings.playerName = nameInput.value.trim() || 'Pagodeiro';
      saveSettings(this.settings);
      const cardName = document.querySelector('.player-name');
      if (cardName) cardName.textContent = this.settings.playerName;
    });

    const soundInput = panel.querySelector('#set-sound') as HTMLInputElement;
    soundInput.addEventListener('change', () => {
      this.settings.muted = !soundInput.checked;
      soundEngine.setMuted(this.settings.muted);
      saveSettings(this.settings);
    });

    const videoInput = panel.querySelector('#set-video') as HTMLInputElement;
    videoInput.addEventListener('change', () => {
      this.settings.showVideo = videoInput.checked;
      saveSettings(this.settings);
    });

    const latencyInput = panel.querySelector('#set-latency') as HTMLInputElement;
    const latencyValue = panel.querySelector('#set-latency-value') as HTMLElement;
    latencyInput.addEventListener('input', () => {
      this.settings.latencyMs = Number(latencyInput.value);
      latencyValue.textContent = `${this.settings.latencyMs} ms`;
      soundEngine.setUserLatency(this.settings.latencyMs);
      saveSettings(this.settings);
    });

    const testBtn = panel.querySelector('#btn-test-latency') as HTMLButtonElement;
    const beatDot = panel.querySelector('#latency-beat-dot') as HTMLElement;
    testBtn.addEventListener('click', () => {
      this.clearCalibrationTimers();
      const beatIntervalMs = Math.round((60 / (this.selectedSong.bpm || 88)) * 1000);
      for (let i = 0; i < 4; i++) {
        const audioTimer = window.setTimeout(() => {
          soundEngine.playCalibrationClick(i === 0);
          const visualDelay = Math.max(0, soundEngine.getTotalLatencyMs());
          const visualTimer = window.setTimeout(() => {
            beatDot.classList.add('pulse');
            window.setTimeout(() => beatDot.classList.remove('pulse'), 140);
          }, visualDelay);
          this.calibrationTimers.push(visualTimer);
        }, i * beatIntervalMs);
        this.calibrationTimers.push(audioTimer);
      }
    });
  }

  private togglePause(forcePause?: boolean) {
    if (this.currentScreen !== 'game' || !this.gameEngine || !this.gameEngine.isGameRunning()) return;

    const shouldPause = forcePause ?? !this.gameEngine.getPaused();
    const existingModal = document.getElementById('pause-modal-overlay');

    if (shouldPause) {
      this.gameEngine.pause();
      if (existingModal) return;

      const overlay = document.createElement('div');
      overlay.id = 'pause-modal-overlay';
      overlay.className = 'age-modal-overlay';
      overlay.innerHTML = `
        <div class="age-modal-card" role="dialog" aria-modal="true" aria-labelledby="pause-modal-title">
          <div class="age-modal-icon">⏸️</div>
          <h2 id="pause-modal-title" class="age-modal-title">Roda Pausada</h2>
          <p class="age-modal-desc">
            Respira, hidrata e prepara a palheta para voltar no compasso de <strong>${escapeHtml(this.selectedSong.title)}</strong>!
          </p>
          <div class="age-modal-actions" style="flex-direction: column; align-items: stretch;">
            <button id="btn-pause-resume" class="btn-primary age-btn age-btn-glow">
              <span>▶️ Continuar a Roda</span>
            </button>
            <button id="btn-pause-restart" class="btn-secondary age-btn" style="justify-content: center;">
              <span>🔁 Reiniciar Música</span>
            </button>
            <button id="btn-pause-quit" class="btn-secondary age-btn" style="justify-content: center;">
              <span>⬅ Sair para o Menu</span>
            </button>
          </div>
        </div>
      `;

      overlay.querySelector('#btn-pause-resume')?.addEventListener('click', () => {
        this.togglePause(false);
      });

      overlay.querySelector('#btn-pause-restart')?.addEventListener('click', () => {
        overlay.remove();
        this.gameEngine?.stop();
        this.startGame();
      });

      overlay.querySelector('#btn-pause-quit')?.addEventListener('click', () => {
        overlay.remove();
        this.gameEngine?.stop();
        this.renderSongSelect();
      });

      document.body.appendChild(overlay);
    } else {
      existingModal?.remove();
      this.gameEngine.resume();
    }
  }

  private async startGame() {
    document.getElementById('pause-modal-overlay')?.remove();
    this.currentScreen = 'game';
    this.appContainer.dataset.screen = 'game';
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    mainContent.innerHTML = `
      <div class="gameplay-screen">
        <div class="game-backdrop game-photo" aria-hidden="true"></div>
        ${this.selectedSong.videoUrl && this.settings.showVideo ? `
        <div class="bg-video-layer" aria-hidden="true">
          <video id="bg-video" class="bg-video" src="${this.selectedSong.videoUrl}" muted playsinline preload="auto"></video>
          <div class="bg-video-dim"></div>
        </div>` : ''}
        <div class="game-frame">${renderKiosqueFrame(false)}</div>

        <div class="gameplay-hud">
          <div class="hud-left brush-panel">
            <button id="btn-quit-game" class="hud-quit" title="Sair da roda">⬅</button>
            <button id="btn-pause-game" class="hud-quit" title="Pausar (Esc / P)">⏸</button>
            <div class="hud-song">
              <div class="hud-song-title">${this.selectedSong.title}</div>
              <div class="hud-song-meta">
                <span>${this.selectedSong.artist} • ${DIFFICULTY_LABEL[this.currentDifficulty]}</span>
                <span class="hud-time" id="hud-time">0:00 / ${formatTime(this.selectedSong.duration)}</span>
              </div>
              <div class="hud-progress-track" aria-hidden="true">
                <div class="hud-progress-fill" id="hud-progress-fill"></div>
              </div>
            </div>
          </div>

          <div class="hud-center">
            <div class="mini-logo">Pagode <span>Hero</span></div>
            <div class="hud-stem-box" id="hud-stem-status">
              ${MUTE_STAGES.map((stage) => `<span class="stem-badge active">${stage.label}</span>`).join('')}
            </div>
          </div>

          <div class="hud-right brush-panel">
            <div class="hud-stat-box">
              <span class="hud-stat-label">Pontos</span>
              <span class="hud-stat-value" id="hud-score">0</span>
            </div>
            <div class="hud-stat-box">
              <span class="hud-stat-label">Combo</span>
              <span class="hud-stat-value" id="hud-streak">0</span>
            </div>
            <div class="hud-stat-box">
              <span class="hud-stat-label">Mult.</span>
              <div class="multiplier-badge" id="hud-multiplier">1x</div>
            </div>
          </div>
        </div>

        <div class="canvas-wrapper">
          <canvas id="game-canvas"></canvas>

          <!-- Barra de Resenha (Choppômetro) -->
          <div class="resenha-meter-container">
            <div class="garcom" aria-hidden="true">🤵</div>
            <svg class="chopp-glass" id="chopp-glass" viewBox="0 0 80 200" role="img" aria-label="Copo de chopp: cada acerto é um gole">
              <title>Cada acerto é um gole. Esvaziou? Chama o garçom!</title>
              <defs>
                <clipPath id="chopp-interior">
                  <path d="M10,14 C10,70 20,125 25,172 L55,172 C60,125 70,70 70,14 Z" />
                </clipPath>
                <linearGradient id="chopp-beer" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0" stop-color="#f2a93b" />
                  <stop offset="0.45" stop-color="#ffd166" />
                  <stop offset="1" stop-color="#e8912c" />
                </linearGradient>
              </defs>

              <!-- vidro -->
              <path d="M10,14 C10,70 20,125 25,172 L55,172 C60,125 70,70 70,14 Z" class="chopp-glass-body" />

              <g clip-path="url(#chopp-interior)">
                <g id="chopp-level" class="chopp-level" style="transform: translateY(${choppOffset(100)}px)">
                  <rect x="0" y="14" width="80" height="190" fill="url(#chopp-beer)" />
                  <g class="chopp-bubbles">
                    <circle cx="30" cy="160" r="1.6" style="animation-delay: 0s" />
                    <circle cx="42" cy="165" r="1.2" style="animation-delay: 0.7s" />
                    <circle cx="50" cy="158" r="1.8" style="animation-delay: 1.3s" />
                    <circle cx="36" cy="168" r="1.1" style="animation-delay: 1.9s" />
                    <circle cx="46" cy="162" r="1.4" style="animation-delay: 2.5s" />
                  </g>
                  <!-- colarinho -->
                  <rect x="0" y="8" width="80" height="14" fill="#fffaf0" />
                  <circle cx="14" cy="9" r="6" fill="#fffaf0" />
                  <circle cx="26" cy="7" r="7" fill="#fffaf0" />
                  <circle cx="40" cy="8" r="6.5" fill="#fffaf0" />
                  <circle cx="54" cy="6.5" r="7" fill="#fffaf0" />
                  <circle cx="66" cy="9" r="6" fill="#fffaf0" />
                </g>
              </g>

              <!-- jato de chopp quando o garçom enche o copo -->
              <rect x="37" y="-40" width="6" height="212" rx="3" fill="url(#chopp-beer)" class="chopp-stream" />

              <!-- reflexo, borda e fundo grosso do copo -->
              <path d="M16,22 C16,70 23,118 28,160" class="chopp-shine" />
              <path d="M10,14 C10,70 20,125 25,172 L55,172 C60,125 70,70 70,14" class="chopp-glass-outline" />
              <rect x="22" y="172" width="36" height="14" rx="4" class="chopp-glass-base" />
            </svg>
            <button id="btn-activate-garcom" class="btn-chama-garcom" style="display: none;">
              🍺 CHAMA O GARÇOM! (4x)
            </button>
          </div>
        </div>

        <!-- Status de Carregamento / Instrumentos -->
        <div class="lyrics-bar-wrap" id="status-bar-wrap">
          <div class="lyrics-bar" id="lyrics-bar">⏳ Carregando os instrumentos...</div>
        </div>

        <!-- Controles Touch/Clique na tela -->
        <div class="touch-controls">
          <button class="touch-btn touch-btn-0" data-track="0">A (Ré)</button>
          <button class="touch-btn touch-btn-1" data-track="1">S (Sol)</button>
          <button class="touch-btn touch-btn-2" data-track="2">K (Si)</button>
          <button class="touch-btn touch-btn-3" data-track="3">L (Ré)</button>
        </div>
      </div>
    `;

    mainContent
      .querySelectorAll<SVGSVGElement>('.game-backdrop .kiosque-scene, .game-frame .kiosque-scene')
      .forEach((svg) => svg.pauseAnimations());

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const hudScore = document.getElementById('hud-score')!;
    const hudStreak = document.getElementById('hud-streak')!;
    const hudMultiplier = document.getElementById('hud-multiplier')!;
    const hudTime = document.getElementById('hud-time')!;
    const hudProgressFill = document.getElementById('hud-progress-fill')!;
    const choppGlass = document.getElementById('chopp-glass')!;
    const choppLevel = document.getElementById('chopp-level')!;
    const btnGarcom = document.getElementById('btn-activate-garcom') as HTMLButtonElement;
    const meterBox = document.querySelector('.resenha-meter-container') as HTMLElement;
    let garcomWasHere = false;
    const statusWrap = document.getElementById('status-bar-wrap')!;
    const lyricsBar = document.getElementById('lyrics-bar')!;
    const stemBadges = Array.from(document.querySelectorAll<HTMLElement>('#hud-stem-status .stem-badge'));

    let lastDisplayedSecond = -1;

    // Instancia Engine
    const bgVideo = document.getElementById('bg-video') as HTMLVideoElement | null;
    // O clipe entra suavemente por cima da foto do menu quando começa a tocar
    bgVideo?.addEventListener('playing', () => bgVideo.classList.add('is-playing'), { once: true });

    this.gameEngine = new GameEngine({
      canvas,
      backgroundVideo: bgVideo ?? undefined,
      song: this.selectedSong,
      difficulty: this.currentDifficulty,
      onLoadingProgress: (msg: string) => {
        statusWrap.style.display = 'flex';
        lyricsBar.textContent = `⏳ ${msg}`;
      },
      onTimeUpdate: (currentTime: number, duration: number) => {
        const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
        hudProgressFill.style.width = `${pct.toFixed(1)}%`;
        const sec = Math.floor(currentTime);
        if (sec !== lastDisplayedSecond) {
          lastDisplayedSecond = sec;
          hudTime.textContent = `${formatTime(sec)} / ${formatTime(duration)}`;
        }
      },
      onMuteLevelChange: (level: number) => {
        stemBadges.forEach((badge, i) => {
          badge.className = `stem-badge ${i < level ? 'muted' : 'active'}`;
        });
      },
      onScoreUpdate: (score: GameScore) => {
        hudScore.textContent = score.points.toLocaleString('pt-BR');
        hudStreak.textContent = `${score.streak} ${score.streak >= 20 ? '🔥' : ''}`;
        hudMultiplier.textContent = `${score.multiplier}x`;

        if (score.isChamaGarcom) {
          hudMultiplier.classList.add('overdrive');
        } else {
          hudMultiplier.classList.remove('overdrive');
        }

        // Garçom chegou: aparece ao lado do copo e enche com um jato de chopp
        if (score.isChamaGarcom && !garcomWasHere) {
          choppGlass.classList.add('refilling');
          setTimeout(() => choppGlass.classList.remove('refilling'), 1500);
        }
        garcomWasHere = score.isChamaGarcom;
        meterBox.classList.toggle('garcom-here', score.isChamaGarcom);

        // O nível do chopp baixa a cada gole; o colarinho acompanha
        choppLevel.style.transform = `translateY(${choppOffset(score.resenhaMeter)}px)`;
        const empty = score.resenhaMeter <= 0 && !score.isChamaGarcom;
        choppGlass.classList.toggle('ready', empty);
        btnGarcom.style.display = empty ? 'block' : 'none';
      },
      onSongEnd: (finalScore: GameScore) => {
        this.renderResults(finalScore);
      },
    });

    await this.gameEngine.start();
    statusWrap.style.display = 'none';

    // Evento Chama o Garçom no botão
    btnGarcom.addEventListener('click', () => {
      this.gameEngine?.activateChamaGarcom();
    });

    // Eventos Touch/Clique na base
    const touchButtons = mainContent.querySelectorAll('.touch-btn');
    touchButtons.forEach((btn) => {
      const track = parseInt(btn.getAttribute('data-track') || '0', 10);
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.gameEngine?.handleKeyDown(track);
      });
      btn.addEventListener('pointerup', () => {
        this.gameEngine?.handleKeyUp(track);
      });
      btn.addEventListener('pointerleave', () => {
        this.gameEngine?.handleKeyUp(track);
      });
    });

    const pauseBtn = document.getElementById('btn-pause-game')!;
    pauseBtn.addEventListener('click', () => {
      this.togglePause();
    });

    const quitBtn = document.getElementById('btn-quit-game')!;
    quitBtn.addEventListener('click', () => {
      document.getElementById('pause-modal-overlay')?.remove();
      this.gameEngine?.stop();
      this.renderSongSelect();
    });
  }

  private renderResults(score: GameScore) {
    document.getElementById('pause-modal-overlay')?.remove();
    this.currentScreen = 'results';
    this.appContainer.dataset.screen = 'results';
    const mainContent = document.getElementById('main-content');
    if (!mainContent) return;

    const totalHits = score.hitCount.perfeito + score.hitCount.bom + score.hitCount.quase;
    const accuracy = score.totalNotes > 0 ? Math.round((totalHits / score.totalNotes) * 100) : 0;

    const { isRecord } = addScore({
      playerName: this.settings.playerName,
      songId: this.selectedSong.id,
      difficulty: this.currentDifficulty,
      points: score.points,
      accuracy,
      maxStreak: score.maxStreak,
      date: new Date().toISOString(),
    });

    let title = 'Fez Bonito na Laje! 🍻';
    let message = 'Mandou bem no compasso da roda!';
    if (accuracy >= 90) {
      title = 'Mestre do Cavaco do Menos é Mais! 👑';
      message = 'Você tem palhetada de ouro! Pode subir no palco com o grupo!';
    } else if (accuracy >= 70) {
      title = 'Cavaquista de Respeito! 🪕';
      message = 'A rapaziada da roda de samba aplaudiu de pé!';
    } else if (accuracy < 50) {
      title = 'A Cerveja Esquentou... 😅';
      message = 'Treine mais a cadência e tente de novo!';
    }

    mainContent.innerHTML = `
      <div class="results-wrap">
        <div class="game-backdrop">${renderKiosqueBackground()}</div>
        <div class="game-frame">${renderKiosqueFrame(true)}</div>
        <div class="results-screen brush-panel">
          <div style="font-size: 3rem; margin-bottom: 12px;">🎉</div>
          <h1 style="font-size: 2rem; font-weight: 900; color: #ffd166; margin-bottom: 6px;">
            ${title}
          </h1>
          <p style="color: #d6ecea; margin-bottom: 24px;">
            ${message} &bull; Música: <strong>${this.selectedSong.title}</strong>
          </p>
          ${isRecord && score.points > 0 ? '<div class="new-record">🏆 NOVO RECORDE!</div>' : ''}

          <div class="results-stats-grid">
            <div class="result-card">
              <div style="font-size: 0.75rem; color: #9fc7cc; font-weight: 700;">PONTUAÇÃO FINAL</div>
              <div style="font-size: 2rem; font-weight: 900; color: #ffd166;">${score.points.toLocaleString('pt-BR')}</div>
            </div>

            <div class="result-card">
              <div style="font-size: 0.75rem; color: #9fc7cc; font-weight: 700;">PRECISÃO</div>
              <div style="font-size: 2rem; font-weight: 900; color: #06d6a0;">${accuracy}%</div>
            </div>

            <div class="result-card">
              <div style="font-size: 0.75rem; color: #9fc7cc; font-weight: 700;">MAIOR COMBO</div>
              <div style="font-size: 2rem; font-weight: 900; color: #4cc9f0;">${score.maxStreak} 🔥</div>
            </div>

            <div class="result-card">
              <div style="font-size: 0.75rem; color: #9fc7cc; font-weight: 700;">DETALHES DOS GOLPES</div>
              <div style="font-size: 0.85rem; color: #e6f4f1; margin-top: 4px;">
                🎯 Na Medida: <strong>${score.hitCount.perfeito}</strong><br/>
                👏 No Compasso: <strong>${score.hitCount.bom}</strong><br/>
                😅 Quase: <strong>${score.hitCount.quase}</strong><br/>
                ❌ Mico: <strong>${score.hitCount.mico}</strong>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 14px; justify-content: center;">
            <button id="btn-replay" class="btn-primary">
              🔁 Tocar Novamente
            </button>
            <button id="btn-back-menu" class="btn-secondary">
              📜 Escolher Outro Pagode
            </button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btn-replay')!.addEventListener('click', () => {
      this.launchGame();
    });

    document.getElementById('btn-back-menu')!.addEventListener('click', () => {
      this.renderSongSelect();
    });
  }

  private setupGlobalShortcuts() {
    window.addEventListener('keydown', (e) => {
      if (this.currentScreen !== 'game' || !this.gameEngine) return;
      // Segurar a tecla não conta como várias palhetadas
      if (e.repeat) return;

      const key = e.key.toLowerCase();

      if (e.key === 'Escape' || key === 'p') {
        e.preventDefault();
        this.togglePause();
        return;
      }

      if (this.gameEngine.getPaused()) return;

      // Mapeamento exclusivo e claro das Teclas: A, S, K, L
      if (key === 'a' || key === '1') {
        e.preventDefault();
        this.gameEngine.handleKeyDown(0);
      } else if (key === 's' || key === '2') {
        e.preventDefault();
        this.gameEngine.handleKeyDown(1);
      } else if (key === 'k' || key === '3') {
        e.preventDefault();
        this.gameEngine.handleKeyDown(2);
      } else if (key === 'l' || key === '4') {
        e.preventDefault();
        this.gameEngine.handleKeyDown(3);
      } else if (e.code === 'Space') {
        e.preventDefault();
        this.gameEngine.activateChamaGarcom();
      }
    });

    window.addEventListener('keyup', (e) => {
      if (this.currentScreen !== 'game' || !this.gameEngine) return;

      const key = e.key.toLowerCase();
      if (key === 'a' || key === '1') {
        this.gameEngine.handleKeyUp(0);
      } else if (key === 's' || key === '2') {
        this.gameEngine.handleKeyUp(1);
      } else if (key === 'k' || key === '3') {
        this.gameEngine.handleKeyUp(2);
      } else if (key === 'l' || key === '4') {
        this.gameEngine.handleKeyUp(3);
      }
    });

    // Pausa automaticamente se o jogador trocar de aba ou minimizar a janela
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.currentScreen === 'game' && this.gameEngine?.isGameRunning()) {
        this.togglePause(true);
      }
    });
  }
}

// Inicializa o jogo ao carregar
window.addEventListener('DOMContentLoaded', () => {
  new PagodeHeroApp();
});
