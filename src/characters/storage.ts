import { getPreference, setPreference } from '../lib/storage'
import { DEFAULT_CHARACTER, findCharacter } from './zodiac'

export function getMyCharacter(): string {
  return findCharacter(getPreference('me', 'character') ?? DEFAULT_CHARACTER).id
}

export function setMyCharacter(id: string): void {
  setPreference('me', 'character', findCharacter(id).id)
}
