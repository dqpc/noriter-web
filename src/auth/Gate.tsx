import { useState } from 'react'
import { CharacterAvatar, findCharacter, getMyCharacter } from '../characters'
import { ApiError, login, lookupNickname, register } from '../lib/auth'
import { useAuth } from './useAuth'

type Step = 'name' | 'password' | 'ask' | 'register'

/** 홈 첫 화면. 닉네임 하나로 로그인·가입·게스트를 가른다 */
export function Gate({ onPick }: { onPick: () => void }) {
  const { signIn, playAsGuest } = useAuth()
  const [step, setStep] = useState<Step>('name')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const character = getMyCharacter()

  const fail = (e: unknown) => setError(e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요')
  const back = () => {
    setStep(step === 'register' ? 'ask' : 'name')
    setPassword('')
    setAgain('')
    setError(null)
  }

  const submitName = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    setBusy(true)
    setError(null)
    try {
      const found = await lookupNickname(n)
      setStep(found ? 'password' : 'ask')
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const r = await login(name.trim(), password)
      signIn(r.token, r.user)
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError('비밀번호가 맞지 않습니다')
      else fail(err)
    } finally {
      setBusy(false)
    }
  }

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== again) {
      setError('비밀번호가 서로 다릅니다')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const r = await register(name.trim(), password, email.trim(), character)
      signIn(r.token, r.user)
    } catch (err) {
      fail(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="gate fade-in">
      {step === 'name' && (
        <form onSubmit={submitName} className="gate-body">
          <h2 className="gate-title">놀이터에 온 걸 환영해요</h2>
          <p className="gate-sub">닉네임을 입력하면 바로 시작합니다. 처음이면 가입, 있으면 로그인.</p>
          <div className="gate-row">
            <button type="button" className="me-button me-inline" onClick={onPick} aria-label="캐릭터 선택">
              <CharacterAvatar id={character} size={44} />
              <span>{findCharacter(character).name}</span>
            </button>
            <input
              className="input gate-input"
              value={name}
              maxLength={12}
              placeholder="닉네임"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          {error && <p className="room-error">{error}</p>}
          <button type="submit" className="btn gate-btn" disabled={!name.trim() || busy}>
            계속
          </button>
        </form>
      )}
      {step === 'password' && (
        <form onSubmit={submitLogin} className="gate-body">
          <h2 className="gate-title">다시 만나서 반가워요</h2>
          <p className="gate-sub">
            <b>{name.trim()}</b> 은(는) 가입된 닉네임이에요. 비밀번호를 입력해 주세요.
          </p>
          <input
            className="input gate-input"
            type="password"
            value={password}
            placeholder="비밀번호"
            autoFocus
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="room-error">{error}</p>}
          <div className="gate-actions">
            <button type="button" className="btn btn-ghost" onClick={back}>
              뒤로
            </button>
            <button type="submit" className="btn" disabled={!password || busy}>
              로그인
            </button>
          </div>
        </form>
      )}
      {step === 'ask' && (
        <div className="gate-body">
          <h2 className="gate-title">처음 보는 닉네임이에요</h2>
          <p className="gate-sub">
            <b>{name.trim()}</b> 으로 가입할까요? 가입하면 기록·친구·알림이 남고, 게스트는 이 브라우저에서만 놀 수
            있어요.
          </p>
          <div className="gate-actions">
            <button type="button" className="btn btn-ghost" onClick={back}>
              뒤로
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => playAsGuest(name.trim())}>
              게스트로 놀기
            </button>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setStep('register')
                setError(null)
              }}
            >
              가입
            </button>
          </div>
        </div>
      )}
      {step === 'register' && (
        <form onSubmit={submitRegister} className="gate-body">
          <h2 className="gate-title">비밀번호만 정하면 끝</h2>
          <p className="gate-sub">
            <b>{name.trim()}</b> 계정을 만듭니다. 이메일은 선택이에요.
          </p>
          <input
            className="input gate-input"
            type="email"
            value={email}
            placeholder="이메일 (선택)"
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            className="input gate-input"
            type="password"
            value={password}
            placeholder="비밀번호 (4자 이상)"
            autoFocus
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="input gate-input"
            type="password"
            value={again}
            placeholder="비밀번호 다시"
            autoComplete="new-password"
            onChange={(e) => setAgain(e.target.value)}
          />
          {error && <p className="room-error">{error}</p>}
          <div className="gate-actions">
            <button type="button" className="btn btn-ghost" onClick={back}>
              뒤로
            </button>
            <button type="submit" className="btn" disabled={password.length < 4 || !again || busy}>
              가입
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
