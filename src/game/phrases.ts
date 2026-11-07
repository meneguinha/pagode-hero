// Frases da resenha que aparecem na pista em momentos marcantes da partida.

// Quando o jogador erra várias seguidas
export const ROAST_PHRASES = [
  'Olha a vaia vindo! 😬',
  'Errou o acorde!',
  'Cadê a cadência?',
  'O cavaco desafinou!',
  'Atravessou o samba!',
  'Ih, perdeu o compasso!',
  'A roda tá olhando torto…',
  'Volta pro ensaio! 😅',
  'Tomou a gelada antes da hora?',
  'Tá tocando outra música, parceiro?',
  'Segura a onda aí!',
  'Chama o professor de cavaco!',
];

// Quando o jogador acerta muitas em sequência
export const HYPE_PHRASES = [
  'A resenha tá forte! 🔥',
  'Pagode forte!',
  'Palhetada de ouro! 🪕',
  'Que cadência, hein!',
  'A roda tá aplaudindo! 👏',
  'Tá no compasso, parceiro!',
  'Brabo demais!',
  'O pagode não para!',
  'Dono da roda! 👑',
  'Isso que é Menos é Mais!',
  'Tá tocando muito! 🍻',
  'Segura que o samba é teu!',
];

/** Sorteia uma frase evitando repetir a última que saiu da mesma lista. */
export function pickPhrase(list: string[], last?: string): string {
  const options = list.length > 1 ? list.filter((p) => p !== last) : list;
  return options[Math.floor(Math.random() * options.length)];
}
