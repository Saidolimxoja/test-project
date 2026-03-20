import { useState, useCallback } from 'react'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'

export default function App() {
  const [leftKey, setLeftKey]   = useState(0)
  const [rightKey, setRightKey] = useState(0)

  const refreshLeft  = useCallback(() => setLeftKey(k => k + 1), [])
  const refreshRight = useCallback(() => setRightKey(k => k + 1), [])
  const refreshBoth  = useCallback(() => {
    setLeftKey(k => k + 1)
    setRightKey(k => k + 1)
  }, [])

  return (
    <div className="app-layout">
      <LeftPanel  key={leftKey}  onSelect={refreshBoth} />
      <RightPanel key={rightKey} onDeselect={refreshBoth} />
    </div>
  )
}