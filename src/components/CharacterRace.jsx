import { useState, useRef, useEffect, useCallback } from 'react'
import './CharacterRace.css'

const CHARACTERS = ['🐢','🐇','🦊','🐻','🐼','🐨']
const COLORS = ['#e8623a','#4a9eff','#2ec87a','#f5a623','#c84aff','#ff4a8d']
const MAX_PLAYERS = 6

export default function CharacterRace({ onBack }) {
  const [players, setPlayers] = useState([
    { name: '', char: '🐢' },
    { name: '', char: '🐇' },
  ])
  const [phase, setPhase] = useState('setup') // setup | racing | done
  const [winner, setWinner] = useState(null)
  const canvasRef = useRef()
  const animRef = useRef()
  const posRef = useRef([])
  const speedRef = useRef([])

  const n = players.length

  function addPlayer() {
    if (players.length < MAX_PLAYERS) {
      const idx = players.length
      setPlayers(p => [...p, { name: '', char: CHARACTERS[idx % CHARACTERS.length] }])
    }
  }
  function removePlayer(i) {
    if (players.length > 2) setPlayers(p => p.filter((_, idx) => idx !== i))
  }
  function setPlayerName(i, v) {
    setPlayers(p => p.map((pl, idx) => idx === i ? { ...pl, name: v } : pl))
  }
  function setPlayerChar(i, c) {
    setPlayers(p => p.map((pl, idx) => idx === i ? { ...pl, char: c } : pl))
  }

  function startRace() {
    posRef.current = players.map(() => 0)
    speedRef.current = players.map(() => 0)
    setWinner(null)
    setPhase('racing')
  }

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const TRACK_H = H / n
    const FINISH = W - 50

    ctx.clearRect(0, 0, W, H)

    // background
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)

    // finish line
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'
    ctx.lineWidth = 2
    ctx.setLineDash([6, 4])
    ctx.beginPath()
    ctx.moveTo(FINISH, 0)
    ctx.lineTo(FINISH, H)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('FINISH', FINISH, 14)

    players.forEach((pl, i) => {
      const trackY = i * TRACK_H
      const centerY = trackY + TRACK_H / 2

      // lane separator
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 1
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(0, trackY)
        ctx.lineTo(W, trackY)
        ctx.stroke()
      }

      // name label
      ctx.fillStyle = COLORS[i]
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'left'
      ctx.fillText(pl.name || `P${i+1}`, 8, centerY + 4)

      // character
      const x = 60 + posRef.current[i] * (FINISH - 60)
      ctx.font = `${TRACK_H * 0.6}px serif`
      ctx.textAlign = 'center'
      ctx.fillText(pl.char, x, centerY + TRACK_H * 0.22)
    })
  }, [players])

  useEffect(() => {
    if (phase !== 'racing') return

    let done = false

    function tick() {
      if (done) return
      const FINISH_THRESHOLD = 1.0

      players.forEach((_, i) => {
        const baseSpeed = 0.002 + Math.random() * 0.006
        const surge = Math.random() < 0.03 ? 0.015 : 0
        speedRef.current[i] = baseSpeed + surge
        posRef.current[i] = Math.min(posRef.current[i] + speedRef.current[i], FINISH_THRESHOLD)
      })

      draw()

      const finishedIdx = posRef.current.findIndex(p => p >= FINISH_THRESHOLD)
      if (finishedIdx !== -1) {
        done = true
        setWinner(finishedIdx)
        setPhase('done')
        return
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => {
      done = true
      cancelAnimationFrame(animRef.current)
    }
  }, [phase, draw, players])

  useEffect(() => {
    if (phase === 'done') draw()
  }, [phase, draw])

  function reset() {
    cancelAnimationFrame(animRef.current)
    setPhase('setup')
    setWinner(null)
  }

  return (
    <div className="race-root">
      <div className="race-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span>캐릭터 경주</span>
      </div>

      {phase === 'setup' && (
        <div className="race-setup">
          <p className="setup-hint">캐릭터를 선택하세요</p>
          <div className="player-list">
            {players.map((pl, i) => (
              <div key={i} className="race-player-row">
                <span className="player-dot" style={{ background: COLORS[i] }} />
                <input
                  className="player-input"
                  value={pl.name}
                  onChange={e => setPlayerName(i, e.target.value)}
                  placeholder={`참가자 ${i + 1}`}
                  maxLength={8}
                />
                <div className="char-picker">
                  {CHARACTERS.map(c => (
                    <button
                      key={c}
                      className={`char-btn ${pl.char === c ? 'selected' : ''}`}
                      onClick={() => setPlayerChar(i, c)}
                    >{c}</button>
                  ))}
                </div>
                {players.length > 2 && (
                  <button className="remove-btn" onClick={() => removePlayer(i)}>✕</button>
                )}
              </div>
            ))}
          </div>
          {players.length < MAX_PLAYERS && (
            <button className="add-btn" onClick={addPlayer}>+ 추가</button>
          )}
          <button className="start-btn" onClick={startRace}>경주 시작!</button>
        </div>
      )}

      {(phase === 'racing' || phase === 'done') && (
        <div className="race-play">
          <canvas
            ref={canvasRef}
            className="race-canvas"
            width={360}
            height={Math.max(240, n * 72)}
          />
          {phase === 'done' && winner !== null && (
            <div className="race-result">
              <div className="race-winner-icon">{players[winner].char}</div>
              <div className="race-winner-text">
                {players[winner].name || `P${winner + 1}`} 1등!<br />
                <span className="race-loser-text">꼴찌가 커피 쏩니다 ☕</span>
              </div>
              <button className="start-btn" onClick={reset}>다시하기</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
