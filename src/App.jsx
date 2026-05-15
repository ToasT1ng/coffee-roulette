import { useState } from 'react'
import Home from './components/Home'
import FingerPicker from './components/FingerPicker'
import LadderGame from './components/LadderGame'
import CharacterRace from './components/CharacterRace'
import './App.css'

export default function App() {
  const [screen, setScreen] = useState('home')

  const screens = {
    home: <Home onSelect={setScreen} />,
    finger: <FingerPicker onBack={() => setScreen('home')} />,
    ladder: <LadderGame onBack={() => setScreen('home')} />,
    race: <CharacterRace onBack={() => setScreen('home')} />,
  }

  return <div className="app">{screens[screen]}</div>
}
