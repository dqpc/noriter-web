import { getPreference, setPreference } from '../lib/storage'
import { ZODIAC, findCharacter } from './zodiac'

export function getMyCharacter(): string {
  const saved = getPreference('me', 'character')
  if (saved && ZODIAC.some((c) => c.id === saved)) return saved
  const random = ZODIAC[Math.floor(Math.random() * ZODIAC.length)].id
  setPreference('me', 'character', random)
  return random
}

export function setMyCharacter(id: string): void {
  setPreference('me', 'character', findCharacter(id).id)
}
