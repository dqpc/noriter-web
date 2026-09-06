import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../auth/useAuth'
import { ApiError } from '../../lib/auth'
import { checkWord, fetchToday, fetchWordStats, submitGuess, submitResult, type ServerStats, type Today } from './api'
import { customLink, decodeCustom, encodeCustom, type CustomPuzzle } from './custom'
import { KEYBOARD_ROWS, MAX_TRIES, WORD_LENGTH, decompose, keyToJamo } from './jamo'
import { hardModeError, judge, keyStatuses, type Status } from './judge'
import { buildShareText } from './share'
import {
  type Answer,
  type Progress,
  type Settings,
  type Stats,
  hasSeenHelp,
  loadGuestStats,
  loadProgress,
  loadSettings,
  markHelpSeen,
  recordGuestResult,
  saveProgress,
  saveSettings,
} from './storage'

const WIN_MESSAGES = ['최고군요!', '대단합니다!', '훌륭하네요!', '잘했어요!', '좋아요!', '좋아요!']
const FLIP_MS = 250

type Modal = 'help' | 'stats' | 'settings' | 'create' | null

interface ViewStats {
  played: number
  won: number
  currentStreak: number
  maxStreak: number
  distribution: number[]
}

function toView(s: Stats | ServerStats): ViewStats {
  return {
    played: s.played,
    won: s.won,
    currentStreak: s.currentStreak,
    maxStreak: s.maxStreak,
    distribution: s.distribution,
  }
}

function useCountdown(resetAt: string | null): string {
  const [text, setText] = useState('')
  useEffect(() => {
    if (!resetAt) return
    const target = Date.parse(resetAt)
    const tick = () => {
      const left = Math.max(0, target - Date.now())
      const h = Math.floor(left / 3_600_000)
      const m = Math.floor((left % 3_600_000) / 60_000)
      const s = Math.floor((left % 60_000) / 1000)
      setText(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [resetAt])
  return text
}

export function GameWord() {
  const { me } = useAuth()
  const location = useLocation()
  const custom = useMemo<CustomPuzzle | null>(() => {
    const code = new URLSearchParams(location.search).get('code')
    return code ? decodeCustom(code) : null
  }, [location.search])

  const [today, setToday] = useState<Today | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [rows, setRows] = useState<string[][]>([])
  const [statuses, setStatuses] = useState<Status[][]>([])
  const [current, setCurrent] = useState<string[]>([])
  const [finished, setFinished] = useState(false)
  const [won, setWon] = useState(false)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [hard, setHard] = useState(() => loadSettings().hard)
  const [stats, setStats] = useState<ViewStats | null>(() => (custom || me ? null : toView(loadGuestStats())))
  const [modal, setModal] = useState<Modal>(() => (custom && !hasSeenHelp() ? 'help' : null))
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [shake, setShake] = useState(false)
  const [flipping, setFlipping] = useState(false)
  const toastTimer = useRef<number | null>(null)
  const number = custom ? null : (today?.number ?? null)

  const showToast = useCallback((message: string, ms = 1800) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), ms)
  }, [])

  // 오늘의 문제 불러오기 + 저장된 진행 복원
  useEffect(() => {
    if (custom) return
    let cancelled = false
    fetchToday()
      .then((t) => {
        if (cancelled) return
        setToday(t)
        const saved = loadProgress(t.number)
        if (saved) {
          setRows(saved.rows)
          setStatuses(saved.statuses)
          setHard(saved.hard)
          setFinished(saved.finished)
          setWon(saved.won)
          setAnswer(saved.answer)
        } else if (!hasSeenHelp()) {
          setModal('help')
        }
      })
      .catch((e: unknown) => !cancelled && setLoadError(e instanceof Error ? e.message : '문제를 불러오지 못했습니다.'))
    return () => {
      cancelled = true
    }
  }, [custom])

  // 통계: 로그인은 서버, 게스트는 로컬
  useEffect(() => {
    if (custom || !me) return
    let cancelled = false
    fetchWordStats()
      .then((s) => !cancelled && setStats(toView(s)))
      .catch(() => !cancelled && setStats(null))
    return () => {
      cancelled = true
    }
  }, [me, custom])

  const persist = useCallback(
    (next: Partial<Progress>) => {
      if (number === null) return
      saveProgress({
        number,
        rows,
        statuses,
        hard,
        finished,
        won,
        answer,
        ...next,
      })
    },
    [number, rows, statuses, hard, finished, won, answer],
  )

  const finish = useCallback(
    async (didWin: boolean, nextRows: string[][], nextStatuses: Status[][]) => {
      const attempts = didWin ? nextRows.length : null
      setFinished(true)
      setWon(didWin)
      let resolved: Answer | null = null
      if (custom) {
        resolved = { jamo: custom.answer.join(''), word: custom.answer.join(''), meaning: null }
      } else if (number !== null) {
        try {
          const res = await submitResult(number, attempts, hard)
          resolved = res.answer
          if (res.stats) setStats(toView(res.stats))
          else setStats(toView(recordGuestResult(number, attempts)))
        } catch {
          if (!me) setStats(toView(recordGuestResult(number, attempts)))
        }
      }
      setAnswer(resolved)
      if (number !== null) {
        saveProgress({
          number,
          rows: nextRows,
          statuses: nextStatuses,
          hard,
          finished: true,
          won: didWin,
          answer: resolved,
        })
      }
      if (didWin) showToast(WIN_MESSAGES[nextRows.length - 1] ?? '잘했어요!', 2200)
      else if (resolved) showToast(`정답은 "${resolved.word}"입니다.`, 4000)
      window.setTimeout(() => setModal('stats'), FLIP_MS * WORD_LENGTH + 600)
    },
    [custom, number, hard, me, showToast],
  )

  const submit = useCallback(async () => {
    if (busy || finished || flipping) return
    if (current.length < WORD_LENGTH) {
      showToast('음운이 부족합니다.')
      setShake(true)
      return
    }
    if (hard) {
      const err = hardModeError(current, rows[rows.length - 1], statuses[statuses.length - 1])
      if (err) {
        showToast(err, 2500)
        setShake(true)
        return
      }
    }
    setBusy(true)
    try {
      const jamo = current.join('')
      let result: Status[]
      if (custom) {
        const valid = await checkWord(jamo)
        if (!valid) {
          showToast('아, 목록에 단어가 없네요.')
          setShake(true)
          return
        }
        result = judge(current, custom.answer)
      } else {
        if (number === null) return
        result = (await submitGuess(number, jamo)).statuses
      }
      const nextRows = [...rows, current]
      const nextStatuses = [...statuses, result]
      setRows(nextRows)
      setStatuses(nextStatuses)
      setCurrent([])
      setFlipping(true)
      window.setTimeout(() => setFlipping(false), FLIP_MS * WORD_LENGTH)
      const didWin = result.every((s) => s === 'correct')
      if (didWin || nextRows.length >= MAX_TRIES) {
        void finish(didWin, nextRows, nextStatuses)
      } else if (number !== null) {
        saveProgress({
          number,
          rows: nextRows,
          statuses: nextStatuses,
          hard,
          finished: false,
          won: false,
          answer: null,
        })
      }
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) showToast('아, 목록에 단어가 없네요.')
      else showToast(e instanceof Error ? e.message : '잠시 후 다시 시도해 주세요.')
      setShake(true)
    } finally {
      setBusy(false)
    }
  }, [busy, finished, flipping, current, hard, rows, statuses, custom, number, showToast, finish])

  const type = useCallback(
    (j: string) => {
      if (finished || flipping) return
      setCurrent((c) => (c.length >= WORD_LENGTH ? c : [...c, j]))
    },
    [finished, flipping],
  )
  const erase = useCallback(() => setCurrent((c) => c.slice(0, -1)), [])

  useEffect(() => {
    if (modal) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === 'Enter') {
        e.preventDefault()
        void submit()
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        erase()
      } else {
        const jamo = keyToJamo(e.key)
        if (jamo.length > 0) {
          e.preventDefault()
          jamo.forEach(type)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal, submit, erase, type])

  useEffect(() => {
    if (!shake) return
    const id = window.setTimeout(() => setShake(false), 500)
    return () => window.clearTimeout(id)
  }, [shake])

  const updateSettings = (patch: Partial<Settings>) => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  const toggleHard = () => {
    if (rows.length > 0 && !finished) {
      showToast('어렵게 풀기는 시작 전에만 설정할 수 있습니다!', 2500)
      return
    }
    const next = !hard
    setHard(next)
    updateSettings({ hard: next })
    if (!finished) persist({ hard: next })
  }

  const share = async () => {
    const text = buildShareText({
      number,
      attempts: won ? rows.length : null,
      hard,
      streak: settings.showStreak && stats && !custom ? stats.currentStreak : null,
      rows: statuses,
      highContrast: settings.highContrast,
      showLink: settings.showLink && !custom,
      creator: custom?.creator,
    })
    try {
      if (navigator.share) {
        await navigator.share({ text })
        return
      }
    } catch {
      /* 공유 취소는 복사로 대신 */
    }
    try {
      await navigator.clipboard.writeText(text)
      showToast('결과가 클립보드에 복사되었어요.')
    } catch {
      showToast('복사하지 못했어요. 길게 눌러 복사해 주세요.')
    }
  }

  const keyMap = useMemo(() => keyStatuses(rows, statuses), [rows, statuses])
  const countdown = useCountdown(today?.resetAt ?? null)
  const title = custom ? `${custom.creator}의 놀이` : today ? `글딱지 ${today.number}` : '글딱지'

  if (loadError) {
    return (
      <div className="word">
        <p className="room-error">{loadError}</p>
      </div>
    )
  }

  return (
    <div className={`word ${settings.highContrast ? 'hc' : ''}`}>
      <div className="word-top">
        <span className="word-title">
          {title}
          {hard && <span className="word-hard-badge">어렵게</span>}
        </span>
        <div className="word-top-actions">
          <button type="button" className="icon-btn" aria-label="이 놀이는?" onClick={() => setModal('help')}>
            ?
          </button>
          <button type="button" className="icon-btn" aria-label="통계" onClick={() => setModal('stats')}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path fill="currentColor" d="M4 20h3V10H4v10Zm6.5 0h3V4h-3v16ZM17 20h3v-7h-3v7Z" />
            </svg>
          </button>
          <button type="button" className="icon-btn" aria-label="설정" onClick={() => setModal('settings')}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                fill="currentColor"
                d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.7 7.7 0 0 0-1.8-1L15 3.5H9l-.3 2.5a7.7 7.7 0 0 0-1.8 1l-2.3-.9-2 3.4L4.6 11a7.6 7.6 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.6.4 1.2.8 1.8 1l.3 2.5h6l.3-2.5c.6-.2 1.2-.6 1.8-1l2.3.9 2-3.4-2-1.5ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className={`word-grid ${shake ? 'shake' : ''}`} role="grid" aria-label="추측 격자">
        {Array.from({ length: MAX_TRIES }, (_, r) => {
          const row = rows[r] ?? (r === rows.length ? current : [])
          const rowStatus = statuses[r]
          const isFlipRow = flipping && r === rows.length - 1
          return (
            <div key={r} className={`word-row ${r === rows.length && !finished ? 'active' : ''}`} role="row">
              {Array.from({ length: WORD_LENGTH }, (_, c) => {
                const ch = row[c]
                const st = rowStatus?.[c]
                return (
                  <div
                    key={c}
                    role="gridcell"
                    className={`word-tile ${ch ? 'filled' : ''} ${st ?? ''} ${isFlipRow ? 'flip' : ''}`}
                    style={isFlipRow ? { animationDelay: `${c * FLIP_MS}ms` } : undefined}
                  >
                    {ch}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>

      <div className="word-keyboard" aria-label="자모 키보드">
        {KEYBOARD_ROWS.map((keys, i) => (
          <div key={i} className="word-key-row">
            {i === KEYBOARD_ROWS.length - 1 && (
              <button type="button" className="word-key wide" onClick={() => void submit()} disabled={finished}>
                입력
              </button>
            )}
            {keys.map((k) => (
              <button
                key={k}
                type="button"
                className={`word-key ${keyMap.get(k) ?? ''}`}
                onClick={() => type(k)}
                disabled={finished}
              >
                {k}
              </button>
            ))}
            {i === KEYBOARD_ROWS.length - 1 && (
              <button type="button" className="word-key wide" onClick={erase} disabled={finished} aria-label="지움">
                ⌫
              </button>
            )}
          </div>
        ))}
      </div>

      {toast && (
        <div className="word-toast" role="status">
          {toast}
        </div>
      )}

      {modal === 'help' && (
        <WordModal
          title="이 놀이는?"
          onClose={() => {
            markHelpSeen()
            setModal(null)
          }}
        >
          <p>
            여섯 개의 자모로 풀어쓴 한글 단어를 여섯 번의 도전 안에 맞혀 봅시다. 한글 단어를 풀어쓴 후 <b>입력</b>을
            누르면 칸 색깔이 변합니다!
          </p>
          <HelpRow word="ㅍㅗㅎㅗㅣㄱ" mark={0} status="correct" />
          <p>자음 'ㅍ'은 올바른 자리에 있습니다.</p>
          <HelpRow word="ㅅㅅㅏㅇㅜㅁ" mark={2} status="present" />
          <p>모음 'ㅏ'은 잘못된 자리에 있습니다.</p>
          <HelpRow word="ㄱㅣㅅㅡㄹㄱ" mark={3} status="absent" />
          <p>모음 'ㅡ'은 어느 곳에도 맞지 않습니다.</p>
          <p>
            복합모음과 쌍자음, 겹받침은 더 작은 자모들로 풀어집니다. 예를 들어 'ㅔ'는 'ㅓ·ㅣ', 'ㄲ'은 'ㄱ·ㄱ', 'ㄳ'은
            'ㄱ·ㅅ'으로 나뉩니다.
          </p>
          <p>자모는 중복될 수 있으며, 외래어도 한글 단어에 포함됩니다.</p>
          <p>
            <b>"글딱지"는 자정에 갱신됩니다.</b>
          </p>
          <p className="word-credit">
            단어와 뜻풀이는 국립국어원 표준국어대사전을 바탕으로 했습니다. 원조는{' '}
            <a href="https://www.nytimes.com/games/wordle" target="_blank" rel="noreferrer">
              Wordle
            </a>
            , 한글 규칙은{' '}
            <a href="https://kordle.kr" target="_blank" rel="noreferrer">
              꼬들
            </a>
            을 따랐습니다.
          </p>
        </WordModal>
      )}

      {modal === 'stats' && (
        <WordModal title={finished ? (won ? '맞혔어요!' : '아쉽네요') : '통계'} onClose={() => setModal(null)}>
          {finished && answer && (
            <div className="word-answer">
              <span className="word-answer-word">{answer.word}</span>
              <span className="word-answer-jamo">{decompose(answer.word).join(' ') || answer.jamo}</span>
              {answer.meaning && <p className="word-answer-meaning">{answer.meaning}</p>}
            </div>
          )}
          {!custom && stats && (
            <>
              <div className="word-stats">
                <StatBox label="전체 도전" value={stats.played} />
                <StatBox label="정답률" value={`${stats.played ? Math.round((stats.won / stats.played) * 100) : 0}%`} />
                <StatBox label="최근 연속 정답" value={stats.currentStreak} />
                <StatBox label="최다 연속 정답" value={stats.maxStreak} />
              </div>
              <p className="word-dist-title">도전 분포</p>
              <div className="word-dist">
                {stats.distribution.map((n, i) => {
                  const max = Math.max(1, ...stats.distribution)
                  const mine = finished && won && rows.length === i + 1
                  return (
                    <div key={i} className="word-dist-row">
                      <span className="word-dist-n">{i + 1}</span>
                      <div
                        className={`word-dist-bar ${mine ? 'mine' : ''}`}
                        style={{ width: `${Math.max(7, (n / max) * 100)}%` }}
                      >
                        {n}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
          {finished && (
            <div className="word-result-actions">
              {!custom && today && (
                <div className="word-next">
                  <small>새로운 문제까지</small>
                  <b>{countdown}</b>
                </div>
              )}
              <button type="button" className="btn" onClick={() => void share()}>
                결과 복사
              </button>
            </div>
          )}
          {!custom && (
            <button type="button" className="btn btn-ghost word-create-btn" onClick={() => setModal('create')}>
              문제 만들기
            </button>
          )}
        </WordModal>
      )}

      {modal === 'settings' && (
        <WordModal title="설정" onClose={() => setModal(null)}>
          <SettingRow
            name="어렵게 풀기"
            desc="파악된 자모는 무조건 사용되어야 합니다."
            on={hard}
            onToggle={toggleHard}
          />
          <SettingRow
            name="고대비 형태"
            desc="칸의 색깔들을 더 구별하기 쉽게 바꿉니다."
            on={settings.highContrast}
            onToggle={() => updateSettings({ highContrast: !settings.highContrast })}
          />
          <SettingRow
            name="링크 표기"
            desc="놀이터 주소를 결과에 표기합니다."
            on={settings.showLink}
            onToggle={() => updateSettings({ showLink: !settings.showLink })}
          />
          <SettingRow
            name="연속 정답 표기"
            desc="최근 연속 정답 횟수를 결과에 표기합니다."
            on={settings.showStreak}
            onToggle={() => updateSettings({ showStreak: !settings.showStreak })}
          />
        </WordModal>
      )}

      {modal === 'create' && <CreateModal onClose={() => setModal(null)} onToast={showToast} />}
    </div>
  )
}

function WordModal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal word-modal" onClick={(e) => e.stopPropagation()}>
        <div className="word-modal-head">
          <h3 className="modal-title">{title}</h3>
          <button type="button" className="icon-btn" aria-label="닫기" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

function HelpRow({ word, mark, status }: { word: string; mark: number; status: Status }) {
  return (
    <div className="word-row example" role="presentation">
      {word.split('').map((ch, i) => (
        <div key={i} className={`word-tile filled ${i === mark ? status : ''}`}>
          {ch}
        </div>
      ))}
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="word-stat">
      <b>{value}</b>
      <small>{label}</small>
    </div>
  )
}

function SettingRow({ name, desc, on, onToggle }: { name: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <label className="word-setting">
      <span>
        <b>{name}</b>
        <small>{desc}</small>
      </span>
      <input type="checkbox" checked={on} onChange={onToggle} />
    </label>
  )
}

function CreateModal({ onClose, onToast }: { onClose: () => void; onToast: (m: string) => void }) {
  const [text, setText] = useState('')
  const [creator, setCreator] = useState('')
  const [link, setLink] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const jamo = decompose(text)
  const ready = jamo.length === WORD_LENGTH && creator.trim().length > 0

  const make = async () => {
    setChecking(true)
    try {
      const valid = await checkWord(jamo.join(''))
      if (!valid) {
        onToast('아, 목록에 단어가 없네요.')
        return
      }
      setLink(customLink(encodeCustom(jamo, creator)))
    } catch {
      // 사전 확인이 안 되면 그냥 만든다. 친구끼리는 없는 말도 낼 수 있다
      setLink(customLink(encodeCustom(jamo, creator)))
    } finally {
      setChecking(false)
    }
  }

  const copy = async () => {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      onToast('문제 주소가 복사되었어요.')
    } catch {
      onToast('복사하지 못했어요.')
    }
  }

  return (
    <WordModal title="문제 만들기" onClose={onClose}>
      <p className="word-create-hint">"글딱지"를 만들어 함께 풀어보세요. 자모 여섯 개짜리 단어여야 합니다.</p>
      <label className="word-create-field">
        <span>단어</span>
        <input
          className="input"
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setLink(null)
          }}
          placeholder="예: 입술"
          maxLength={6}
        />
        <small className="word-create-jamo">{jamo.length > 0 ? `${jamo.join(' ')} (${jamo.length}/6)` : ' '}</small>
      </label>
      <label className="word-create-field">
        <span>제작자</span>
        <input
          className="input"
          value={creator}
          onChange={(e) => {
            setCreator(e.target.value)
            setLink(null)
          }}
          placeholder="이름"
          maxLength={12}
        />
      </label>
      {link ? (
        <div className="word-create-link">
          <code>{link}</code>
          <button type="button" className="btn" onClick={() => void copy()}>
            문제 주소 복사
          </button>
        </div>
      ) : (
        <button type="button" className="btn" disabled={!ready || checking} onClick={() => void make()}>
          만들기
        </button>
      )}
    </WordModal>
  )
}
