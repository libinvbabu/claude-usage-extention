// Thin, defensive wrapper around chrome.storage.local.
//
// Works in content scripts, extension pages, and (as a no-op) in plain test /
// browser contexts where `chrome` is undefined. Uses the callback form, which
// is supported everywhere, and resolves a Promise.

type StorageArea = chrome.storage.StorageArea;

function area(): StorageArea | null {
  if (typeof chrome === "undefined") return null;
  return chrome.storage?.local ?? null;
}

export function storageGet<T>(key: string): Promise<T | undefined> {
  const a = area();
  if (!a) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    try {
      a.get(key, (items) => {
        if (chrome.runtime?.lastError) {
          resolve(undefined);
          return;
        }
        resolve(items?.[key] as T | undefined);
      });
    } catch {
      resolve(undefined);
    }
  });
}

export function storageSet(key: string, value: unknown): Promise<void> {
  const a = area();
  if (!a) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      a.set({ [key]: value }, () => {
        // Touch lastError to silence "unchecked runtime.lastError" warnings.
        void chrome.runtime?.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

export function storageRemove(key: string): Promise<void> {
  const a = area();
  if (!a) return Promise.resolve();
  return new Promise((resolve) => {
    try {
      a.remove(key, () => {
        void chrome.runtime?.lastError;
        resolve();
      });
    } catch {
      resolve();
    }
  });
}

/** Subscribe to changes for a single key in local storage. Returns an unsubscribe fn. */
export function onStorageChanged(
  key: string,
  cb: (newValue: unknown) => void,
): () => void {
  if (typeof chrome === "undefined" || !chrome.storage?.onChanged) {
    return () => {};
  }
  const listener = (
    changes: { [name: string]: chrome.storage.StorageChange },
    areaName: string,
  ) => {
    if (areaName === "local" && key in changes) {
      cb(changes[key].newValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}
