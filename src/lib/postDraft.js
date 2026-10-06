const DATABASE_NAME = "pobjer-post-draft";
const STORE_NAME = "drafts";
const DRAFT_KEY = "pending-post";
const DRAFT_LIFETIME_MS = 24 * 60 * 60 * 1000;

function openDraftDatabase() {
  return new Promise((resolve, reject) => {
    if (!window.indexedDB) {
      reject(new Error("This browser cannot save a post draft"));
      return;
    }
    const request = window.indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withDraftStore(mode, action) {
  const database = await openDraftDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      let result;
      request.onsuccess = () => { result = request.result; };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    database.close();
  }
}

export async function savePostDraft({ postType, step, form, files }) {
  await withDraftStore("readwrite", (store) => store.put({
    postType,
    step,
    form,
    files: files.map((file) => ({ blob: file, name: file.name, type: file.type, lastModified: file.lastModified })),
    expiresAt: Date.now() + DRAFT_LIFETIME_MS,
  }, DRAFT_KEY));
}

export async function loadPostDraft() {
  const draft = await withDraftStore("readonly", (store) => store.get(DRAFT_KEY));
  if (!draft) return null;
  if (draft.expiresAt <= Date.now()) {
    await clearPostDraft();
    return null;
  }
  return draft;
}

export async function clearPostDraft() {
  await withDraftStore("readwrite", (store) => store.delete(DRAFT_KEY));
}
