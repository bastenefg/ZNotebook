(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.NotebookPersistence = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const RECORDS = "experiments";
  const DRAFTS = "pendingWrites";
  const META = "workspaceMeta";

  function requireString(value, name, allowEmpty = false) {
    if (typeof value !== "string" || (!allowEmpty && !value.trim())) {
      throw new TypeError(`${name} must be a ${allowEmpty ? "" : "non-empty "}string.`);
    }
  }

  // Records travel as JSON to the backend. Capture that same immutable payload
  // before opening a transaction, including when callers keep editing the form.
  function copyJson(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function validateRecord(record) {
    if (!record || typeof record !== "object" || Array.isArray(record)) {
      throw new TypeError("A record must be an object.");
    }
    requireString(record.id, "record.id");
  }

  function validateDraft(draft, allowUnknownBase = false) {
    if (!draft || typeof draft !== "object") throw new TypeError("A draft is required.");
    validateRecord(draft.record);
    requireString(draft.backendUrl, "backendUrl");
    requireString(draft.revision, "revision");
    if (!allowUnknownBase || draft.baseModifiedTime !== undefined) {
      requireString(draft.baseModifiedTime, "baseModifiedTime", true);
    }
    if (draft.recordId !== draft.record.id || draft.key !== `${draft.backendUrl}\n${draft.recordId}`) {
      throw new TypeError("The draft key, recordId and record.id must agree.");
    }
    if (draft.needsReview !== undefined && typeof draft.needsReview !== "boolean") {
      throw new TypeError("needsReview must be a boolean.");
    }
    if (draft.reason !== undefined) requireString(draft.reason, "reason", true);
  }

  function equalJson(left, right) {
    if (left === right) return true;
    if (!left || !right || typeof left !== "object" || typeof right !== "object") return false;
    if (Array.isArray(left) !== Array.isArray(right)) return false;
    const keys = Object.keys(left);
    return keys.length === Object.keys(right).length && keys.every((key) => (
      Object.prototype.hasOwnProperty.call(right, key) && equalJson(left[key], right[key])
    ));
  }

  function recordsEqual(left, right) {
    return equalJson(copyJson(left), copyJson(right));
  }

  // Resolve only after commit, never after a request's success event. In
  // particular, a later quota error must roll back BOTH the record and its draft.
  function transaction(db, stores, mode, work) {
    return new Promise((resolve, reject) => {
      const tx = mode === "readwrite"
        ? db.transaction(stores, mode, { durability: "strict" })
        : db.transaction(stores, mode);
      let result;
      let failure;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(failure || tx.error || new Error("Local storage transaction was aborted."));
      tx.onerror = (event) => { failure = failure || event.target.error || tx.error; };
      const fail = (error) => {
        failure = error;
        try { tx.abort(); } catch (_) { reject(error); }
      };
      const guard = (callback) => (event) => {
        try { callback(event); } catch (error) { fail(error); }
      };
      try {
        work(tx, (value) => { result = value; }, guard);
      } catch (error) {
        fail(error);
      }
    });
  }

  async function stageDraft(db, draft) {
    validateDraft(draft, true);
    const captured = copyJson(draft);
    validateDraft(captured, true);
    return transaction(db, [RECORDS, DRAFTS, META], "readwrite", (tx, done, guard) => {
      const drafts = tx.objectStore(DRAFTS);
      const request = drafts.get(captured.key);
      const save = () => {
        validateDraft(captured);
        tx.objectStore(RECORDS).put(captured.record);
        drafts.put(captured);
        done(captured);
      };
      request.onsuccess = guard(() => {
        const previous = request.result;
        if (previous) {
          validateDraft(previous);
          captured.baseModifiedTime = previous.baseModifiedTime;
          if (previous.needsReview) {
            captured.needsReview = true;
            captured.reason = previous.reason || captured.reason || "This draft needs review before it can be saved.";
          }
          save();
        } else if (captured.baseModifiedTime !== undefined) {
          save();
        } else {
          const metaRequest = tx.objectStore(META).get(captured.backendUrl);
          metaRequest.onsuccess = guard(() => {
            captured.baseModifiedTime = metaRequest.result?.recordMeta?.[captured.recordId]?.modifiedTime || "";
            const localRequest = tx.objectStore(RECORDS).get(captured.recordId);
            localRequest.onsuccess = guard(() => {
              if (localRequest.result && !captured.baseModifiedTime) {
                captured.needsReview = true;
                captured.reason = "This device has no saved Drive version for this record. Review it after reconnecting.";
              }
              save();
            });
          });
        }
      });
    });
  }

  async function getDrafts(db, backendUrl) {
    requireString(backendUrl, "backendUrl");
    return transaction(db, [DRAFTS], "readonly", (tx, done, guard) => {
      const request = tx.objectStore(DRAFTS).getAll();
      request.onsuccess = guard(() => done(request.result.filter((draft) => draft.backendUrl === backendUrl)));
    });
  }

  async function acknowledgeDraft(db, { key, revision, modifiedTime }) {
    requireString(key, "key");
    requireString(revision, "revision");
    requireString(modifiedTime, "modifiedTime", true);
    return transaction(db, [DRAFTS, META], "readwrite", (tx, done, guard) => {
      const store = tx.objectStore(DRAFTS);
      const request = store.get(key);
      request.onsuccess = guard(() => {
        const draft = request.result;
        if (draft) validateDraft(draft);
        if (!draft) {
          done(null);
        } else if (draft.revision === revision) {
          store.delete(key);
          done(null);
        } else {
          // Saves for a record are serialized by the caller. A successful older
          // revision becomes the baseline for the newer edits still on device.
          if (modifiedTime) draft.baseModifiedTime = modifiedTime;
          store.put(draft);
          done(draft);
        }
        if (modifiedTime) {
          const separator = key.lastIndexOf("\n");
          const backendUrl = draft?.backendUrl || key.slice(0, separator);
          const recordId = draft?.recordId || key.slice(separator + 1);
          if (separator < 1 || !recordId) throw new TypeError("Invalid draft key.");
          const metadata = tx.objectStore(META);
          const metaRequest = metadata.get(backendUrl);
          metaRequest.onsuccess = guard(() => {
            const recordMeta = metaRequest.result?.recordMeta || {};
            // Define an own property even for IDs such as '__proto__'.
            Object.defineProperty(recordMeta, recordId, {
              value: { ...(recordMeta[recordId] || {}), modifiedTime },
              configurable: true, enumerable: true, writable: true,
            });
            metadata.put({ backendUrl, recordMeta });
          });
        }
      });
    });
  }

  async function getWorkspaceMeta(db, backendUrl) {
    requireString(backendUrl, "backendUrl");
    return transaction(db, [META], "readonly", (tx, done, guard) => {
      const request = tx.objectStore(META).get(backendUrl);
      request.onsuccess = guard(() => done(request.result?.recordMeta || {}));
    });
  }

  async function updateDraftReview(db, { key, revision, reason }) {
    requireString(key, "key");
    requireString(revision, "revision");
    requireString(reason, "reason");
    return transaction(db, [DRAFTS], "readwrite", (tx, done, guard) => {
      const store = tx.objectStore(DRAFTS);
      const request = store.get(key);
      request.onsuccess = guard(() => {
        const draft = request.result;
        if (draft && draft.revision === revision) {
          validateDraft(draft);
          draft.needsReview = true;
          draft.reason = reason;
          store.put(draft);
        }
        done(draft || null);
      });
    });
  }

  async function mergeSnapshot(db, { backendUrl, records, recordMeta = {} }) {
    requireString(backendUrl, "backendUrl");
    if (!Array.isArray(records)) throw new TypeError("Snapshot records must be an array.");
    if (!recordMeta || typeof recordMeta !== "object" || Array.isArray(recordMeta)) {
      throw new TypeError("Snapshot recordMeta must be an object.");
    }
    const capturedRecords = copyJson(records);
    const capturedMeta = copyJson(recordMeta);
    const remote = new Map();
    capturedRecords.forEach((record) => {
      validateRecord(record);
      if (remote.has(record.id)) throw new TypeError("Snapshot contains duplicate record IDs.");
      remote.set(record.id, record);
    });
    Object.values(capturedMeta).forEach((meta) => {
      if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
        throw new TypeError("Record metadata must be an object.");
      }
      if (meta.modifiedTime !== undefined) requireString(meta.modifiedTime, "modifiedTime", true);
    });

    return transaction(db, [RECORDS, DRAFTS, META], "readwrite", (tx, done, guard) => {
      const draftStore = tx.objectStore(DRAFTS);
      const request = draftStore.getAll();
      request.onsuccess = guard(() => {
        const drafts = [];
        const merged = new Map(remote);
        request.result.filter((draft) => draft.backendUrl === backendUrl).forEach((draft) => {
          validateDraft(draft);
          const saved = remote.get(draft.recordId);
          if (saved && recordsEqual(saved, draft.record)) {
            // Covers a successful server save whose response was lost. We read
            // and delete within the same transaction, so a newer draft is safe.
            draftStore.delete(draft.key);
            return;
          }
          const savedTime = capturedMeta[draft.recordId]?.modifiedTime || "";
          let reason = "";
          if (saved && !draft.baseModifiedTime) {
            reason = "A record with this ID already exists on Drive. Review this local draft before saving.";
          } else if (draft.baseModifiedTime && (!saved || draft.baseModifiedTime !== savedTime)) {
            reason = saved
              ? "The Drive record changed since this local draft was started. Review both versions before saving."
              : "The Drive record is missing. Review this local draft before saving.";
          }
          if (reason) {
            draft.needsReview = true;
            draft.reason = reason;
            draftStore.put(draft);
          }
          // Never adopt a newer remote timestamp here: doing so would allow
          // retries to overwrite a concurrent researcher's work silently.
          drafts.push(draft);
          merged.set(draft.recordId, draft.record);
        });
        const appliedRecords = Array.from(merged.values());
        const store = tx.objectStore(RECORDS);
        store.clear();
        appliedRecords.forEach((record) => store.put(record));
        tx.objectStore(META).put({ backendUrl, recordMeta: capturedMeta });
        done({ records: appliedRecords, drafts, recordMeta: capturedMeta });
      });
    });
  }

  return { stageDraft, getDrafts, acknowledgeDraft, updateDraftReview, getWorkspaceMeta, mergeSnapshot, recordsEqual };
});
