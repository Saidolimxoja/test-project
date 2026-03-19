const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// Отдаём собранный React (папка client/dist) как статику
const clientDist = path.join(__dirname, '../client/dist');
app.use(express.static(clientDist));

// ─── In-memory store ───────────────────────────────────────────────
const TOTAL = 1_000_000;

// Все ID от 1 до 1_000_000 — не храним объекты, только числа
const allIds = new Set(Array.from({ length: TOTAL }, (_, i) => i + 1));

// Состояние: выбранные ID и их порядок
let selectedIds = []; // [id, id, ...] — порядок важен (drag&drop)

// Защита от дублей при добавлении
const addedCustomIds = new Set(allIds); // сразу включаем базовые

// ─── Server-side dedup queue для batch-add ─────────────────────────
let pendingAdd = new Map(); // id → true

function flushAddQueue() {
  if (!pendingAdd.size) return;
  for (const [id] of pendingAdd) {
    if (!addedCustomIds.has(id)) {
      allIds.add(id);
      addedCustomIds.add(id);
    }
  }
  pendingAdd.clear();
}
setInterval(flushAddQueue, 10_000);

// ─── Routes ────────────────────────────────────────────────────────

// GET /api/items?cursor=0&limit=20&q=
// Возвращает элементы из левой панели (не выбранные), с пагинацией
app.get('/api/items', (req, res) => {
  const cursor = parseInt(req.query.cursor) || 0;
  const limit  = parseInt(req.query.limit)  || 20;
  const q      = req.query.q?.trim() || '';

  const selectedSet = new Set(selectedIds);

  // Генерируем виртуальный список: все ID кроме выбранных
  // Фильтруем по q если есть
  const filtered = [];
  let idx = 0;

  for (const id of allIds) {
    if (selectedSet.has(id)) continue;
    if (q && !String(id).includes(q)) continue;

    if (idx >= cursor && filtered.length < limit) {
      filtered.push(id);
    }
    if (filtered.length === limit) break;
    idx++;
  }

  res.json({ items: filtered.map(id => ({ id })), nextCursor: cursor + filtered.length });
});

// GET /api/selected — правая панель
app.get('/api/selected', (req, res) => {
  const cursor = parseInt(req.query.cursor) || 0;
  const limit  = parseInt(req.query.limit)  || 20;
  const q      = req.query.q?.trim() || '';

  let list = selectedIds;
  if (q) list = list.filter(id => String(id).includes(q));

  const page = list.slice(cursor, cursor + limit);
  res.json({ items: page.map(id => ({ id })), nextCursor: cursor + page.length, total: list.length });
});

// POST /api/select — добавить элемент в выбранные
app.post('/api/select', (req, res) => {
  const { id } = req.body;
  if (!id || selectedIds.includes(id)) return res.json({ ok: true });
  selectedIds.push(id);
  res.json({ ok: true });
});

// POST /api/deselect — убрать из выбранных
app.post('/api/deselect', (req, res) => {
  const { id } = req.body;
  selectedIds = selectedIds.filter(x => x !== id);
  res.json({ ok: true });
});

// POST /api/reorder — сохранить новый порядок после drag&drop
app.post('/api/reorder', (req, res) => {
  const { orderedIds } = req.body;
  if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'bad input' });
  selectedIds = orderedIds;
  res.json({ ok: true });
});

// POST /api/items/batch — batch добавление кастомных ID
app.post('/api/items/batch', (req, res) => {
  const { items } = req.body; // [{ id }, ...]
  if (!Array.isArray(items)) return res.status(400).json({ error: 'bad input' });
  for (const { id } of items) {
    if (id != null) pendingAdd.set(id, true); // дедуп через Map
  }
  res.json({ ok: true, queued: items.length });
});

// Все остальные маршруты → отдаём index.html (React Router SPA)
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'));
});

// ─── Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on :${PORT}`));