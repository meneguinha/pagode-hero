import type { Song, Note, HarmonyChord } from '../types';

const N = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  Fs4: 369.99,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  B4: 493.88,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
};

/**
 * Criação da Melodia e Notas de "Melhor Eu Ir / Ligando os Fatos" (Churrasquinho Menos é Mais)
 * Calibrado EXATAMENTE no áudio oficial do YouTube (início em 4.8s, voz em 10.2s)
 */
function createMelhorEuIrNotes(): Note[] {
  const notes: Note[] = [];
  let id = 1;

  const add = (time: number, track: number, pitch: number, syllable: string, isStarPower = false) => {
    notes.push({
      id: `mei_${id++}`,
      time: parseFloat(time.toFixed(3)),
      track,
      pitch,
      syllable,
      isStarPower,
    });
  };

  // --- INTRODUÇÃO DE CAVAQUINHO DO CHURRASQUINHO (4.8s a 9.8s) ---
  add(4.8, 0, N.D4, '🪕');
  add(5.4, 1, N.G4, '🪕');
  add(6.2, 2, N.B4, '🪕');
  add(6.8, 3, N.D5, '⭐', true);
  add(7.4, 3, N.C5, '🪕');
  add(8.1, 2, N.B4, '🪕');
  add(8.8, 2, N.A4, '🪕');
  add(9.5, 1, N.G4, '🪕');

  // --- PARTE 1: "Melhor eu ir... tudo bem..." (10.2s a 22.0s) ---
  // "Me-lhor eu ir..."
  add(10.2, 2, N.B4, 'Me-');
  add(11.0, 2, N.A4, 'lhor');
  add(11.8, 1, N.G4, 'eu');
  add(12.4, 1, N.G4, 'ir...');

  // "Tu-do bem..."
  add(13.8, 2, N.B4, 'Tu-');
  add(14.3, 3, N.C5, 'do');
  add(15.3, 3, N.D5, 'bem...', true);

  // "O pas-sa-do não mu-da por na-da..."
  add(17.0, 3, N.D5, 'O');
  add(17.6, 3, N.E5, 'pas-');
  add(18.2, 3, N.D5, 'sa-');
  add(18.8, 3, N.C5, 'do');
  add(19.4, 2, N.B4, 'não');
  add(20.0, 2, N.A4, 'mu-');
  add(20.6, 1, N.G4, 'da');
  add(21.2, 2, N.A4, 'por');
  add(21.8, 1, N.G4, 'na-da');

  // --- PARTE 2: "Melhor eu ir... se acabou..." (23.5s a 35.0s) ---
  add(23.5, 2, N.B4, 'Me-');
  add(24.2, 2, N.A4, 'lhor');
  add(25.0, 1, N.G4, 'eu');
  add(25.8, 1, N.G4, 'ir...');

  add(27.2, 2, N.B4, 'Se a-');
  add(28.0, 3, N.C5, 'ca-');
  add(29.0, 3, N.D5, 'bou...', true);

  // "Não tem jeito, acabou a estrada..."
  add(30.5, 3, N.D5, 'Não');
  add(31.2, 3, N.E5, 'tem');
  add(31.9, 3, N.D5, 'jei-');
  add(32.6, 3, N.C5, 'to,');
  add(33.3, 2, N.B4, 'a-');
  add(34.0, 2, N.A4, 'ca-');
  add(34.7, 1, N.G4, 'bou');
  add(35.4, 2, N.A4, 'a es-');
  add(36.1, 1, N.G4, 'tra-da');

  // --- REFRÃO: "E ligando os fatos eu cheguei à conclusão..." (37.0s a 52.0s) ---
  add(37.0, 1, N.G4, 'E li-');
  add(37.8, 1, N.G4, 'gan-');
  add(38.6, 2, N.A4, 'do os');
  add(39.4, 2, N.B4, 'fa-');
  add(40.2, 3, N.C5, 'tos,', true);

  add(41.4, 3, N.C5, 'eu');
  add(42.0, 2, N.B4, 'che-');
  add(42.7, 2, N.A4, 'guei');
  add(43.4, 1, N.G4, 'à con-');
  add(44.1, 1, N.Fs4, 'clu-');
  add(45.0, 1, N.G4, 'são...');

  // "Que você brincou com o meu coração..."
  add(46.5, 1, N.G4, 'Que');
  add(47.2, 2, N.A4, 'vo-');
  add(47.9, 2, N.B4, 'cê');
  add(48.6, 2, N.B4, 'brin-');
  add(49.3, 2, N.A4, 'cou');
  add(50.0, 1, N.G4, 'com o');
  add(50.7, 0, N.E4, 'meu');
  add(51.4, 1, N.G4, 'co-ra-');
  add(52.2, 2, N.A4, 'ção! 💔', true);

  // --- SEGUNDO CICLO DA RESENHA (54.0s a 76.0s) ---
  add(54.0, 1, N.G4, '🍢');
  add(55.0, 2, N.B4, 'Me-');
  add(55.8, 2, N.A4, 'lhor');
  add(56.6, 1, N.G4, 'eu');
  add(57.4, 1, N.G4, 'ir...');

  add(59.0, 3, N.D5, 'Não', true);
  add(59.8, 3, N.C5, 'tem');
  add(60.6, 2, N.B4, 'jei-');
  add(61.4, 1, N.G4, 'to...');

  add(63.0, 1, N.G4, 'E li-');
  add(63.8, 2, N.A4, 'gan-');
  add(64.6, 2, N.B4, 'do os');
  add(65.4, 3, N.C5, 'fa-tos! 🍻', true);

  add(67.0, 3, N.C5, 'Eu');
  add(67.8, 2, N.B4, 'che-');
  add(68.6, 2, N.A4, 'guei');
  add(69.4, 1, N.G4, 'à con-');
  add(70.2, 1, N.G4, 'clu-são!');

  add(72.0, 2, N.B4, 'Que');
  add(72.8, 2, N.B4, 'vo-cê');
  add(73.6, 2, N.A4, 'brin-');
  add(74.4, 1, N.G4, 'cou...');
  add(75.5, 0, N.D4, 'com o meu');
  add(76.5, 1, N.G4, 'co-ra-ção! 🪕');

  return notes;
}

const acordesMelhorEuIr: HarmonyChord[] = [
  { name: 'G7M', freqs: [N.G4, N.B4, N.D5, N.Fs4], bassFreq: 49.0 },
  { name: 'Em7', freqs: [N.E4, N.G4, N.B4, N.D5], bassFreq: 41.2 },
  { name: 'Am7', freqs: [N.A4, N.C5, N.E5, N.G4], bassFreq: 55.0 },
  { name: 'D7(9)', freqs: [N.Fs4, N.A4, N.C5, N.E5], bassFreq: 36.7 },
];

export const SONGS: Song[] = [
  {
    id: 'churrasquinho-melhor-eu-ir',
    title: 'Melhor Eu Ir / Ligando os Fatos',
    artist: 'Menos é Mais (Churrasquinho)',
    album: 'Churrasquinho Menos é Mais (Áudio Oficial)',
    coverImage: '🍢',
    bpm: 88,
    difficultyLabel: 'Cadenciado • Roda de Samba',
    duration: 198,
    audioUrl: `${import.meta.env.BASE_URL}audio/melhor_eu_ir.mp3`,
    stems: {
      drums: `${import.meta.env.BASE_URL}audio/ytdown_bs6stem_mt_0_drums.mp3`,
      guitar: `${import.meta.env.BASE_URL}audio/ytdown_bs6stem_mt_0_guitar.mp3`,
      vocals: `${import.meta.env.BASE_URL}audio/ytdown_bs6stem_mt_0_vocals.mp3`,
      bass: `${import.meta.env.BASE_URL}audio/ytdown_bs6stem_mt_0_bass.mp3`,
      piano: `${import.meta.env.BASE_URL}audio/ytdown_bs6stem_mt_0_piano.mp3`,
      other: `${import.meta.env.BASE_URL}audio/ytdown_bs6stem_mt_0_other.mp3`,
    },
    // Mesmo áudio dos stems (197,9s, sem defasagem medida), então o clipe começa junto
    videoUrl: `${import.meta.env.BASE_URL}video/melhor_eu_ir_clipe.mp4`,
    videoOffset: 0,
    color: '#ff7b54',
    description: 'Notas tiradas das palhetadas reais do cavaquinho! Errou um pouco, o cavaco para; continuou errando, param pandeiro, baixo, violão e banjo. Acerte para trazer a banda de volta!',
    harmonyChords: acordesMelhorEuIr,
    lyrics: [
      { time: 0.0, text: '🍢 Prepare a palheta! O Menos é Mais vai entrar! 🍢' },
      { time: 4.8, text: '🪕 Solo de Cavaquinho - Churrasquinho Menos é Mais 🪕' },
      { time: 10.2, text: 'Melhor eu ir... tudo bem...' },
      { time: 17.0, text: 'O passado não muda por nada...' },
      { time: 23.5, text: 'Melhor eu ir... se acabou...' },
      { time: 30.5, text: 'Não tem jeito, acabou a estrada...' },
      { time: 37.0, text: 'E ligando os fatos, eu cheguei à conclusão... 🔥' },
      { time: 46.5, text: 'Que você brincou com o meu coração! 💔' },
      { time: 54.0, text: 'Melhor eu ir... desce mais uma gelada! 🍻' },
      { time: 63.0, text: 'E ligando os fatos... que resenha, Menos é Mais!' },
    ],
    notes: createMelhorEuIrNotes(),
  },
];
