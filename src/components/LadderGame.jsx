import { useState, useRef, useEffect } from 'react'
import './LadderGame.css'

const MAX_PLAYERS = 6
const RUNG_CHANCE = 0.45
const COLORS = ['#e8623a','#4a9eff','#2ec87a','#f5a623','#c84aff','#ff4a8d']

function buildLadder(n, rows) {
  const rungs = Array.from({ length: rows }, () => Array(n - 1).fill(false))
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < n - 1; c++) {
      if (!rungs[r][c - 1] && Math.random() < RUNG_CHANCE) {
        rungs[r][c] = true
        c++ // skip next to avoid adjacent rungs
      }
    }
  }
  return rungs
}

function solvePath(col, rungs) {
  const rows = rungs.length
  let c = col
  const path = [{ r: -1, c }]
  for (let r = 0; r < rows; r++) {
    path.push({ r, c })
    if (rungs[r][c]) { c += 1 }
    else if (c > 0 && rungs[r][c - 1]) { c -= 1 }
    path.push({ r, c })
  }
  path.push({ r: rows, c })
  return { path, result: c }
}

export default function LadderGame({ onBack }) {
  const [names, setNames] = useState(['', '', ''])
  const [phase, setPhase] = useState('setup') // setup | playing | done
  const [ladder, setLadder] = useState(null)
  const [results, setResults] = useState(null)
  const [revealed, setRevealed] = useState([])
  const [animating, setAnimating] = useState(false)
  const canvasRef = useRef()

  const n = names.length
  const ROWS = 14

  function addPlayer() {
    if (names.length < MAX_PLAYERS) setNames(p => [...p, ''])
  }
  function removePlayer(i) {
    if (names.length > 2) setNames(p => p.filter((_, idx) => idx !== i))
  }
  function setName(i, v) {
    setNames(p => p.map((n, idx) => idx === i ? v : n))
  }

  function start() {
    const rungs = buildLadder(n, ROWS)
    const res = names.map((_, i) => solvePath(i, rungs))
    setLadder(rungs)
    setResults(res)
    setRevealed([])
    setPhase('playing')
  }

  useEffect(() => {
    if (phase !== 'playing' || !ladder) return
    drawLadder()
  }, [phase, ladder, revealed])

  function drawLadder() {
    const canvas = canvasRef.current
    if (!canvas) return
    const W = canvas.width
    const H = canvas.height
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const PAD_X = 40
    const TOP = 60
    const BOT = H - 60
    const colW = (W - PAD_X * 2) / (n - 1)
    const rowH = (BOT - TOP) / ROWS

    const cx = i => PAD_X + i * colW

    // vertical lines
    for (let i = 0; i < n; i++) {
      ctx.strokeStyle = COLORS[i]
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(cx(i), TOP)
      ctx.lineTo(cx(i), BOT)
      ctx.stroke()
    }

    // rungs
    ctx.strokeStyle = '#ccc'
    ctx.lineWidth = 2.5
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < n - 1; c++) {
        if (ladder[r][c]) {
          const y = TOP + r * rowH + rowH / 2
          ctx.beginPath()
          ctx.moveTo(cx(c), y)
          ctx.lineTo(cx(c + 1), y)
          ctx.stroke()
        }
      }
    }

    // animate revealed paths
    revealed.forEach(idx => {
      const { path } = results[idx]
      ctx.strokeStyle = COLORS[idx]
      ctx.lineWidth = 4
      ctx.setLineDash([6, 3])
      ctx.beginPath()
      path.forEach(({ r, c }, i) => {
        const y = r === -1 ? TOP : r === ROWS ? BOT : TOP + r * rowH + rowH / 2
        const x = cx(c)
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])
    })

    // player labels (top)
    names.forEach((name, i) => {
      ctx.fillStyle = COLORS[i]
      ctx.font = 'bold 13px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(name || `P${i + 1}`, cx(i), TOP - 12)
    })

    // bottom labels
    const resultCols = results ? results.map(r => r.result) : []
    for (let i = 0; i < n; i++) {
      const isLoser = revealed.some(ri => results[ri].result === i)
      ctx.font = isLoser ? 'bold 15px system-ui' : '13px system-ui'
      ctx.fillStyle = isLoser ? '#e8623a' : '#aaa'
      ctx.textAlign = 'center'
      ctx.fillText(isLoser ? '☕' : '?', cx(i), BOT + 22)
    }
  }

  function revealAll() {
    if (animating) return
    setAnimating(true)
    let i = 0
    const interval = setInterval(() => {
      setRevealed(prev => [...prev, i])
      i++
      if (i >= n) {
        clearInterval(interval)
        setAnimating(false)
        setPhase('done')
      }
    }, 600)
  }

  function reset() {
    setPhase('setup')
    setLadder(null)
    setResults(null)
    setRevealed([])
  }

  const loserIdx = phase === 'done' && results
    ? results.findIndex((_, i) => results.find(r => r.result === i) && names[results.find((_,j) => results[j].result === i && j === results.findIndex(r => r.result === i)) || 0])
    : -1

  const coffeePlayer = phase === 'done' && results
    ? (() => {
        // find who ends up at some column — pick the loser as col 0 or random
        // Actually just pick a random loser among all bottom positions
        // The "loser" is whoever the group decides — let's say position 0 = coffee
        const coffeeCol = 0
        const playerIdx = results.findIndex(r => r.result === coffeeCol)
        return names[playerIdx] || `P${playerIdx + 1}`
      })()
    : null

  return (
    <div className="ladder-root">
      <div className="ladder-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span>사다리타기</span>
      </div>

      {phase === 'setup' && (
        <div className="ladder-setup">
          <p className="setup-hint">참가자 이름을 입력하세요</p>
          <div className="player-list">
            {names.map((name, i) => (
              <div key={i} className="player-row">
                <span className="player-dot" style={{ background: COLORS[i] }} />
                <input
                  className="player-input"
                  value={name}
                  onChange={e => setName(i, e.target.value)}
                  placeholder={`참가자 ${i + 1}`}
                  maxLength={8}
                />
                {names.length > 2 && (
                  <button className="remove-btn" onClick={() => removePlayer(i)}>✕</button>
                )}
              </div>
            ))}
          </div>
          {names.length < MAX_PLAYERS && (
            <button className="add-btn" onClick={addPlayer}>+ 추가</button>
          )}
          <button className="start-btn" onClick={start}>사다리 시작!</button>
        </div>
      )}

      {(phase === 'playing' || phase === 'done') && (
        <div className="ladder-play">
          <canvas
            ref={canvasRef}
            className="ladder-canvas"
            width={360}
            height={500}
          />
          {phase === 'playing' && (
            <button className="reveal-btn" onClick={revealAll} disabled={animating}>
              {animating ? '경로 확인 중...' : '경로 공개!'}
            </button>
          )}
          {phase === 'done' && (
            <div className="ladder-result">
              <div className="result-coffee-text">☕ {coffeePlayer} 커피 쏘세요!</div>
              <button className="start-btn" onClick={reset}>다시하기</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
