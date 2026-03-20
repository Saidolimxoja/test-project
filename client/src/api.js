// Все запросы к серверу — в одном месте.
// Vite proxy перехватит /api/* и отправит на localhost:3001

// ─── Простые запросы (раз в секунду через updateQueue) ─────────────

export async function fetchItems({ cursor = 0, limit = 20, q = "" }) {
  const params = new URLSearchParams({ cursor, limit, ...(q && { q }) });
  const res = await fetch(`/api/items?${params}`);
  return res.json(); // { items: [{id},...], nextCursor }
}

export async function fetchSelected({ cursor = 0, limit = 20, q = "" }) {
  const params = new URLSearchParams({ cursor, limit, ...(q && { q }) });
  const res = await fetch(`/api/selected?${params}`);
  return res.json();
}

export async function selectItem(id) {
  await fetch("/api/select", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function deselectItem(id) {
  await fetch("/api/deselect", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
}

export async function reorderItems(orderedIds) {
  await fetch("/api/reorder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ orderedIds }),
  });
}

// ─── Очередь с дедупликацией ───────────────────────────────────────
// Map автоматически дедуплицирует по ключу:
// addQueue.enqueue(5) дважды → в Map будет одна запись с id=5

class RequestQueue {
  #pending = new Map();
  #intervalMs;

  constructor(intervalMs) {
    this.#intervalMs = intervalMs;
    setInterval(() => this.#flush(), intervalMs);
  }

  enqueue(id) {
    this.#pending.set(id, { id }); // повторный id → перезапишет, не задублирует
  }

  async #flush() {
    if (!this.#pending.size) return;
    const batch = [...this.#pending.values()];
    this.#pending.clear();
    try {
      await fetch("/api/items/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: batch }),
      });
    } catch (e) {
      console.error("batch flush error", e);
    }
  }
}

// Синглтон очереди — один на всё приложение
// batch add раз в 10 секунд (как требует задание)
export const addQueue = new RequestQueue(10_000);
