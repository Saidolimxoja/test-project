import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchItems, selectItem, addQueue } from '../api'

// useEffect(fn, [deps]) — выполняет fn когда компонент монтируется
// или когда изменяется что-то из [deps].
// useRef() — хранит значение между рендерами БЕЗ перерисовки.
// useCallback(fn, [deps]) — мемоизирует функцию (не пересоздаёт каждый рендер).

export default function LeftPanel({ onSelect }) {
  const [items, setItems]       = useState([])       // текущий список
  const [cursor, setCursor]     = useState(0)        // позиция пагинации
  const [hasMore, setHasMore]   = useState(true)     // есть ли ещё элементы
  const [loading, setLoading]   = useState(false)
  const [q, setQ]               = useState('')       // строка поиска
  const [newId, setNewId]       = useState('')       // поле "добавить ID"

  const loaderRef = useRef(null) // ref на невидимый div в конце списка

  // Загрузка следующей порции элементов
  const loadMore = useCallback(async (reset = false) => {
    if (loading) return
    setLoading(true)

    const currentCursor = reset ? 0 : cursor
    const data = await fetchItems({ cursor: currentCursor, limit: 20, q })

    setItems(prev => reset ? data.items : [...prev, ...data.items])
    setCursor(data.nextCursor)
    setHasMore(data.items.length === 20)
    setLoading(false)
  }, [cursor, loading, q])

  // При изменении поиска — сбрасываем список и грузим заново
  useEffect(() => {
    loadMore(true)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  // IntersectionObserver следит за loaderRef.
  // Когда он появляется в viewport — вызываем loadMore().
  useEffect(() => {
    const el = loaderRef.current
    if (!el) return

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loading) {
        loadMore()
      }
    }, { threshold: 0.1 })

    observer.observe(el)
    return () => observer.disconnect() // cleanup при размонтировании
  }, [hasMore, loading, loadMore])

  async function handleSelect(id) {
    await selectItem(id)
    onSelect() // говорим App обновить правую панель и себя
  }

  async function handleAddCustom() {
    const id = parseInt(newId)
    if (!id || isNaN(id)) return
    addQueue.enqueue(id) // попадает в очередь, flush раз в 10с
    setNewId('')
    alert(`ID ${id} добавлен в очередь (отправится на сервер через ~10 сек)`)
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Все элементы</h2>

      {/* Поиск */}
      <input
        className="search-input"
        placeholder="Фильтр по ID..."
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      {/* Добавить кастомный ID */}
      <div className="add-row">
        <input
          className="search-input"
          placeholder="Новый ID..."
          value={newId}
          type="number"
          onChange={e => setNewId(e.target.value)}
        />
        <button className="btn" onClick={handleAddCustom}>Добавить</button>
      </div>

      {/* Список */}
      <div className="list">
        {items.map(item => (
          <div key={item.id} className="list-item" onClick={() => handleSelect(item.id)}>
            <span>#{item.id}</span>
            <span className="item-action">Выбрать →</span>
          </div>
        ))}

        {/* Невидимый триггер для infinite scroll */}
        {hasMore && <div ref={loaderRef} className="loader">
          {loading ? 'Загрузка...' : ''}
        </div>}

        {!hasMore && items.length === 0 && (
          <div className="empty">Элементов не найдено</div>
        )}
      </div>
    </div>
  )
}