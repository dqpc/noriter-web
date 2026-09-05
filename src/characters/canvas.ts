import { characterSvg, findCharacter } from './zodiac'

const cache = new Map<string, HTMLImageElement>()

export function getCharacterImage(id: string, facing: 'L' | 'R'): HTMLImageElement {
  const key = `${id}:${facing}`
  let img = cache.get(key)
  if (!img) {
    img = new Image()
    img.src = `data:image/svg+xml;utf8,${encodeURIComponent(characterSvg(findCharacter(id), facing))}`
    cache.set(key, img)
  }
  return img
}
