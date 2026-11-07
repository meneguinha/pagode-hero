export type Difficulty = 'facil' | 'medio' | 'mestre';

export interface Note {
  id: string;
  time: number; // tempo em segundos no áudio
  track: number; // 0 (A), 1 (S), 2 (K), 3 (L)
  pitch?: number; // frequência melódica real da nota cantada/tocada
  syllable?: string; // sílaba da letra cantada nesta nota (ex: "Me-", "lhor", "eu", "ir")
  duration?: number; // sustentação opcional
  isStarPower?: boolean; // nota dourada que enche a barra de resenha
  hit?: boolean;
  missed?: boolean;
}

export interface SongLyric {
  time: number;
  text: string;
}

export interface HarmonyChord {
  name: string;
  freqs: number[];
  bassFreq: number;
}

export interface SongStems {
  drums: string;     // Bateria / Pandeiro (ex: ytdown_bs6stem_mt_0_drums.mp3)
  guitar: string;    // Cavaquinho (ex: ytdown_bs6stem_mt_0_guitar.mp3)
  vocals?: string;   // Vocal / Voz
  bass?: string;     // Baixo
  piano?: string;    // Harmonia (violão / banjo) — nome dado pelo separador de stems
  other?: string;    // Outros instrumentos
}

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  coverImage?: string;
  bpm: number;
  difficultyLabel: string;
  duration: number; // em segundos
  audioUrl?: string; // se houver áudio externo
  stems?: SongStems; // stems isolados para controle dinâmico dos instrumentos
  videoUrl?: string; // clipe exibido (sem som) no fundo da pista
  videoOffset?: number; // segundos a somar ao tempo da música para achar o quadro do clipe
  lyrics: SongLyric[];
  notes: Note[];
  color: string;
  description: string;
  harmonyChords?: HarmonyChord[];
}

export type HitRating = 'PERFEITO' | 'NO COMPASSO' | 'QUASE' | 'MICO';

export interface HitFeedback {
  id: string;
  rating: HitRating;
  track: number;
  text: string;
  color: string;
  createdAt: number;
}

export interface GameScore {
  points: number;
  streak: number;
  maxStreak: number;
  multiplier: number;
  resenhaMeter: number; // 0 a 100
  isChamaGarcom: boolean; // Overdrive ativo
  chamaGarcomTimeLeft: number;
  totalNotes: number;
  hitCount: {
    perfeito: number;
    bom: number;
    quase: number;
    mico: number;
  };
}

export interface KeyMap {
  track0: string[];
  track1: string[];
  track2: string[];
  track3: string[];
  activateOverdrive: string[];
}
