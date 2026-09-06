import { call } from './auth'

export interface DmMessage {
  id: number
  conversationId: number
  senderId: number
  body: string
  createdAt: string
}

export interface Conversation {
  id: number
  otherUserId: number
  otherNickname: string
  otherCharacterId: string | null
  lastMessage: DmMessage | null
  unread: number
  lastMessageAt: string | null
}

export const fetchConversations = () => call<Conversation[]>('/api/conversations')
export const openConversation = (userId: number) =>
  call<Conversation>('/api/conversations', { method: 'POST', body: JSON.stringify({ userId }) })
export const fetchMessages = (id: number, before?: number) =>
  call<DmMessage[]>(`/api/conversations/${id}/messages${before ? `?before=${before}` : ''}`)
export const sendMessage = (id: number, text: string) =>
  call<DmMessage>(`/api/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ text }) })
export const markConversationRead = (id: number, lastReadMessageId: number) =>
  call<void>(`/api/conversations/${id}/read`, { method: 'PATCH', body: JSON.stringify({ lastReadMessageId }) })
