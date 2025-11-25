const NAMESPACE = 'bestibule:chat';
const CANONICAL = (id) => `${NAMESPACE}:${id}`;

function safeParse(str) {
  try { return JSON.parse(str); } catch { return null; }
}
function toMillis(x) {
  if (!x) return 0;
  if (typeof x === 'number') return x;
  const d = new Date(x);
  return Number.isFinite(d.getTime()) ? d.getTime() : 0;
}
function normalize(msg, idx=0) {
  const text = msg.text ?? msg.message ?? msg.content ?? msg.body ?? '';
  const sender = msg.sender ?? msg.role ?? (msg.user ? 'user' : 'ai');
  const ts = toMillis(msg.timestamp ?? msg.createdAt ?? msg.time ?? Date.now());
  const id = msg.id ?? `${ts}:${text.slice(0,32)}:${idx}`;
  return { id, text, sender, timestamp: ts };
}
function dedupeSort(arr) {
  const map = new Map();
  for (let i=0;i<arr.length;i++) {
    const m = normalize(arr[i], i);
    if (!m.text) continue;
    const key = m.id || `${m.timestamp}:${m.text}`;
    // keep earliest occurrence of same key
    if (!map.has(key)) map.set(key, m);
  }
  return Array.from(map.values()).sort((a,b)=>a.timestamp-b.timestamp);
}

function findLegacy() {
  const keys = Object.keys(localStorage);
  const candidates = [];
  for (const k of keys) {
    const raw = localStorage.getItem(k);
    if (!raw || raw.length < 10) continue;
    const parsed = safeParse(raw);
    if (!parsed) continue;

    // Shapes we support:
    // 1) Array of messages
    if (Array.isArray(parsed) && parsed.length) candidates.push({key:k, list:parsed});
    // 2) { messages: [...] }
    else if (parsed && Array.isArray(parsed.messages)) candidates.push({key:k, list:parsed.messages});
    // 3) { conversation: [...] }
    else if (parsed && Array.isArray(parsed.conversation)) candidates.push({key:k, list:parsed.conversation});
  }
  // Return the biggest list (most likely the real chat)
  candidates.sort((a,b)=> (b.list?.length||0) - (a.list?.length||0));
  return candidates[0] || null;
}

export function loadChat(conversationId) {
  // 1) canonical first
  const canonicalKey = CANONICAL(conversationId);
  const canon = safeParse(localStorage.getItem(canonicalKey));
  if (Array.isArray(canon) && canon.length) {
    return dedupeSort(canon);
  }

  // 2) migrate from best legacy candidate
  const legacy = findLegacy();
  if (legacy) {
    const merged = dedupeSort(legacy.list);
    try { localStorage.setItem(canonicalKey, JSON.stringify(merged)); } catch {}
    return merged;
  }

  return []; // nothing found
}

export function saveChat(conversationId, messages) {
  const canonicalKey = CANONICAL(conversationId);
  const merged = dedupeSort(messages);
  try { localStorage.setItem(canonicalKey, JSON.stringify(merged)); } catch {}
  return merged;
}
