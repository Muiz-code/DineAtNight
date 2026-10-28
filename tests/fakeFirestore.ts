/**
 * Minimal in-memory stand-in for the Firebase Admin Firestore API, covering
 * only what lib/payments.ts uses: collection().doc().get/create/update,
 * getAll(), and runTransaction() with tx.get/tx.update.
 *
 * Plain field values are merged into the store; FieldValue sentinels
 * (increment, serverTimestamp) are recorded in `updates` for assertions.
 */

import { FieldValue } from "firebase-admin/firestore";

type Data = Record<string, unknown>;

export function createFakeFirestore(seed: Record<string, Data> = {}) {
  const store = new Map<string, Data>(Object.entries(seed).map(([k, v]) => [k, { ...v }]));
  const updates: { path: string; data: Data }[] = [];

  const snapshot = (id: string, data: Data | undefined) => ({
    id,
    exists: data !== undefined,
    data: () => (data ? { ...data } : undefined),
    get: (key: string) => data?.[key],
  });

  const applyUpdate = (path: string, data: Data) => {
    updates.push({ path, data });
    const current = store.get(path);
    if (!current) throw new Error(`No document to update: ${path}`);
    for (const [k, v] of Object.entries(data)) {
      if (!(v instanceof FieldValue)) current[k] = v;
    }
  };

  const docRef = (collection: string, id: string) => {
    const path = `${collection}/${id}`;
    return {
      id,
      path,
      get: async () => snapshot(id, store.get(path)),
      create: async (data: Data) => {
        if (store.has(path)) throw Object.assign(new Error("ALREADY_EXISTS"), { code: 6 });
        store.set(path, { ...data });
      },
      update: async (data: Data) => applyUpdate(path, data),
      delete: async () => void store.delete(path),
    };
  };
  type DocRef = ReturnType<typeof docRef>;

  const db = {
    collection: (collection: string) => ({ doc: (id: string) => docRef(collection, id) }),
    getAll: (...refs: DocRef[]) => Promise.all(refs.map((r) => r.get())),
    runTransaction: async <T>(fn: (tx: unknown) => Promise<T>): Promise<T> => {
      // Writes are buffered and applied only if the callback succeeds, like Firestore
      const pending: [DocRef, Data][] = [];
      const tx = {
        get: (ref: DocRef) => ref.get(),
        update: (ref: DocRef, data: Data) => void pending.push([ref, data]),
      };
      const result = await fn(tx);
      for (const [ref, data] of pending) applyUpdate(ref.path, data);
      return result;
    },
  };

  return { db, store, updates };
}
