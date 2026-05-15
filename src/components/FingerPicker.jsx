import { useState, useRef, useEffect, useCallback } from 'react'
import './FingerPicker.css'

const COLORS = ['#e8623a','#4a9eff','#2ec87a','#f5a623','#c84aff','#ff4a8d','#00bcd4','#8bc34a']
const HOLD_MS = 2000

export default function FingerPicker({ onBack }) {
  const [phase, setPhase] = useState('waiting') // waiting | countdown | result
  const [touches, setTouches] = useState({})    // id -> {x,y,color,eliminated}
  const [countdown, setCountdown] = useState(3)
  const [winner, setWinner] = useState(null)
  const holdTimer = useRef(null)
  const countdownTimer = useRef(null)
  const colorIdx = useRef(0)

  const reset = () => {
    clearTimeout(holdTimer.current)
    clearInterval(countdownTimer.current)
    setPhase('waiting')
    setTouches({})
    setCountdown(3)
    setWinner(null)
    colorIdx.current = 0
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
    const newTouches = { ...touches }

    Array.from(e.changedTouches).forEach(t => {
      if (!newTouches[t.identifier]) {
        newTouches[t.identifier] = {
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
          color: COLORS[colorIdx.current % COLORS.length],
          eliminated: false,
        }
        colorIdx.current += 1
      }
    })
    setTouches(newTouches)

    if (Object.keys(newTouches).length >= 2) {
      holdTimer.current = setTimeout(() => startCountdown(newTouches), HOLD_MS)
    }
  }, [phase, touches, startCountdown])

  const handleTouchEnd = useCallback((e) => {
    if (phase === 'result' || phase === 'countdown') return
    e.preventDefault()

    clearTimeout(holdTimer.current)
    const newTouches = { ...touches }
    Array.from(e.changedTouches).forEach(t => {
      delete newTouches[t.identifier]
    })
    setTouches(newTouches)
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
        onTouchMove={e => e.preventDefault()}
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
            className={`touch-circle ${t.eliminated ? 'eliminated' : ''} ${phase === 'result' && !t.eliminated ? 'winner-circle' : ''}`}
            style={{
              left: t.x,
              top: t.y,
              background: t.color,
            }}
          />
        ))}
      </div>

      {phase === 'waiting' && touchCount >= 2 && (
        <div className="finger-status">
          {touchCount}명 대기 중 — 손 떼지 마세요!
        </div>
      )}
    </div>
  )
}
