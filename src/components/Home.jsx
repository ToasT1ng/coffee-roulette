import './Home.css'

const GAMES = [
  { id: 'finger', emoji: '✋', label: '터치 추첨' },
  { id: 'ladder', emoji: '🪜', label: '사다리 게임' },
  { id: 'race', emoji: '🏁', label: '꼴찌 정하기' },
  { id: 'pinball', emoji: '🎱', label: '핀볼' },
]

export default function Home({ onSelect }) {
  return (
    <div className="home">
      <div className="home-header">
        <div className="home-logo">🎲</div>
        <h1>누가 쏠래</h1>
        <p>(일단난아님)</p>
      </div>
      <div className="home-games">
        {GAMES.map(g => (
          <button key={g.id} className="game-card" onClick={() => onSelect(g.id)}>
            <span className="game-emoji">{g.emoji}</span>
            <div className="game-label">{g.label}</div>
            <span className="game-arrow">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
