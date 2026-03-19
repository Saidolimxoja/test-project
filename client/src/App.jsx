import { useState } from 'react'
import LeftPanel from './components/LeftPanel'
import RightPanel from './components/RightPanel'

// App — корневой компонент. Он хранит общее состояние
// и передаёт его дочерним компонентам через props.
//
// useState(initialValue) — хук React.
// Возвращает [текущееЗначение, функцияДляИзменения].
// При вызове setX(...) React перерендерит компонент.

export default function App() {
  // refreshKey нужен чтобы перерисовать левую панель
  // когда пользователь выбирает/убирает элемент
  const [refreshKey, setRefreshKey] = useState(0)

  function triggerRefresh() {
    setRefreshKey(k => k + 1)
  }

  return (
    <div className="app-layout">
      <LeftPanel key={refreshKey} onSelect={triggerRefresh} />
      <RightPanel onDeselect={triggerRefresh} />
    </div>
  )
}