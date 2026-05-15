import './Home.css'

const GAMES = [
  { id: 'finger', emoji: '☕', label: '손가락 뽑기', desc: '손가락 대고 커피 내기' },
  { id: 'ladder', emoji: '🪜', label: '사다리타기', desc: '운명의 사다리를 타라' },
  { id: 'race', emoji: '🏁', label: '캐릭터 경주', desc: '내 캐릭터가 1등이면 무적' },
]

export default function Home({ onSelect }) {
  return (
    <div className="home">
      <div className="home-header">
        <div className="home-logo">☕</div>
        <h1>커피 내기</h1>
        <p>누가 쏠 것인가</p>
      </div>
      <div className="home-games">
        {GAMES.map(g => (
          <button key={g.id} className="game-card" onClick={() => onSelect(g.id)}>
            <span className="game-emoji">{g.emoji}</span>
            <div>
              <div className="game-label">{g.label}</div>
              <div className="game-desc">{g.desc}</div>
            </div>
            <span className="game-arrow">›</span>
          </button>
        ))}
      </div>
    </div>
  )
}
