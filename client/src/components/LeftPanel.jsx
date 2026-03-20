import { useState, useEffect, useRef, useCallback } from "react";
import { fetchItems, selectItem, addQueue } from "../api";

export default function LeftPanel({ reloadRef, onSelect }) {
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [newId, setNewId] = useState("");

  const loaderRef = useRef(null);
  const loadingRef = useRef(false);
  const cursorRef = useRef(0);

  const load = useCallback(
    async (reset = false) => {
      if (!reset && loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);

      const cur = reset ? 0 : cursorRef.current;
      const data = await fetchItems({ cursor: cur, limit: 20, q });

      setItems((prev) => (reset ? data.items : [...prev, ...data.items]));
      cursorRef.current = cur + data.items.length;
      setHasMore(data.items.length === 20);

      loadingRef.current = false;
      setLoading(false);
    },
    [q],
  );

  // Регистрируем reload — ПОСЛЕ объявления load
  useEffect(() => {
    reloadRef.current = () => {
      cursorRef.current = 0;
      load(true);
    };
  }, [load, reloadRef]);

  useEffect(() => {
    cursorRef.current = 0;
    load(true);
  }, [q]); // eslint-disable-line

  useEffect(() => {
    const el = loaderRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingRef.current) load();
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [load]);

  async function handleSelect(id) {
    await selectItem(id);
    onSelect();
  }

  async function handleAddCustom() {
    const id = parseInt(newId);
    if (!id || isNaN(id)) return;
    addQueue.enqueue(id);
    setNewId("");
    alert(`ID ${id} добавлен в очередь (отправится через ~10 сек)`);
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Все элементы</h2>
      <input
        className="search-input"
        placeholder="Фильтр по ID..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="add-row">
        <input
          className="search-input"
          placeholder="Новый ID..."
          value={newId}
          type="number"
          onChange={(e) => setNewId(e.target.value)}
        />
        <button className="btn" onClick={handleAddCustom}>
          Добавить
        </button>
      </div>
      <div className="list">
        {items.map((item) => (
          <div
            key={item.id}
            className="list-item"
            onClick={() => handleSelect(item.id)}
          >
            <span>#{item.id}</span>
            <span className="item-action">Выбрать →</span>
          </div>
        ))}
        {hasMore && (
          <div ref={loaderRef} className="loader">
            {loading ? "Загрузка..." : ""}
          </div>
        )}
        {!hasMore && items.length === 0 && (
          <div className="empty">Элементов не найдено</div>
        )}
      </div>
    </div>
  );
}
