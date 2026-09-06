import { WS_URL } from './api'
import type { Activity, Notification } from './auth'

export type MeServerMessage =
  { type: 'hello'; unread: number } | { type: 'notification'; item: Notification; unread: number } | { type: 'pong' }

export type MeClientMessage =
  { type: 'activity'; activity: Activity; gameId?: string | null; roomId?: string | null } | { type: 'ping' }

export interface MeSocketHandlers {
  onOpen: () => void
  onMessage: (m: MeServerMessage) => void
  /** 토큰 거부(1008). 다시 붙지 않는다 */
  onRejected: () => void
}

const PING_MS = 25_000
const RECONNECT_MS = 1_500

/** 로그인한 브라우저의 개인 채널. 연결이 살아 있는 동안 서버가 온라인으로 본다 */
export class MeSocket {
  private ws!: WebSocket
  private ping = 0
  private closed = false
  private readonly url: string
  private readonly handlers: MeSocketHandlers

  constructor(token: string, handlers: MeSocketHandlers) {
    this.url = `${WS_URL}/ws/me?token=${encodeURIComponent(token)}`
    this.handlers = handlers
    this.connect()
  }

  private connect(): void {
    this.ws = new WebSocket(this.url)
    this.ws.onopen = () => {
      window.clearInterval(this.ping)
      this.ping = window.setInterval(() => this.send({ type: 'ping' }), PING_MS)
      this.handlers.onOpen()
    }
    this.ws.onmessage = (e) => {
      const m = JSON.parse(e.data) as MeServerMessage
      if (m.type !== 'pong') this.handlers.onMessage(m)
    }
    this.ws.onclose = (e) => {
      window.clearInterval(this.ping)
      if (this.closed) return
      if (e.code === 1008) {
        this.handlers.onRejected()
        return
      }
      window.setTimeout(() => !this.closed && this.connect(), RECONNECT_MS)
    }
  }

  send(msg: MeClientMessage): void {
    if (this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg))
  }

  close(): void {
    this.closed = true
    window.clearInterval(this.ping)
    this.ws.close()
  }
}
