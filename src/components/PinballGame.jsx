import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import './PinballGame.css'

const CHARACTERS = ['🐢','🐇','🦊','🐻','🐼','🐨','🐱','🐶']
const MAX_PLAYERS = 8
const GRAVITY = 0.178
const DAMPING = 0.62
const PEG_R = 6
const PAD_X = 24
const W = 360
const H = 720
const H_WORLD = 1680
const DEATH_Y = H_WORLD + 60
const FUNNEL_START_Y = 1100  // pegs end, funnel begins
const FUNNEL_MIN_W = 80      // final funnel opening width
const PADDLE_R = 6
const PADDLES = [
  { x: W / 2, y: 380,  speed:  0.020, len: 120 },
  { x: W / 2, y: 750,  speed: -0.026, len: 120 },
  { x: W / 2, y: 1250, speed:  0.024, len: 110 },
  { x: W / 2, y: 1480, speed: -0.030, len: 68 },
  { x: W / 2, y: 1610, speed:  0.036, len: 55 },
]

const CHAR_RADIUS = {
  '🐢': 12, '🐇': 12, '🦊': 12, '🐻': 12,
  '🐼': 12, '🐨': 12, '🐱': 12, '🐶': 12,
}

function getWalls(y) {
  if (y <= FUNNEL_START_Y) return { left: PAD_X, right: W - PAD_X }
  const t = Math.min((y - FUNNEL_START_Y) / (H_WORLD - FUNNEL_START_Y), 1)
  const maxInset = W / 2 - FUNNEL_MIN_W / 2 - PAD_X
  return {
    left: PAD_X + t * maxInset,
    right: W - PAD_X - t * maxInset,
  }
}

function buildPegs() {
  const pegs = []
  const rowH = 36

  // Upper section: step=40 그대로, 중심을 W/2=180에 맞춰 좌우 대칭
  // Even 7pegs: span=240, startX=180-120=60 → gaps 36px both sides
  // Odd  6pegs: span=200, startX=180-100=80 → gaps 56px both sides
  const upperRows = Math.floor((FUNNEL_START_Y - 80) / rowH)
  for (let r = 0; r < upperRows; r++) {
    const y = 80 + r * rowH
    const isEven = r % 2 === 0
    const cols = isEven ? 7 : 6
    const startX = isEven ? 60 : 80
    for (let c = 0; c < cols; c++) {
      pegs.push({ x: startX + c * 40, y })
    }
  }

  // Funnel section: step=40, 벽이 좁아지는 만큼 열 수 줄어듦
  for (let r = 0; r < 30; r++) {
    const y = FUNNEL_START_Y + rowH + r * rowH
    if (y >= H_WORLD - rowH) break
    const { left: wl, right: wr } = getWalls(y)
    const margin = 10
    const availW = wr - wl - 2 * margin
    if (availW < 40) break
    const isEven = r % 2 === 0
    const cols = Math.max(2, Math.round(availW / 40) + (isEven ? 0 : -1))
    for (let c = 0; c < cols; c++) {
      pegs.push({ x: Math.round(wl + margin + c * (availW / (cols - 1))), y })
    }
  }

  return pegs
}

const PEGS = buildPegs()

function createBalls(players, ballCount) {
  const balls = []
  const usableW = W - PAD_X * 2 - 40
  const total = players.length * ballCount
  // Interleave players so x positions are spread: p0b0, p1b0, p2b0, p0b1, ...
  let idx = 0
  for (let b = 0; b < ballCount; b++) {
    for (let p = 0; p < players.length; p++) {
      const char = players[p].char
      const r = CHAR_RADIUS[char] ?? 11
      const xBase = PAD_X + 20 + (total > 1 ? (idx / (total - 1)) * usableW : usableW / 2)
      balls.push({
        x: xBase + (Math.random() - 0.5) * 14,
        y: -10 + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1 + Math.random() * 0.5,
        r,
        char,
        playerIdx: p,
        alive: true,
        diedAt: 0,
      })
      idx++
    }
  }
  return balls
}


function resolvePeg(ball, peg) {
  const dx = ball.x - peg.x
  const dy = ball.y - peg.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = ball.r + PEG_R
  if (dist >= minDist || dist === 0) return
  const nx = dx / dist, ny = dy / dist
  ball.x += nx * (minDist - dist)
  ball.y += ny * (minDist - dist)
  const dot = ball.vx * nx + ball.vy * ny
  ball.vx = (ball.vx - 2 * dot * nx) * DAMPING
  ball.vy = (ball.vy - 2 * dot * ny) * DAMPING
  ball.vx += (Math.random() - 0.5) * 0.6
  if (ball.vy < 0.5) ball.vy = 0.5
}

function resolveBallPair(b1, b2) {
  const dx = b2.x - b1.x
  const dy = b2.y - b1.y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const minDist = b1.r + b2.r
  if (dist >= minDist || dist === 0) return
  const nx = dx / dist, ny = dy / dist
  const overlap = (minDist - dist) / 2
  b1.x -= nx * overlap
  b1.y -= ny * overlap
  b2.x += nx * overlap
  b2.y += ny * overlap
  const dvn = (b1.vx - b2.vx) * nx + (b1.vy - b2.vy) * ny
  if (dvn > 0) {
    b1.vx -= dvn * nx * DAMPING
    b1.vy -= dvn * ny * DAMPING
    b2.vx += dvn * nx * DAMPING
    b2.vy += dvn * ny * DAMPING
  }
}

export default function PinballGame({ onBack }) {
  const [players, setPlayers] = useState([{ char: '🐢' }, { char: '🐇' }, { char: '🦊' }])
  const [ballCount, setBallCount] = useState(10)
  const [phase, setPhase] = useState('setup')
  const [loserIdx, setLoserIdx] = useState(null)
  const [aliveCounts, setAliveCounts] = useState({})
  const canvasRef = useRef()
  const playRef = useRef()
  const canvasHRef = useRef(H)
  const [canvasH, setCanvasH] = useState(H)
  const animRef = useRef()
  const ballsRef = useRef([])
  const cameraRef = useRef(0)
  const paddleAnglesRef = useRef(PADDLES.map((_, i) => i * Math.PI / 2))
  const survivorRef = useRef(null)

  useLayoutEffect(() => {
    const el = playRef.current
    if (!el) return
    const update = () => {
      const h = el.clientHeight
      if (h > 0) { canvasHRef.current = h; setCanvasH(h) }
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  function startGame() {
    ballsRef.current = createBalls(players, ballCount)
    cameraRef.current = 0
    survivorRef.current = null
    paddleAnglesRef.current = PADDLES.map((_, i) => i * Math.PI / 2)
    const counts = {}
    players.forEach((_, i) => { counts[i] = ballCount })
    setAliveCounts(counts)
    setLoserIdx(null)
    setPhase('playing')
  }

  function reset() {
    cancelAnimationFrame(animRef.current)
    ballsRef.current = []
    cameraRef.current = 0
    survivorRef.current = null
    paddleAnglesRef.current = PADDLES.map((_, i) => i * Math.PI / 2)
    setAliveCounts({})
    setPhase('setup')
    setLoserIdx(null)
  }

  const draw = useCallback((balls, cameraY = 0) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, canvasHRef.current)

    ctx.save()
    ctx.translate(0, -cameraY)

    // Full walls: straight section → funnel (connected path per side)
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(PAD_X, 0)
    ctx.lineTo(PAD_X, FUNNEL_START_Y)
    ctx.lineTo(W / 2 - FUNNEL_MIN_W / 2, H_WORLD)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(W - PAD_X, 0)
    ctx.lineTo(W - PAD_X, FUNNEL_START_Y)
    ctx.lineTo(W / 2 + FUNNEL_MIN_W / 2, H_WORLD)
    ctx.stroke()

    // Rotating paddles
    PADDLES.forEach((paddle, pi) => {
      const angle = paddleAnglesRef.current[pi]
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const hx = cos * paddle.len / 2, hy = sin * paddle.len / 2
      ctx.strokeStyle = '#f5c518'
      ctx.lineWidth = PADDLE_R * 2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(paddle.x - hx, paddle.y - hy)
      ctx.lineTo(paddle.x + hx, paddle.y + hy)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(paddle.x, paddle.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#f5c518'
      ctx.fill()
    })

    // Pegs within visible viewport
    PEGS.forEach(peg => {
      if (peg.y + PEG_R < cameraY || peg.y - PEG_R > cameraY + canvasHRef.current) return
      ctx.beginPath()
      ctx.arc(peg.x, peg.y, PEG_R, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.fill()
    })

    // Balls (emoji)
    balls.forEach(ball => {
      if (!ball.alive) return
      const fontSize = Math.round(ball.r * 2.8)
      ctx.font = `${fontSize}px serif`
      ctx.textAlign = 'center'
      ctx.fillStyle = '#fff'
      ctx.fillText(ball.char, Math.round(ball.x), Math.round(ball.y + fontSize * 0.33))
    })

    ctx.restore()
  }, [])

  useEffect(() => {
    if (phase !== 'playing') return

    function animate() {
      const balls = ballsRef.current
      const now = Date.now()
      const alive = balls.filter(b => b.alive)

      // Slow-motion as balls dwindle
      const total = balls.length
      const slowThreshold = total <= 5 ? 2 : total <= 20 ? 7 : total < 50 ? 5 : Math.round(total * 0.10)
      const s = alive.length <= 1 ? 0.15
              : alive.length <= 2 ? 0.30
              : alive.length <= 3 ? 0.40
              : alive.length <= slowThreshold ? 0.50
              : 1.0

      for (const ball of balls) {
        if (!ball.alive) continue
        ball.vy += GRAVITY * s
        ball.x += ball.vx * s
        ball.y += ball.vy * s

        // Dynamic wall collision — converges in funnel zone
        const walls = getWalls(ball.y)
        if (ball.x - ball.r < walls.left) {
          ball.x = walls.left + ball.r
          ball.vx = 2.2 + Math.random() * 2.0
        }
        if (ball.x + ball.r > walls.right) {
          ball.x = walls.right - ball.r
          ball.vx = -(2.2 + Math.random() * 2.0)
        }

        for (const peg of PEGS) resolvePeg(ball, peg)

        if (ball.y - ball.r > DEATH_Y) {
          ball.alive = false
          ball.diedAt = now
          const counts = {}
          ballsRef.current.forEach(b => {
            if (b.alive) counts[b.playerIdx] = (counts[b.playerIdx] || 0) + 1
          })
          setAliveCounts(counts)
        }
      }

      // Ball-ball collisions
      for (let i = 0; i < balls.length; i++) {
        for (let j = i + 1; j < balls.length; j++) {
          if (balls[i].alive && balls[j].alive) resolveBallPair(balls[i], balls[j])
        }
      }

      // Rotate paddles and resolve ball-paddle collisions
      for (let pi = 0; pi < PADDLES.length; pi++) {
        paddleAnglesRef.current[pi] += PADDLES[pi].speed * s
        const paddle = PADDLES[pi]
        const angle = paddleAnglesRef.current[pi]
        const cos = Math.cos(angle), sin = Math.sin(angle)
        const half = paddle.len / 2
        for (const ball of balls) {
          if (!ball.alive) continue
          const dx = ball.x - paddle.x, dy = ball.y - paddle.y
          const t = Math.max(-half, Math.min(half, dx * cos + dy * sin))
          const cx = paddle.x + t * cos, cy = paddle.y + t * sin
          const ex = ball.x - cx, ey = ball.y - cy
          const dist = Math.sqrt(ex * ex + ey * ey)
          const minDist = ball.r + PADDLE_R
          if (dist > 0 && dist < minDist) {
            const nx = ex / dist, ny = ey / dist
            ball.x += nx * (minDist - dist)
            ball.y += ny * (minDist - dist)
            const dot = ball.vx * nx + ball.vy * ny
            ball.vx = (ball.vx - 2 * dot * nx) * DAMPING
            ball.vy = (ball.vy - 2 * dot * ny) * DAMPING
            // Add paddle tip rotational velocity for the flinging effect
            ball.vx += -PADDLES[pi].speed * t * sin * 1.8
            ball.vy += PADDLES[pi].speed * t * cos * 1.8
          }
        }
      }

      // Camera follows leading ball but stops once end line reaches bottom 25%
      if (alive.length > 0) {
        const lowestY = Math.max(...alive.map(b => b.y))
        const cH = canvasHRef.current
        const targetCamera = Math.min(
          Math.max(0, lowestY - cH * 0.45),
          H_WORLD - cH * 0.85
        )
        cameraRef.current += (targetCamera - cameraRef.current) * 0.06
      }

      draw(balls, cameraRef.current)

      const allSamePlayer = alive.length > 0 && alive.every(b => b.playerIdx === alive[0].playerIdx)
      if (alive.length <= 1 || allSamePlayer) {
        const survivor = alive[0] ?? balls.reduce((a, b) => a.diedAt > b.diedAt ? a : b)
        survivorRef.current = survivor
        setLoserIdx(survivor.playerIdx)
        setPhase('panning')
        return
      }

      animRef.current = requestAnimationFrame(animate)
    }

    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, draw])

  useEffect(() => {
    if (phase !== 'panning') return
    const survivor = survivorRef.current
    if (!survivor) { setPhase('done'); return }
    const startCamera = cameraRef.current
    const targetCamera = Math.max(0, survivor.y - canvasHRef.current * 0.45)
    const startTime = Date.now()
    const DURATION = 800

    function pan() {
      const t = Math.min((Date.now() - startTime) / DURATION, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      cameraRef.current = startCamera + (targetCamera - startCamera) * ease
      draw(ballsRef.current, cameraRef.current)
      if (t < 1) {
        animRef.current = requestAnimationFrame(pan)
      } else {
        setPhase('done')
      }
    }
    animRef.current = requestAnimationFrame(pan)
    return () => cancelAnimationFrame(animRef.current)
  }, [phase, draw])

  useEffect(() => {
    if (phase === 'done') draw(ballsRef.current, cameraRef.current)
  }, [phase, draw])

  return (
    <div className="pinball-root">
      <div className="pinball-header">
        <button className="back-btn" onClick={onBack}>‹</button>
        <span>핀볼</span>
      </div>

      {phase === 'setup' && (
        <div className="pinball-setup">
          <p className="setup-hint">캐릭터를 선택하세요</p>
          <div className="player-list">
            {players.map((pl, i) => (
              <div key={i} className="pinball-player-card">
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

          <div className="ball-count-row">
            <span className="ball-count-label">공 갯수</span>
            <div className="ball-count-ctrl">
              <button onClick={() => setBallCount(c => Math.max(2, c - 1))}>−</button>
              <span className="ball-count-num">{ballCount}</span>
              <button onClick={() => setBallCount(c => Math.min(12, c + 1))}>+</button>
            </div>
          </div>

          {players.length < MAX_PLAYERS && (
            <button className="add-btn" onClick={addPlayer}>+ 추가</button>
          )}
          <button className="start-btn" onClick={startGame}>핀볼 시작!</button>
        </div>
      )}

      {(phase === 'playing' || phase === 'panning' || phase === 'done') && (
        <div className="pinball-play" ref={playRef}>
          <canvas ref={canvasRef} className="pinball-canvas" width={W} height={canvasH} />
          {phase !== 'done' && Object.keys(aliveCounts).length > 0 && (
            <div className="pinball-counts">
              {players.map((p, i) => (
                <div key={i} className={`pinball-count-item ${(aliveCounts[i] ?? 0) === 0 ? 'eliminated' : ''}`}>
                  <span className="count-char">{p.char}</span>
                  <span className="count-num">{aliveCounts[i] ?? 0}</span>
                </div>
              ))}
            </div>
          )}
          {phase === 'done' && loserIdx !== null && (
            <div className="pinball-overlay" onClick={reset}>
              <div className="pinball-verdict">
                <span className="verdict-char">{players[loserIdx].char}</span>
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
