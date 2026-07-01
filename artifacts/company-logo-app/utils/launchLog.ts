export interface LaunchLogEntry {
  appName: string;
  packageName: string;
  intent: string;
  status: "success" | "failed" | "skipped";
  error?: string;
  timestamp: string;
}

const MAX_ENTRIES = 100;
let _log: LaunchLogEntry[] = [];
const _listeners: Array<() => void> = [];

export function addLaunchEntry(entry: LaunchLogEntry): void {
  _log = [entry, ..._log].slice(0, MAX_ENTRIES);
  _listeners.forEach((fn) => fn());
}

export function getLaunchLog(): LaunchLogEntry[] {
  return _log;
}

export function clearLaunchLog(): void {
  _log = [];
  _listeners.forEach((fn) => fn());
}

export function subscribeLaunchLog(fn: () => void): () => void {
  _listeners.push(fn);
  return () => {
    const idx = _listeners.indexOf(fn);
    if (idx !== -1) _listeners.splice(idx, 1);
  };
}
