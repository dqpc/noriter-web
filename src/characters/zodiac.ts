export interface Character {
  id: string
  name: string
  body: string
}

const face = (fill: string, extra: string, stroke = '#1c1917') =>
  `<circle cx="32" cy="34" r="20" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>${extra}` +
  `<circle cx="38" cy="32" r="2.6" fill="#1c1917"/><circle cx="27" cy="32" r="2.6" fill="#1c1917"/>`

export const ZODIAC: Character[] = [
  {
    id: 'rat',
    name: '쥐',
    body: face(
      '#a8a29e',
      `<circle cx="16" cy="18" r="8" fill="#a8a29e" stroke="#1c1917" stroke-width="2.5"/><circle cx="48" cy="18" r="8" fill="#a8a29e" stroke="#1c1917" stroke-width="2.5"/><circle cx="16" cy="18" r="4" fill="#f9a8d4"/><circle cx="48" cy="18" r="4" fill="#f9a8d4"/><circle cx="44" cy="40" r="2.5" fill="#f9a8d4"/>`,
    ),
  },
  {
    id: 'ox',
    name: '소',
    body: face(
      '#a16207',
      `<path d="M14 26 C6 18 8 8 16 10 C18 16 20 20 24 22Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.5"/><path d="M50 26 C58 18 56 8 48 10 C46 16 44 20 40 22Z" fill="#fef3c7" stroke="#1c1917" stroke-width="2.5"/><ellipse cx="34" cy="44" rx="9" ry="5" fill="#fbcfe8" stroke="#1c1917" stroke-width="2"/><circle cx="31" cy="44" r="1.5" fill="#1c1917"/><circle cx="37" cy="44" r="1.5" fill="#1c1917"/>`,
    ),
  },
  {
    id: 'tiger',
    name: '호랑이',
    body: face(
      '#f59e0b',
      `<circle cx="17" cy="19" r="7" fill="#f59e0b" stroke="#1c1917" stroke-width="2.5"/><circle cx="47" cy="19" r="7" fill="#f59e0b" stroke="#1c1917" stroke-width="2.5"/><path d="M30 16 L32 24 L34 16 M22 22 L26 27 M42 22 L38 27" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M28 43 Q32 47 36 43" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="34" cy="39" r="2.2" fill="#1c1917"/>`,
    ),
  },
  {
    id: 'rabbit',
    name: '토끼',
    body: face(
      '#f5f5f4',
      `<ellipse cx="24" cy="12" rx="6" ry="13" fill="#f5f5f4" stroke="#1c1917" stroke-width="2.5"/><ellipse cx="40" cy="12" rx="6" ry="13" fill="#f5f5f4" stroke="#1c1917" stroke-width="2.5"/><ellipse cx="24" cy="12" rx="3" ry="9" fill="#fbcfe8"/><ellipse cx="40" cy="12" rx="3" ry="9" fill="#fbcfe8"/><circle cx="34" cy="40" r="2" fill="#f472b6"/>`,
    ),
  },
  {
    id: 'dragon',
    name: '용',
    body: face(
      '#16a34a',
      `<path d="M18 20 L14 6 L24 16Z M46 20 L50 6 L40 16Z" fill="#fde047" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/><path d="M12 34 L6 30 L12 40 M52 34 L58 30 L52 40" fill="#4ade80" stroke="#1c1917" stroke-width="2" stroke-linejoin="round"/><path d="M27 44 Q34 49 41 44" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: 'snake',
    name: '뱀',
    body: face(
      '#65a30d',
      `<path d="M34 42 L34 50 M31 50 L37 50" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/><path d="M14 36 C10 26 16 20 22 22" stroke="#1c1917" stroke-width="2" fill="none"/><path d="M50 36 C54 26 48 20 42 22" stroke="#1c1917" stroke-width="2" fill="none"/>`,
    ),
  },
  {
    id: 'horse',
    name: '말',
    body: face(
      '#92400e',
      `<path d="M20 16 C22 6 30 4 34 10 C38 4 44 6 44 14 L40 18 L24 18Z" fill="#1c1917"/><path d="M22 22 L18 12 L26 18Z M42 22 L46 12 L38 18Z" fill="#92400e" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="34" cy="45" rx="8" ry="5" fill="#fbcfe8" stroke="#1c1917" stroke-width="2"/>`,
    ),
  },
  {
    id: 'sheep',
    name: '양',
    body: face(
      '#fef3c7',
      `<g fill="#fef3c7" stroke="#1c1917" stroke-width="2.5"><circle cx="20" cy="16" r="7"/><circle cx="32" cy="12" r="8"/><circle cx="44" cy="16" r="7"/></g><path d="M12 30 C6 26 8 20 14 22 M52 30 C58 26 56 20 50 22" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M29 43 Q32 46 35 43" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: 'monkey',
    name: '원숭이',
    body: face(
      '#b45309',
      `<circle cx="12" cy="30" r="7" fill="#fde68a" stroke="#1c1917" stroke-width="2.5"/><circle cx="52" cy="30" r="7" fill="#fde68a" stroke="#1c1917" stroke-width="2.5"/><ellipse cx="32" cy="40" rx="11" ry="9" fill="#fde68a"/><path d="M27 43 Q32 47 37 43" stroke="#1c1917" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    ),
  },
  {
    id: 'rooster',
    name: '닭',
    body: face(
      '#fafaf9',
      `<path d="M22 16 C22 6 28 8 30 12 C32 6 38 6 38 12 C42 8 46 12 42 18Z" fill="#ef4444" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/><path d="M36 38 L46 42 L36 46Z" fill="#f59e0b" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/><path d="M30 52 C30 58 34 58 34 52" fill="#ef4444" stroke="#1c1917" stroke-width="2"/>`,
    ),
  },
  {
    id: 'dog',
    name: '개',
    body: face(
      '#d97706',
      `<ellipse cx="14" cy="26" rx="6" ry="12" fill="#92400e" stroke="#1c1917" stroke-width="2.5"/><ellipse cx="50" cy="26" rx="6" ry="12" fill="#92400e" stroke="#1c1917" stroke-width="2.5"/><ellipse cx="34" cy="41" rx="7" ry="5" fill="#fef3c7"/><circle cx="35" cy="39" r="2.4" fill="#1c1917"/><path d="M33 44 L36 47" stroke="#f472b6" stroke-width="2.5" stroke-linecap="round"/>`,
    ),
  },
  {
    id: 'pig',
    name: '돼지',
    body: face(
      '#f9a8d4',
      `<path d="M16 22 L12 10 L26 18Z M48 22 L52 10 L38 18Z" fill="#f9a8d4" stroke="#1c1917" stroke-width="2.5" stroke-linejoin="round"/><ellipse cx="34" cy="43" rx="8" ry="5.5" fill="#f472b6" stroke="#1c1917" stroke-width="2"/><circle cx="31" cy="43" r="1.6" fill="#1c1917"/><circle cx="37" cy="43" r="1.6" fill="#1c1917"/>`,
    ),
  },
]

export const DEFAULT_CHARACTER = 'rabbit'

export function findCharacter(id: string | null | undefined): Character {
  return ZODIAC.find((c) => c.id === id) ?? ZODIAC.find((c) => c.id === DEFAULT_CHARACTER)!
}

export function characterSvg(c: Character, facing: 'L' | 'R' = 'R'): string {
  const flip = facing === 'L' ? ' transform="translate(64 0) scale(-1 1)"' : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><g${flip}>${c.body}</g></svg>`
}
