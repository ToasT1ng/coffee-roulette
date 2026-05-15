import { useState, useRef, useEffect, useCallback } from 'react'
import './FingerPicker.css'

const CHARACTERS = ['🐢','🐇','🦊','🐻','🐼','🐨','🐱','🐶']
const HOLD_MS = 700

function pickChar(currentTouches) {
  const used = new Set(Object.values(currentTouches).map(t => t.char))
  const available = CHARACTERS.filter(c => !used.has(c))
  const pool = available.length > 0 ? available : CHARACTERS
  return pool[Math.floor(Math.random() * pool.length)]
}

export default function FingerPicker({ onBack }) {
  const [phase, setPhase] = useState('waiting')
  const [touches, setTouches] = useState({})
  const [countdown, setCountdown] = useState(3)
  const [winner, setWinner] = useState(null)
  const holdTimer = useRef(null)
  const countdownTimer = useRef(null)
  const mouseDownRef = useRef(false)

  const reset = () => {
    clearTimeout(holdTimer.current)
    clearInterval(countdownTimer.current)
    setPhase('waiting')
    setTouches({})
    setCountdown(3)
    setWinner(null)
  }

  const startCountdown = useCallback((currentTouches) => {
    setPhase('countdown')
    let c = 3
    setCountdown(c)
    countdownTimer.current = setInterval(() => {
      c -= 1
      setCountdown(c)
      if (c <= 0) {
        clearInterval(countdownTimer.current)
        const ids = Object.keys(currentTouches)
        const winnerId = ids[Math.floor(Math.random() * ids.length)]
        setTouches(prev => {
          const next = {}
          ids.forEach(id => {
            next[id] = { ...prev[id], eliminated: id !== winnerId }
          })
          return next
        })
        setWinner(currentTouches[winnerId])
        setPhase('result')
      }
    }, 1000)
  }, [])

  const handleTouchStart = useCallback((e) => {
    if (phase === 'result') return
    e.preventDefault()

    clearTimeout(holdTimer.current)
    clearInterval(countdownTimer.current)
    if (phase === 'countdown') setPhase('waiting')

    const rect = e.currentTarget.getBoundingClientRect()
    let newTouches = { ...touches }

    Array.from(e.changedTouches).forEach(t => {
      if (!newTouches[t.identifier]) {
        newTouches[t.identifier] = {
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
          char: pickChar(newTouches),
          eliminated: false,
        }
      }
    })
    setTouches(newTouches)

    if (Object.keys(newTouches).length >= 2) {
      holdTimer.current = setTimeout(() => startCountdown(newTouches), HOLD_MS)
    }
  }, [phase, touches, startCountdown])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    if (phase === 'result') return
    const rect = e.currentTarget.getBoundingClientRect()
    setTouches(prev => {
      const next = { ...prev }
      Array.from(e.changedTouches).forEach(t => {
        if (next[t.identifier]) {
          next[t.identifier] = {
            ...next[t.identifier],
            x: t.clientX - rect.left,
            y: t.clientY - rect.top,
          }
        }
      })
      return next
    })
    if (phase === 'waiting' && Object.keys(touches).length >= 2) {
      clearTimeout(holdTimer.current)
      holdTimer.current = setTimeout(() => startCountdown(touches), HOLD_MS)
    }
  }, [phase, touches, startCountdown])

  const handleTouchEnd = useCallback((e) => {
    if (phase === 'result') return
    e.preventDefault()

    clearTimeout(holdTimer.current)
    clearInterval(countdownTimer.current)

    const newTouches = { ...touches }
    Array.from(e.changedTouches).forEach(t => {
      delete newTouches[t.identifier]
    })
    setTouches(newTouches)
    if (phase === 'countdown') setPhase('waiting')
  }, [phase, touches])

  const handleMouseMove = useCallback((e) => {
    if (!mouseDownRef.current || phase === 'result') return
    const rect = e.currentTarget.getBoundingClientRect()
    setTouches(prev => {
      if (!prev['mouse']) return prev
      return {
        ...prev,
        mouse: { ...prev['mouse'], x: e.clientX - rect.left, y: e.clientY - rect.top },
      }
    })
    if (phase === 'waiting' && Object.keys(touches).length >= 2) {
      clearTimeout(holdTimer.current)
      holdTimer.current = setTimeout(() => startCountdown(touches), HOLD_MS)
    }
  }, [phase, touches, startCountdown])

  // Mouse support for PC testing
  const handleMouseDown = useCallback((e) => {
    if (e.target.tagName === 'BUTTON') return
    if (phase === 'result') return
    mouseDownRef.current = true

    clearTimeout(holdTimer.current)
    clearInterval(countdownTimer.current)
    if (phase === 'countdown') setPhase('waiting')

    const rect = e.currentTarget.getBoundingClientRect()
    const newTouches = { ...touches }
    if (!newTouches['mouse']) {
      newTouches['mouse'] = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        char: pickChar(newTouches),
        eliminated: false,
      }
    }
    setTouches(newTouches)

    if (Object.keys(newTouches).length >= 2) {
      holdTimer.current = setTimeout(() => startCountdown(newTouches), HOLD_MS)
    }
  }, [phase, touches, startCountdown])

  const handleMouseUp = useCallback((e) => {
    mouseDownRef.current = false
    if (e.target.tagName === 'BUTTON') return
    if (phase === 'result') return

    clearTimeout(holdTimer.current)
    clearInterval(countdownTimer.current)

    const newTouches = { ...touches }
    delete newTouches['mouse']
    setTouches(newTouches)
    if (phase === 'countdown') setPhase('waiting')
  }, [phase, touches])

  useEffect(() => () => {
    clearTimeout(holdTimer.current)
    clearInterval(countdownTimer.current)
  }, [])

  const touchCount = Object.keys(touches).length

  return (
    <div className="finger-root">
      <div className="finger-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span>터치 추첨</span>
      </div>

      <div
        className="finger-arena"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {phase === 'waiting' && touchCount === 0 && (
          <div className="finger-hint">
            <div className="hint-icon">👆</div>
            <p>모두 손가락을 화면에 올려주세요</p>
            <p className="hint-sub">2명 이상이면 자동으로 시작</p>
          </div>
        )}

        {phase === 'waiting' && touchCount === 1 && (
          <div className="finger-hint">
            <div className="hint-icon">👇</div>
            <p>한 명 더 올려주세요!</p>
          </div>
        )}


        {phase === 'countdown' && (
          <div className="countdown-overlay">
            <div className="countdown-number">{countdown}</div>
          </div>
        )}

        {phase === 'result' && winner && (
          <div className="result-overlay">
            <div className="result-coffeeicon">☕</div>
            <div className="result-text">커피 쏘세요!</div>
            <button className="retry-btn" onClick={reset}>다시하기</button>
          </div>
        )}

        {Object.entries(touches).map(([id, t]) => (
          <div
            key={id}
            className={`touch-char ${t.eliminated ? 'eliminated' : ''} ${phase === 'result' && !t.eliminated ? 'winner-char' : ''}`}
            style={{ left: t.x, top: t.y }}
          >
            {t.char}
          </div>
        ))}
      </div>
    </div>
  )
}
