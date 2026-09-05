import { API_URL, WS_URL } from './api'

export type RoomStatus = 'WAITING' | 'COUNTDOWN' | 'PLAYING' | 'FINISHED'
export type OptionValue = string | number | boolean

export interface PlayerSnapshot {
  id: string
  nickname: string
  character: string | null
  score: number
  finished: boolean
  rank: number | null
}

export interface GameInfo {
  name: string
  minPlayers: number
  maxPlayersLimit: number
  matchDurationSeconds: number | null
  optionChoices: Record<string, OptionValue[]>
}

export interface RoomSnapshot {
  id: string
  gameId: string
  game: GameInfo
  status: RoomStatus
  hostId: string | null
  maxPlayers: number
  options: Record<string, OptionValue>
  seed: number
  startAt: string | null
  endAt: string | null
  players: PlayerSnapshot[]
}

export interface ChatMessage {
  playerId: string | null
  nickname: string | null
  text: string
  system: boolean
  sentAt: string
}

export type ServerMessage =
  | { type: 'hello'; playerId: string }
  | { type: 'room'; room: RoomSnapshot }
  | { type: 'error'; message: string }
  | { type: 'chat'; message: ChatMessage }
  | { type: 'chatHistory'; messages: ChatMessage[] }

export type ClientMessage =
  | { type: 'join'; nickname: string; character: string }
  | { type: 'settings'; maxPlayers?: number; options?: Record<string, OptionValue> }
  | { type: 'start' }
  | { type: 'score'; score: number }
  | { type: 'finish'; score: number }
  | { type: 'chat'; text: string }
  | { type: 'character'; character: string }

export async function createRoom(gameId: string): Promise<RoomSnapshot> {
  const res = await fetch(`${API_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ gameId }),
  })
  if (!res.ok) throw new Error((await res.text()) || `방 생성 실패 (${res.status})`)
  return res.json()
}

export async function fetchRoom(roomId: string): Promise<RoomSnapshot | null> {
  const res = await fetch(`${API_URL}/api/rooms/${roomId}`)
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`방 조회 실패 (${res.status})`)
  return res.json()
}

export class RoomSocket {
  private ws: WebSocket

  constructor(
    roomId: string,
    handlers: { onMessage: (m: ServerMessage) => void; onClose: () => void },
  ) {
    this.ws = new WebSocket(`${WS_URL}/ws/rooms/${roomId}`)
    this.ws.onmessage = (e) => handlers.onMessage(JSON.parse(e.data) as ServerMessage)
    this.ws.onclose = handlers.onClose
    this.ws.onerror = handlers.onClose
  }

  send(msg: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
    else this.ws.addEventListener('open', () => this.ws.send(JSON.stringify(msg)), { once: true })
  }

  close(): void {
    this.ws.onclose = null
    this.ws.onerror = null
    this.ws.close()
  }
}
