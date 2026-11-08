// Recordes e preferências guardados no navegador (localStorage).
// Toda leitura/escrita é protegida: em aba anônima ou com o armazenamento bloqueado,
// o jogo continua funcionando com os valores padrão.

import type { Difficulty } from './types';

export interface Settings {
  playerName: string;
  muted: boolean;
  latencyMs: number; // atraso extra do som (ex.: fone Bluetooth)
  showVideo: boolean;
  difficulty: Difficulty;
}

export interface ScoreEntry {
  playerName: string;
  songId: string;
  difficulty: Difficulty;
  points: number;
  accuracy: number;
  maxStreak: number;
  date: string; // ISO
}

const SETTINGS_KEY = 'pagodeHero.settings';
const SCORES_KEY = 'pagodeHero.scores';
const AGE_VERIFIED_KEY = 'pagodeHero.ageVerified';
const MAX_SCORES = 30;

let ageVerifiedInMemory = false;

export function isAgeVerified(): boolean {
  if (ageVerifiedInMemory) return true;
  try {
    return sessionStorage.getItem(AGE_VERIFIED_KEY) === '1';
  } catch {
    return false;
  }
}

export function setAgeVerified(): void {
  ageVerifiedInMemory = true;
  try {
    sessionStorage.setItem(AGE_VERIFIED_KEY, '1');
  } catch {
    // sem sessionStorage: mantém em memória na sessão atual
  }
}

const DEFAULT_SETTINGS: Settings = {
  playerName: 'Pagodeiro',
  muted: false,
  latencyMs: 0,
  showVideo: true,
  difficulty: 'facil',
};

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sem armazenamento: só não salva
  }
}

export function loadSettings(): Settings {
  return { ...DEFAULT_SETTINGS, ...read<Partial<Settings>>(SETTINGS_KEY, {}) };
}

export function saveSettings(settings: Settings) {
  write(SETTINGS_KEY, settings);
}

export function loadScores(): ScoreEntry[] {
  const scores = read<ScoreEntry[]>(SCORES_KEY, []);
  return Array.isArray(scores) ? scores : [];
}

/** Salva a partida e diz se ela é o novo recorde daquela música + dificuldade. */
export function addScore(entry: ScoreEntry): { isRecord: boolean } {
  const scores = loadScores();
  const previousBest = scores
    .filter((s) => s.songId === entry.songId && s.difficulty === entry.difficulty)
    .reduce((best, s) => Math.max(best, s.points), 0);
  scores.push(entry);
  scores.sort((a, b) => b.points - a.points);
  write(SCORES_KEY, scores.slice(0, MAX_SCORES));
  return { isRecord: entry.points > previousBest };
}

export function bestScore(): number {
  return loadScores().reduce((best, s) => Math.max(best, s.points), 0);
}
