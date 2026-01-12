const KEY = 'micall_ignored_alerts';
const IGNORE_MS = 30 * 60 * 1000; // 30 minutes

export function getIgnoredAlertIds(): number[] {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];

  const data: Record<number, number> = JSON.parse(raw);
  const now = Date.now();

  const valid: Record<number, number> = {};
  const ids: number[] = [];

  for (const id in data) {
    if (now - data[id] < IGNORE_MS) {
      valid[id] = data[id];
      ids.push(Number(id));
    }
  }

  localStorage.setItem(KEY, JSON.stringify(valid));
  return ids;
}

export function ignoreAlertFor30Min(alertId: number) {
  const raw = localStorage.getItem(KEY);
  const data = raw ? JSON.parse(raw) : {};
  data[alertId] = Date.now();
  localStorage.setItem(KEY, JSON.stringify(data));
}
