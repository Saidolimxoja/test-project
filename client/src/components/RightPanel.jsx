import { useState, useEffect, useRef, useCallback } from 'react'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fetchSelected, deselectItem, reorderItems } from '../api'

// ─── Один сортируемый элемент ──────────────────────────────────────
function SortableItem({ item, onDeselect }) {
  // useSortable — хук от @dnd-kit, даёт атрибуты для drag&drop
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className="list-item draggable">
      {/* Ручка для перетаскивания */}
      <span className="drag-handle" {...attributes} {...listeners}>⠿</span>
      <span>#{item.id}</span>
      <span className="item-action remove" onClick={() => onDeselect(item.id)}>← Убрать</span>
    </div>
  )
}

// ─── Правая панель ─────────────────────────────────────────────────
export default function RightPanel({ onDeselect: notifyParent }) {
  const [items, setItems]     = useState([])
  const [cursor, setCursor]   = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [q, setQ]             = useState('')
  const loaderRef   = useRef(null)
  const loadingRef  = useRef(false)
  const cursorRef   = useRef(0)

  const sensors = useSensors(useSensor(PointerSensor))

  const loadMore = useCallback(async (reset = false) => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)

    const cur = reset ? 0 : cursorRef.current
    const data = await fetchSelected({ cursor: cur, limit: 20, q })

    setItems(prev => reset ? data.items : [...prev, ...data.items])
    cursorRef.current = cur + data.items.length
    setCursor(cursorRef.current)
    setHasMore(data.items.length === 20)

    loadingRef.current = false
    setLoading(false)
  }, [q])

  useEffect(() => {
    cursorRef.current = 0
    loadMore(true)
  }, [q]) // eslint-disable-line

  useEffect(() => {
    const el = loaderRef.current
    if (!el) return
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !loadingRef.current) loadMore()
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  async function handleDeselect(id) {
    await deselectItem(id)
    setItems(prev => prev.filter(i => i.id !== id))
    notifyParent()
  }

  // Drag end — обновляем порядок локально и отправляем на сервер
  async function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    setItems(prev => {
      const oldIdx = prev.findIndex(i => i.id === active.id)
      const newIdx = prev.findIndex(i => i.id === over.id)
      const reordered = arrayMove(prev, oldIdx, newIdx)

      // Отправляем новый порядок на сервер
      reorderItems(reordered.map(i => i.id))
      return reordered
    })
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Выбранные</h2>

      <input
        className="search-input"
        placeholder="Фильтр по ID..."
        value={q}
        onChange={e => setQ(e.target.value)}
      />

      <div className="list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map(item => (
              <SortableItem key={item.id} item={item} onDeselect={handleDeselect} />
            ))}
          </SortableContext>
        </DndContext>

        {hasMore && <div ref={loaderRef} className="loader">{loading ? 'Загрузка...' : ''}</div>}
        {!hasMore && items.length === 0 && <div className="empty">Нет выбранных элементов</div>}
      </div>
    </div>
  )
}