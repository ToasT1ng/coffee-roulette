import { useState, useRef, useEffect, useCallback } from 'react'
import './CharacterRace.css'

const CHARACTERS = ['🐢','🐇','🦊','🐻','🐼','🐨','🐱','🐶']
const MAX_PLAYERS = 8
const BASE_SPEED = 0.00022
const BOOST_CHANCE = 0.01
const BOOST_STRENGTH = 0.003
const BOOST_DURATION = 35
const DRAMA_ZONE = 0.80

export default function CharacterRace({ onBack }) {
  const [players, setPlayers] = useState([
    { char: '🐢' },
    { char: '🐇' },
  ])
  const [phase, setPhase] = useState('setup')
  const [loser, setLoser] = useState(null)
  const canvasRef = useRef()
  const animRef = useRef()
  const stateRef = useRef([])

  const n = players.length

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

  function startRace() {
    stateRef.current = players.map(() => ({
      pos: 0,
      speed: BASE_SPEED,
      boost: 0,
      rank: null,
    }))
    setLoser(null)
    setPhase('racing')
  }

  const draw = useCallback((states) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const TRACK_H = H / players.length
    const MARGIN = 44
    const FINISH_X = W - MARGIN  // 316px, right margin = 44px

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, W, H)

    // checkered finish line
    const sq = 9
    for (let row = 0; row < Math.ceil(H / sq); row++) {
      for (let col = 0; col < 2; col++) {
        if ((row + col) % 2 === 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.22)'
          ctx.fillRect(FINISH_X + col * sq, row * sq, sq, sq)
        }
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = 'bold 9px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText('FINISH', FINISH_X + sq, 10)

    players.forEach((pl, i) => {
      const st = states[i]
      const trackY = i * TRACK_H
      const centerY = trackY + TRACK_H / 2
      const charX = MARGIN + st.pos * (FINISH_X - MARGIN)  // pos=0 → 44px, pos=1.0 → 316px

      // lane separator
      if (i > 0) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)'
        ctx.lineWidth = 1
        ctx.setLineDash([])
        ctx.beginPath()
        ctx.moveTo(0, trackY)
        ctx.lineTo(W, trackY)
        ctx.stroke()
      }

      // boost flame
      if (st.boost > 0) {
        ctx.font = `${TRACK_H * 0.32}px serif`
        ctx.textAlign = 'center'
        ctx.fillText('🔥', charX - TRACK_H * 0.5, centerY + TRACK_H * 0.18)
      }

      // character
      ctx.globalAlpha = st.rank !== null ? 0.5 : 1.0
      ctx.font = `${TRACK_H * 0.6}px serif`
      ctx.textAlign = 'center'
      ctx.fillText(pl.char, charX, centerY + TRACK_H * 0.22)
      ctx.globalAlpha = 1.0

      // rank badge
      if (st.rank !== null) {
        const isLoser = st.rank === players.length
        const rankLabel = st.rank === 1 ? '👑' : isLoser ? '☕' : `${st.rank}등`
        ctx.font = `bold 12px system-ui`
        ctx.fillStyle = isLoser ? '#e8623a' : st.rank === 1 ? '#f5a623' : 'rgba(255,255,255,0.55)'
        ctx.textAlign = 'center'
        ctx.fillText(rankLabel, charX, centerY - TRACK_H * 0.3)
      }
    })
  }, [players])

  useEffect(() => {
    if (phase !== 'racing') return
    let done = false
    let finishCount = 0

    function tick() {
      if (done) return
      const states = stateRef.current
      const racing = states.filter(s => s.rank === null)
      const leader = Math.max(...racing.map(s => s.pos), 0)

      states.forEach((st) => {
        if (st.rank !== null) return

        if (st.boost <= 0 && Math.random() < BOOST_CHANCE) st.boost = BOOST_DURATION
        const isBoost = st.boost > 0
        if (isBoost) st.boost--

        const dramaFactor = leader > DRAMA_ZONE ? 0.5 + Math.random() * 0.35 : 1.0
        const catchUp = (leader - st.pos) > 0.18 ? 1.25 : 1.0
        const noise = (Math.random() - 0.3) * 0.0015

        st.speed = Math.max(0.0003,
          (BASE_SPEED + noise + (isBoost ? BOOST_STRENGTH : 0)) * dramaFactor * catchUp
        )
        st.pos = Math.min(st.pos + st.speed, 1.0)

        if (st.pos >= 1.0) { finishCount++; st.rank = finishCount }
      })

      draw(states)

      if (finishCount >= players.length - 1) {
        done = true
        const loserIdx = states.findIndex(s => s.rank === null)
        if (loserIdx !== -1) states[loserIdx].rank = players.length
        setLoser(loserIdx)
        setPhase('done')
        return
      }

      animRef.current = requestAnimationFrame(tick)
    }

    animRef.current = requestAnimationFrame(tick)
    return () => { done = true; cancelAnimationFrame(animRef.current) }
  }, [phase, draw, players])

  function reset() {
    cancelAnimationFrame(animRef.current)
    setPhase('setup')
    setLoser(null)
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
              <div key={i} className="race-player-card">
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
          <button className="start-btn" onClick={startRace}>경주 시작!</button>
        </div>
      )}

      {(phase === 'racing' || phase === 'done') && (
        <div className="race-play">
          <canvas
            ref={canvasRef}
            className="race-canvas"
            width={360}
            height={Math.max(240, n * 76)}
          />
          {phase === 'done' && loser !== null && (
            <div className="race-result">
              <div className="race-winner-icon">{players[loser].char}</div>
              <div className="race-winner-text">
                꼴찌!<br />
                <span className="race-loser-text">커피 쏘세요 ☕</span>
              </div>
              <button className="start-btn" onClick={reset}>다시하기</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
