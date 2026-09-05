import { characterSvg, findCharacter } from './zodiac'

export function CharacterAvatar({ id, size = 40, facing = 'R' }: { id: string | null | undefined; size?: number; facing?: 'L' | 'R' }) {
  const c = findCharacter(id)
  return (
    <span
      className="avatar"
      style={{ width: size, height: size }}
      role="img"
      aria-label={c.name}
      dangerouslySetInnerHTML={{ __html: characterSvg(c, facing) }}
    />
  )
}
