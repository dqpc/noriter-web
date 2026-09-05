export interface Character {
  id: string
  name: string
  body: string
}

const INK = '#1c1917'
const SW = 'stroke-width="2.5"'

// 오른쪽을 보는 옆모습: 꼬리(왼쪽) → 몸통 → 다리 → 머리(오른쪽) → 눈·코. 왼쪽은 통째로 반전한다.
function critter(o: {
  fill: string
  belly?: string
  tail?: string
  ears?: string
  head?: string
  snout?: string
  extra?: string
}): string {
  const belly = o.belly ?? o.fill
  return [
    o.tail ?? '',
    `<ellipse cx="26" cy="45" rx="17" ry="11" fill="${o.fill}" stroke="${INK}" ${SW}/>`,
    `<ellipse cx="28" cy="49" rx="10" ry="5" fill="${belly}"/>`,
    `<rect x="14" y="52" width="7" height="9" rx="3" fill="${o.fill}" stroke="${INK}" ${SW}/>`,
    `<rect x="30" y="52" width="7" height="9" rx="3" fill="${o.fill}" stroke="${INK}" ${SW}/>`,
    o.ears ?? '',
    o.head ?? `<circle cx="44" cy="27" r="13" fill="${o.fill}" stroke="${INK}" ${SW}/>`,
    o.snout ?? '',
    `<circle cx="49" cy="25" r="2.4" fill="${INK}"/>`,
    o.extra ?? '',
  ].join('')
}

const ear = (cx: number, cy: number, r: number, fill: string, inner?: string) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${INK}" ${SW}/>` +
  (inner ? `<circle cx="${cx}" cy="${cy}" r="${r * 0.5}" fill="${inner}"/>` : '')

export const ZODIAC: Character[] = [
  {
    id: 'rat',
    name: '쥐',
    body: critter({
      fill: '#a8a29e',
      belly: '#e7e5e4',
      tail: `<path d="M10 44 C2 40 2 30 8 28" stroke="${INK}" ${SW} fill="none" stroke-linecap="round"/>`,
      ears: ear(38, 14, 6, '#a8a29e', '#f9a8d4') + ear(48, 13, 6, '#a8a29e', '#f9a8d4'),
      head: `<path d="M31 28 C31 18 40 14 46 16 C52 18 58 26 58 30 C50 34 40 36 31 28Z" fill="#a8a29e" stroke="${INK}" ${SW}/>`,
      snout: `<circle cx="57" cy="30" r="2.5" fill="#f9a8d4"/>`,
    }),
  },
  {
    id: 'ox',
    name: '소',
    body: critter({
      fill: '#a16207',
      belly: '#fef3c7',
      tail: `<path d="M9 42 C4 46 6 52 10 54" stroke="${INK}" ${SW} fill="none" stroke-linecap="round"/><circle cx="10" cy="55" r="2.5" fill="${INK}"/>`,
      ears: `<path d="M36 16 C30 8 32 2 40 6Z M52 16 C58 8 56 2 48 6Z" fill="#fef3c7" stroke="${INK}" ${SW} stroke-linejoin="round"/>`,
      snout: `<ellipse cx="52" cy="33" rx="7" ry="5" fill="#fbcfe8" stroke="${INK}" stroke-width="2"/><circle cx="50" cy="33" r="1.4" fill="${INK}"/><circle cx="55" cy="33" r="1.4" fill="${INK}"/>`,
    }),
  },
  {
    id: 'tiger',
    name: '호랑이',
    body: critter({
      fill: '#f59e0b',
      belly: '#fef3c7',
      tail: `<path d="M10 44 C2 38 4 28 12 30" stroke="${INK}" ${SW} fill="none" stroke-linecap="round"/><path d="M6 36 L9 34 M5 32 L8 31" stroke="${INK}" stroke-width="2"/>`,
      ears: ear(36, 15, 5.5, '#f59e0b') + ear(51, 15, 5.5, '#f59e0b'),
      extra: `<path d="M18 38 L20 44 M24 36 L26 43 M42 18 L44 23 M50 18 L49 23" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><circle cx="56" cy="31" r="2" fill="${INK}"/><path d="M52 36 Q56 39 59 35" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'rabbit',
    name: '토끼',
    body: critter({
      fill: '#f5f5f4',
      tail: `<circle cx="10" cy="46" r="5" fill="#f5f5f4" stroke="${INK}" ${SW}/>`,
      ears: `<ellipse cx="39" cy="8" rx="4.5" ry="11" fill="#f5f5f4" stroke="${INK}" ${SW}/><ellipse cx="49" cy="8" rx="4.5" ry="11" fill="#f5f5f4" stroke="${INK}" ${SW}/><ellipse cx="39" cy="9" rx="2" ry="7" fill="#fbcfe8"/><ellipse cx="49" cy="9" rx="2" ry="7" fill="#fbcfe8"/>`,
      snout: `<circle cx="56" cy="30" r="2" fill="#f472b6"/>`,
    }),
  },
  {
    id: 'dragon',
    name: '용',
    body: critter({
      fill: '#16a34a',
      belly: '#bbf7d0',
      tail: `<path d="M10 44 C0 40 2 26 12 26" stroke="${INK}" ${SW} fill="none" stroke-linecap="round"/><path d="M4 30 L0 24 L8 27Z" fill="#fde047" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
      ears: `<path d="M36 16 L32 4 L42 13Z M50 15 L54 3 L44 12Z" fill="#fde047" stroke="${INK}" ${SW} stroke-linejoin="round"/>`,
      extra: `<path d="M14 34 L12 26 L20 32 M22 33 L22 25 L28 32" fill="#4ade80" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M50 33 Q55 36 58 32" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="56" cy="29" r="1.6" fill="${INK}"/>`,
    }),
  },
  {
    id: 'snake',
    name: '뱀',
    body:
      `<path d="M6 50 C14 40 22 60 30 50 C36 42 40 44 44 48" stroke="${INK}" stroke-width="12" fill="none" stroke-linecap="round"/>` +
      `<path d="M6 50 C14 40 22 60 30 50 C36 42 40 44 44 48" stroke="#65a30d" stroke-width="8" fill="none" stroke-linecap="round"/>` +
      `<ellipse cx="46" cy="36" rx="14" ry="10" fill="#65a30d" stroke="${INK}" ${SW}/>` +
      `<circle cx="52" cy="33" r="2.4" fill="${INK}"/>` +
      `<path d="M59 38 L64 36 M59 38 L64 41" stroke="#ef4444" stroke-width="2.5" stroke-linecap="round"/>` +
      `<path d="M12 48 L16 50 M22 52 L26 50" stroke="#1c1917" stroke-width="2" stroke-linecap="round"/>`,
  },
  {
    id: 'horse',
    name: '말',
    body: critter({
      fill: '#92400e',
      belly: '#d97706',
      tail: `<path d="M10 40 C2 44 2 54 8 58" stroke="${INK}" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      ears: `<path d="M37 17 L35 6 L43 14Z M49 15 L52 5 L44 13Z" fill="#92400e" stroke="${INK}" ${SW} stroke-linejoin="round"/>`,
      head: `<path d="M32 30 C32 18 42 14 48 17 C56 20 62 28 60 34 C54 40 40 40 32 30Z" fill="#92400e" stroke="${INK}" ${SW}/><path d="M32 22 C30 12 36 8 40 12 C42 8 46 8 46 14Z" fill="${INK}"/>`,
      snout: `<ellipse cx="57" cy="34" rx="5" ry="3.5" fill="#fbcfe8" stroke="${INK}" stroke-width="2"/>`,
    }),
  },
  {
    id: 'sheep',
    name: '양',
    body: critter({
      fill: '#fef3c7',
      tail: `<circle cx="10" cy="44" r="5" fill="#fef3c7" stroke="${INK}" ${SW}/>`,
      ears: `<g fill="#fef3c7" stroke="${INK}" ${SW}><circle cx="34" cy="16" r="6"/><circle cx="44" cy="12" r="7"/><circle cx="54" cy="16" r="6"/></g>`,
      head: `<circle cx="46" cy="28" r="11" fill="#fde68a" stroke="${INK}" ${SW}/>`,
      extra: `<path d="M34 30 C30 26 32 20 36 22" stroke="${INK}" ${SW} fill="none" stroke-linecap="round"/><path d="M51 33 Q54 35 56 32" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'monkey',
    name: '원숭이',
    body: critter({
      fill: '#b45309',
      belly: '#fde68a',
      tail: `<path d="M10 42 C0 36 2 22 12 22 C18 22 16 30 10 30" stroke="${INK}" ${SW} fill="none" stroke-linecap="round"/>`,
      ears: ear(34, 26, 5.5, '#fde68a'),
      extra: `<path d="M40 24 C40 18 50 16 56 22 C60 28 58 36 50 37 C44 37 40 32 40 24Z" fill="#fde68a"/><circle cx="52" cy="26" r="2.4" fill="${INK}"/><path d="M50 33 Q54 36 57 32" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'rooster',
    name: '닭',
    body: critter({
      fill: '#fafaf9',
      tail: `<path d="M12 40 C4 28 2 22 8 18 M12 42 C0 34 0 28 6 26" stroke="#15803d" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      ears: `<path d="M38 16 C38 6 44 8 46 12 C48 6 54 6 54 12 C57 8 60 12 56 18Z" fill="#ef4444" stroke="${INK}" ${SW} stroke-linejoin="round"/>`,
      snout: `<path d="M56 27 L64 30 L56 33Z" fill="#f59e0b" stroke="${INK}" ${SW} stroke-linejoin="round"/><path d="M52 38 C52 44 56 44 56 38" fill="#ef4444" stroke="${INK}" stroke-width="2"/>`,
      extra: `<path d="M22 44 C26 38 34 40 34 46" stroke="${INK}" stroke-width="2" fill="none"/>`,
    }),
  },
  {
    id: 'dog',
    name: '개',
    body: critter({
      fill: '#d97706',
      belly: '#fef3c7',
      tail: `<path d="M10 42 C4 36 6 28 12 30" stroke="${INK}" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      ears: `<ellipse cx="36" cy="26" rx="5" ry="11" fill="#92400e" stroke="${INK}" ${SW}/>`,
      snout: `<ellipse cx="54" cy="31" rx="7" ry="5" fill="#fef3c7"/><circle cx="58" cy="29" r="2.4" fill="${INK}"/><path d="M53 34 L55 36" stroke="#f472b6" stroke-width="2.5" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'pig',
    name: '돼지',
    body: critter({
      fill: '#f9a8d4',
      belly: '#fce7f3',
      tail: `<path d="M10 44 C4 40 4 48 8 46 C12 44 8 40 6 42" stroke="${INK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
      ears: `<path d="M36 17 L33 6 L44 14Z M50 16 L54 5 L45 13Z" fill="#f9a8d4" stroke="${INK}" ${SW} stroke-linejoin="round"/>`,
      snout: `<ellipse cx="55" cy="31" rx="6" ry="4.5" fill="#f472b6" stroke="${INK}" stroke-width="2"/><circle cx="53" cy="31" r="1.4" fill="${INK}"/><circle cx="57" cy="31" r="1.4" fill="${INK}"/>`,
    }),
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
