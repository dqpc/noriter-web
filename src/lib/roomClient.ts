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
  turnBased: boolean
  uniqueCharacters: boolean
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
  | { type: 'pong' }
  | { type: 'playerState'; playerId: string; state: Record<string, unknown> }
  | { type: 'gameState'; state: Record<string, unknown> }

export type ClientMessage =
  | { type: 'join'; nickname: string; character: string }
  | { type: 'settings'; maxPlayers?: number; options?: Record<string, OptionValue> }
  | { type: 'start' }
  | { type: 'score'; score: number }
  | { type: 'finish'; score: number }
  | { type: 'chat'; text: string }
  | { type: 'character'; character: string }
  | { type: 'ping' }
  | { type: 'rematch' }
  | { type: 'state'; state: Record<string, unknown> }
  | { type: 'action'; action: Record<string, unknown> }

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

export interface RoomSocketHandlers {
  onMessage: (m: ServerMessage) => void
  onOpen: () => void
  onReconnecting: () => void
  onClose: () => void
}

const HEARTBEAT_MS = 30_000
const RECONNECT_MS = 1_500

export class RoomSocket {
  private ws!: WebSocket
  private heartbeat = 0
  private closed = false
  private readonly url: string
  private readonly handlers: RoomSocketHandlers

  constructor(roomId: string, handlers: RoomSocketHandlers) {
    this.url = `${WS_URL}/ws/rooms/${roomId}`
    this.handlers = handlers
    this.connect()
  }

  private connect(): void {
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      window.clearInterval(this.heartbeat)
      this.heartbeat = window.setInterval(() => this.send({ type: 'ping' }), HEARTBEAT_MS)
      this.handlers.onOpen()
    }
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data) as ServerMessage
      if (m.type !== 'pong') this.handlers.onMessage(m)
    }
    this.ws.onclose = (e) => {
      window.clearInterval(this.heartbeat)
      if (this.closed) return
      if (e.code === 1008) {
        this.handlers.onClose()
        return
      }
      this.handlers.onReconnecting()
      window.setTimeout(() => !this.closed && this.connect(), RECONNECT_MS)
    }
  }

  send(msg: ClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  close(): void {
    this.closed = true
    window.clearInterval(this.heartbeat)
    this.ws.close()
  }
}
