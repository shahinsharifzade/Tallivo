// Emoji for a meetup, guessed from its title. Edit the keyword map to add more.

const ICONS: [emoji: string, keywords: string[]][] = [
  ['☕', ['kafe', 'qəhvə', 'coffee', 'cafe', 'çay', 'latte']],
  ['🎮', ['playstation', 'ps5', 'ps4', 'oyun', 'game', 'fifa', 'xbox']],
  ['🌳', ['bağ', 'park', 'piknik', 'picnic', 'garden', 'təbiət', 'meşə']],
  ['🍽️', ['restoran', 'restaurant', 'yemək', 'nahar', 'dinner', 'lunch', 'food']],
  ['🎬', ['kino', 'film', 'cinema', 'movie']],
  ['🚕', ['taksi', 'taxi', 'yol', 'uber', 'bolt']],
];

const FALLBACK = '📍';

/** Lowercase (Azerbaijani rules) and fold special letters so "Qəhvə" and "qehve" both match. */
function fold(text: string): string {
  return text
    .toLocaleLowerCase('az')
    .replace(/ə/g, 'e')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u');
}

const FOLDED = ICONS.map(([emoji, words]) => [emoji, words.map(fold)] as const);

export function meetupIcon(title: string): string {
  const t = fold(title);
  for (const [emoji, words] of FOLDED) {
    if (words.some((w) => t.includes(w))) return emoji;
  }
  return FALLBACK;
}
