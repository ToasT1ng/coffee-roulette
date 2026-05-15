import { useState, useRef, useEffect, useCallback } from 'react'
import './LadderGame.css'

const CHARACTERS = ['🐢','🐇','🦊','🐻','🐼','🐨','🐱','🐶']
const CHAR_COLORS = {
  '🐢': '#3dba6f',
  '🐇': '#f0ece4',
  '🦊': '#e8733a',
  '🐻': '#8b5e3c',
  '🐼': '#b0b0b0',
  '🐨': '#9e9e9e',
  '🐱': '#f5a623',
  '🐶': '#c8a060',
}
const MAX_PLAYERS = 8
const RUNG_CHANCE = 0.45
const ROWS = 14
const ANIM_SPEED = 0.00238

function buildLadder(n) {
  const rungs = Array.from({ length: ROWS }, () => Array(n - 1).fill(false))
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < n - 1; c++) {
      if (!rungs[r][c - 1] && Math.random() < RUNG_CHANCE) {
        rungs[r][c] = true
        c++
      }
    }
  }
  return rungs
}

function solvePath(col, rungs) {
  let c = col
  const path = [{ r: -1, c }]
  for (let r = 0; r < ROWS; r++) {
    path.push({ r, c })
    if (rungs[r][c]) c += 1
    else if (c > 0 && rungs[r][c - 1]) c -= 1
    path.push({ r, c })
  }
  path.push({ r: ROWS, c })
  return { path, result: c }
}

function pathPos(path, t, cx, getY) {
  const progress = t * (path.length - 1)
  const idx = Math.min(Math.floor(progress), path.length - 2)
  const frac = progress - idx
  const p1 = path[idx]
  const p2 = path[idx + 1]
  return {
    x: cx(p1.c) + (cx(p2.c) - cx(p1.c)) * frac,
    y: getY(p1.r) + (getY(p2.r) - getY(p1.r)) * frac,
  }
}

export default function LadderGame({ onBack }) {
  const [players, setPlayers] = useState([{ char: '🐢' }, { char: '🐇' }, { char: '🦊' }])
  const [phase, setPhase] = useState('setup')
  const [ladder, setLadder] = useState(null)
  const [results, setResults] = useState(null)
  const [coffeeCol, setCoffeeCol] = useState(0)
  const canvasRef = useRef()
  const animRef = useRef()
  const progressRef = useRef(0)

  const n = players.length
  const loser = phase === 'done' && results
    ? results.findIndex(r => r.result === coffeeCol)
    : null

  function addPlayer() {
    if (players.length < MAX_PLAYERS) {
      const taken = players.map(p => p.char)
      const next = CHARACTERS.find(c => !taken.includes(c)) || CHARACTERS[0]
      setPlayers(p => [...p, { char: next }])
    }
  }
  function removePlayer(i) {
    if (players.length > 2) setPlayers(p => p.filter((_, idx) => idx !== i))
  }
  function setPlayerChar(i, c) {
    setPlayers(p => p.map((pl, idx) => idx === i ? { ...pl, char: c } : pl))
  }

  function start() {
    const rungs = buildLadder(n)
    const res = players.map((_, i) => solvePath(i, rungs))
    const col = Math.floor(Math.random() * n)
    setLadder(rungs)
    setResults(res)
    setCoffeeCol(col)
    setPhase('playing')
  }

  const draw = useCallback((t) => {
    const canvas = canvasRef.current
    if (!canvas || !ladder || !results) return
    const W = canvas.width
    const H = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const PAD_X = 28
    const TOP = 52
    const BOT = H - 52
    const colW = (W - PAD_X * 2) / (n - 1)
    const rowH = (BOT - TOP) / ROWS
    const cx = i => PAD_X + i * colW
    const getY = r => r === -1 ? TOP : r === ROWS ? BOT : TOP + r * rowH + rowH / 2

    // vertical lines
    for (let i = 0; i < n; i++) {
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx(i), TOP)
      ctx.lineTo(cx(i), BOT)
      ctx.stroke()
    }

    // rungs
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < n - 1; c++) {
        if (ladder[r][c]) {
          const y = TOP + r * rowH + rowH / 2
          ctx.strokeStyle = 'rgba(255,255,255,0.32)'
          ctx.lineWidth = 2.5
          ctx.beginPath()
          ctx.moveTo(cx(c), y)
          ctx.lineTo(cx(c + 1), y)
          ctx.stroke()
        }
      }
    }

    // top character emojis
    players.forEach((pl, i) => {
      ctx.font = '34px serif'
      ctx.textAlign = 'center'
      ctx.fillText(pl.char, cx(i), TOP - 6)
    })

    // bottom labels
    for (let i = 0; i < n; i++) {
      const isDone = t >= 1
      const isCoffee = i === coffeeCol
      ctx.font = '14px system-ui'
      ctx.fillStyle = isDone && isCoffee ? '#e8623a'
        : isDone ? 'rgba(255,255,255,0.6)'
        : 'rgba(255,255,255,0.25)'
      ctx.textAlign = 'center'
      ctx.fillText(isDone ? (isCoffee ? '☕' : '✓') : '?', cx(i), BOT + 26)
    }

    if (t <= 0) return

    // trails first, then characters on top
    results.forEach((res, i) => {
      const { path } = res
      const trailPoints = Math.floor(t * (path.length - 1)) + 1
      ctx.strokeStyle = CHAR_COLORS[players[i].char] ?? '#ffffff'
      ctx.lineWidth = 3
      ctx.beginPath()
      for (let p = 0; p < trailPoints; p++) {
        const x = cx(path[p].c)
        const y = getY(path[p].r)
        if (p === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    })

    results.forEach((res, i) => {
      const { path } = res
      const pos = pathPos(path, t, cx, getY)
      ctx.fillStyle = '#fff'
      ctx.font = '36px serif'
      ctx.textAlign = 'center'
      ctx.fillText(players[i].char, Math.round(pos.x), Math.round(pos.y + 10))
    })
  }, [ladder, results, coffeeCol, players, n])

  useEffect(() => {
    if (phase !== 'playing') return
    draw(0)
    const timer = setTimeout(() => {
      progressRef.current = 0
      setPhase('animating')
    }, 2000)
    return () => clearTimeout(timer)
  }, [phase, draw])

  useEffect(() => {
    if (phase !== 'animating') return

    function animate() {
      progressRef.current = Math.min(progressRef.current + ANIM_SPEED, 1)
      draw(progressRef.current)
      if (progressRef.current < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        setPhase('done')
      }
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, draw])

  useEffect(() => {
    if (phase === 'done') draw(1)
  }, [phase, draw])

  function reset() {
    cancelAnimationFrame(animRef.current)
    setPhase('setup')
    setLadder(null)
    setResults(null)
  }

  return (
    <div className="ladder-root">
      <div className="ladder-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span>사다리 게임</span>
      </div>

      {phase === 'setup' && (
        <div className="ladder-setup">
          <p className="setup-hint">캐릭터를 선택하세요</p>
          <div className="player-list">
            {players.map((pl, i) => (
              <div key={i} className="ladder-player-card">
                {players.length > 2 && (
                  <button className="remove-btn" onClick={() => removePlayer(i)}>✕</button>
                )}
                <div className="char-picker">
                  {CHARACTERS.map(c => {
                    const takenByOther = players.some((p, j) => j !== i && p.char === c)
                    return (
                      <button
                        key={c}
                        className={`char-btn ${pl.char === c ? 'selected' : ''} ${takenByOther ? 'taken' : ''}`}
                        onClick={() => !takenByOther && setPlayerChar(i, c)}
                      >{c}</button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
          {players.length < MAX_PLAYERS && (
            <button className="add-btn" onClick={addPlayer}>+ 추가</button>
          )}
          <button className="start-btn" onClick={start}>사다리 시작!</button>
        </div>
      )}

      {(phase === 'playing' || phase === 'animating' || phase === 'done') && (
        <div className="ladder-play">
          <canvas ref={canvasRef} className="ladder-canvas" width={360} height={500} />

          {phase === 'playing' && (
            <div className="ladder-start-overlay">
              <p className="ladder-start-text">Game Start!</p>
            </div>
          )}

          {phase === 'done' && loser !== null && loser >= 0 && (
            <div className="ladder-overlay" onClick={reset}>
              <div className="ladder-verdict">
                <span className="verdict-char">{players[loser].char}</span>
                <span className="verdict-badge">☕</span>
              </div>
              <p className="verdict-text">커피 쏘세요!</p>
              <p className="verdict-sub">탭해서 다시하기</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
