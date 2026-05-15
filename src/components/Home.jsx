import './Home.css'

const GAMES = [
  { id: 'finger', emoji: '☕', label: '터치 추첨' },
  { id: 'ladder', emoji: '🪜', label: '사다리 게임' },
  { id: 'race', emoji: '🏁', label: '꼴찌 정하기' },
]

export default function Home({ onSelect }) {
  return (
    <div className="home">
      <div className="home-header">
        <div className="home-logo">☕</div>
        <h1>오늘은 누가</h1>
        <p>(일단나는아님)</p>
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
