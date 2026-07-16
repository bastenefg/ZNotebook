const DB_NAME = "labbook-db";
const DB_VERSION = 1;
const STORE = "experiments";
const TAXONOMY_KEY = "labbook-taxonomy-v1";
const DRIVE_SETTINGS_KEY = "definitely-not-notion-drive-v1";
const BACKEND_CREDENTIAL_KEY = "definitely-not-notion-backend-credential-v1";
const DEFAULT_SECTION_ID = "experiments";

const DEFAULT_STATUSES = [
  { value: "planned", label: "Planned" },
  { value: "in-progress", label: "In progress" },
  { value: "completed", label: "Completed" },
];

const DEFAULT_OUTCOMES = [
  { value: "pending", label: "Pending" },
  { value: "success", label: "Success" },
  { value: "failure", label: "Failure" },
];

const DEFAULT_FIELD_LABELS = {
  appName: "Definitely not Notion",
  notebook: "Notebook",
  details: "Details",
  title: "Title",
  startDate: "Start date",
  status: "Status",
  outcome: "Outcome",
  labels: "Labels",
  summary: "Summary",
  updated: "Updated",
  actions: "Actions",
};

const LABEL_FIELDS = [
  { key: "appName", label: "App title" },
  { key: "notebook", label: "Page label" },
  { key: "details", label: "Detail panel" },
  { key: "title", label: "Title field" },
  { key: "startDate", label: "Date field" },
  { key: "status", label: "Status field" },
  { key: "outcome", label: "Outcome field" },
  { key: "labels", label: "Tags field" },
  { key: "summary", label: "Summary field" },
  { key: "updated", label: "Updated field" },
];

const CUSTOM_FIELD_TYPES = [
  { value: "text", label: "Text" },
  { value: "date", label: "Date" },
  { value: "number", label: "Number" },
];

const BUILTIN_COLUMNS = {
  startDate: { id: "startDate", kind: "builtin", field: "startDate", type: "date" },
  status: { id: "status", kind: "builtin", field: "status", type: "status" },
  outcome: { id: "outcome", kind: "builtin", field: "outcome", type: "outcome" },
  labels: { id: "labels", kind: "builtin", field: "labels", type: "labels" },
};

const ICONS = {
  add: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.8 1.8 0 0 0-1.5 1z"/></svg>`,
  backup: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7"/><path d="M4 7l2-3h12l2 3"/><path d="M9 14l3 3 3-3"/><path d="M12 10v7"/></svg>`,
  download: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/></svg>`,
  print: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/><path d="M18 12h.01"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`,
  bold: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h7a4 4 0 0 1 0 8H7z"/><path d="M7 13h8a4 4 0 0 1 0 8H7z"/></svg>`,
  italic: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5h8M6 19h8M14 5l-4 14"/></svg>`,
  underline: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v6a5 5 0 0 0 10 0V5"/><path d="M5 21h14"/></svg>`,
  strikethrough: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 6.5A6 6 0 0 1 12 4c2.6 0 4.6 1 5.8 2.8"/><path d="M6 17.2A7.3 7.3 0 0 0 12 20c3.1 0 5-1.4 5-3.5 0-1.2-.6-2.1-1.9-2.7"/><path d="M4 12h16"/></svg>`,
  bulletList: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01"/></svg>`,
  orderedList: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M4 14h2l-2 4h2"/></svg>`,
  outdent: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 6h9M11 12h9M11 18h9"/><path d="M7 8l-4 4 4 4"/></svg>`,
  indent: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 6h9M11 12h9M11 18h9"/><path d="M3 8l4 4-4 4"/></svg>`,
  link: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1-.1l-2 2A5 5 0 0 0 12 20l1.1-1.1"/></svg>`,
  image: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M8 10h.01"/><path d="M21 15l-4.5-4.5L9 18"/></svg>`,
  video: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14l-4-4 4-4"/><path d="M5 10h9a6 6 0 1 1 0 12h-2"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l4-4-4-4"/><path d="M19 10h-9a6 6 0 1 0 0 12h2"/></svg>`,
  removeFormat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V5h11v2"/><path d="M9 5v7"/><path d="M12 19H5l9-9 5 5-4 4"/><path d="M5 19h14"/></svg>`,
};

const app = document.getElementById("app");
let db;
let experiments = [];
let activeExperiment = null;
let saveTimer = null;
let currentFilters = { search: "", showDeleted: false };
let taxonomy = loadTaxonomy();
let driveSettings = loadDriveSettings();
let driveState = {
  connected: false,
  accessToken: "",
  assetObjectUrls: [],
  recordModifiedTimes: {},
  status: "Local only",
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();

function defaultColumns() {
  return ["startDate", "status", "outcome", "labels"].map((key) => ({
    ...BUILTIN_COLUMNS[key],
    label: DEFAULT_FIELD_LABELS[key],
  }));
}

function defaultSection(name = "Experiment") {
  return {
    id: DEFAULT_SECTION_ID,
    name,
    columns: defaultColumns(),
  };
}

function loadTaxonomy() {
  try {
    const saved = JSON.parse(localStorage.getItem(TAXONOMY_KEY) || "{}");
    const labels = saved.labels && typeof saved.labels === "object" ? saved.labels : {};
    delete labels.recordSingular;
    delete labels.recordPlural;
    delete labels.record;

    let sections = Array.isArray(saved.sections)
      ? saved.sections.map(normalizeSection).filter(Boolean)
      : [];

    if (!sections.length) {
      sections = [defaultSection(saved.labels?.recordSingular || "Experiment")];
    }

    if (Array.isArray(saved.customFields)) {
      const first = sections.find((section) => section.id === DEFAULT_SECTION_ID) || sections[0];
      saved.customFields.forEach((field) => {
        if (!field || !field.id || !field.label) return;
        if (first.columns.some((column) => column.id === field.id)) return;
        first.columns.push({
          id: field.id,
          kind: "custom",
          label: String(field.label).trim(),
          type: validFieldType(field.type),
        });
      });
    }

    return {
      statuses: Array.isArray(saved.statuses) ? saved.statuses : [],
      outcomes: Array.isArray(saved.outcomes) ? saved.outcomes : [],
      labels,
      sections,
    };
  } catch {
    return {
      statuses: [],
      outcomes: [],
      labels: {},
      sections: [defaultSection()],
    };
  }
}

function normalizeSection(section) {
  if (!section || !section.name) return null;
  const seen = new Set();
  const columns = Array.isArray(section.columns) ? section.columns : [];
  return {
    id: section.id || `section-${slugifyOption(section.name)}`,
    name: String(section.name).trim(),
    columns: columns
      .map((column) => normalizeColumn(column))
      .filter(Boolean)
      .filter((column) => {
        if (seen.has(column.id)) return false;
        seen.add(column.id);
        return true;
      }),
  };
}

function loadDriveSettings() {
  const hosted = window.DEFINITELY_NOT_NOTION_CONFIG || {};
  try {
    const saved = JSON.parse(localStorage.getItem(DRIVE_SETTINGS_KEY) || "{}");
    return {
      clientId: saved.clientId || hosted.googleClientId || "",
      backendUrl: normalizeBackendUrl(saved.backendUrl || hosted.backendUrl || ""),
      configuredByHost: Boolean(hosted.googleClientId && hosted.backendUrl),
    };
  } catch {
    return {
      clientId: hosted.googleClientId || "",
      backendUrl: normalizeBackendUrl(hosted.backendUrl || ""),
      configuredByHost: Boolean(hosted.googleClientId && hosted.backendUrl),
    };
  }
}

function saveDriveSettings(settings) {
  const hosted = window.DEFINITELY_NOT_NOTION_CONFIG || {};
  driveSettings = {
    clientId: settings.clientId || "",
    backendUrl: normalizeBackendUrl(settings.backendUrl || ""),
    configuredByHost: Boolean(hosted.googleClientId && hosted.backendUrl),
  };
  localStorage.setItem(DRIVE_SETTINGS_KEY, JSON.stringify(driveSettings));
}

function normalizeBackendUrl(value = "") {
  return String(value).trim().replace(/\/+$/, "");
}

function normalizeColumn(column) {
  if (!column) return null;
  if (column.kind === "builtin" && BUILTIN_COLUMNS[column.field]) {
    return {
      ...BUILTIN_COLUMNS[column.field],
      label: String(column.label || DEFAULT_FIELD_LABELS[column.field]).trim(),
    };
  }
  if (!column.id || !column.label) return null;
  return {
    id: column.id,
    kind: "custom",
    label: String(column.label).trim(),
    type: validFieldType(column.type),
  };
}

function validFieldType(type) {
  return CUSTOM_FIELD_TYPES.some((item) => item.value === type) ? type : "text";
}

function saveTaxonomy() {
  localStorage.setItem(TAXONOMY_KEY, JSON.stringify(taxonomy));
  if (driveState.connected) {
    driveSaveConfig().catch(handleDriveError);
  }
}

function normalizeTaxonomyOptions(options) {
  const used = new Set();
  return (Array.isArray(options) ? options : [])
    .map((option) => {
      if (!option) return null;
      const label = String(option.label || option.value || "").trim();
      if (!label) return null;
      const value = String(option.value || slugifyOption(label)).trim();
      if (!value || used.has(value)) return null;
      used.add(value);
      return { value, label };
    })
    .filter(Boolean);
}

function normalizeBackupTaxonomy(value) {
  const source = value && typeof value === "object" ? value : {};
  const labels = source.labels && typeof source.labels === "object" ? source.labels : {};
  const importedSections = Array.isArray(source.sections)
    ? source.sections.map(normalizeSection).filter(Boolean)
    : [];
  const normalizedSections = importedSections.length ? importedSections : [defaultSection()];
  normalizedSections.forEach((section) => {
    if (!section.columns.length) section.columns = defaultColumns();
  });

  return {
    statuses: normalizeTaxonomyOptions(source.statuses),
    outcomes: normalizeTaxonomyOptions(source.outcomes),
    labels: Object.fromEntries(
      Object.entries(labels)
        .filter(([, label]) => String(label || "").trim())
        .map(([key, label]) => [key, String(label).trim()]),
    ),
    sections: normalizedSections,
  };
}

function term(key) {
  const saved = taxonomy.labels && taxonomy.labels[key];
  return saved || DEFAULT_FIELD_LABELS[key] || humanizeOption(key);
}

function termLower(key) {
  return term(key).toLowerCase();
}

function sections() {
  if (!Array.isArray(taxonomy.sections) || !taxonomy.sections.length) {
    taxonomy.sections = [defaultSection()];
  }
  return taxonomy.sections;
}

function sectionById(sectionId) {
  return sections().find((section) => section.id === sectionId) || sections()[0];
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function stripHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  return (template.content.textContent || "").replace(/\s+/g, " ").trim();
}

function sanitizeHtml(html = "") {
  const template = document.createElement("template");
  template.innerHTML = html;
  template.content
    .querySelectorAll("script, style, iframe, object, embed, link, meta")
    .forEach((node) => node.remove());

  template.content.querySelectorAll("*").forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      const allowedByTag = {
        A: ["href", "title", "target", "rel"],
        IMG: ["src", "alt", "title", "data-drive-file-id", "data-drive-mime"],
        VIDEO: ["src", "title", "controls", "data-drive-file-id", "data-drive-mime"],
        SOURCE: ["src", "type"],
      };
      const allowed = allowedByTag[element.tagName] || [];

      if (name.startsWith("on") || name === "style" || name === "class" || name === "id") {
        element.removeAttribute(attribute.name);
        return;
      }

      if (!allowed.includes(name)) {
        element.removeAttribute(attribute.name);
        return;
      }

      if ((name === "href" || name === "src") && /^javascript:/i.test(value)) {
        element.removeAttribute(attribute.name);
      }
    });

    if (element.tagName === "A" && element.getAttribute("href")) {
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }

    if (element.tagName === "VIDEO") {
      element.setAttribute("controls", "");
    }
  });

  return template.innerHTML;
}

function prepareContentForSave(html = "") {
  const clean = sanitizeHtml(html);
  const template = document.createElement("template");
  template.innerHTML = clean;
  template.content.querySelectorAll("[data-drive-file-id]").forEach((element) => {
    element.setAttribute("src", `drive-asset:${element.dataset.driveFileId}`);
  });
  return template.innerHTML;
}

async function hydrateDriveMedia(root) {
  if (!driveState.connected) return;
  const media = [...root.querySelectorAll("[data-drive-file-id]")];
  await Promise.all(
    media.map(async (element) => {
      try {
        const url = await driveBlobUrl(element.dataset.driveFileId);
        element.setAttribute("src", url);
      } catch (error) {
        console.warn("Could not load Drive media", error);
      }
    }),
  );
}

function humanizeOption(value = "") {
  const text = String(value).trim().replace(/[-_]+/g, " ");
  if (!text) return "Unknown";
  return text.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function slugifyOption(value) {
  return (
    String(value)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || uid()
  );
}

function uniqueValue(label, usedValues) {
  const base = slugifyOption(label);
  let value = base;
  let count = 2;

  while (usedValues.has(value)) {
    value = `${base}-${count}`;
    count += 1;
  }

  return value;
}

function uniquePrefixedId(prefix, label, usedValues) {
  const base = `${prefix}-${slugifyOption(label)}`;
  let value = base;
  let count = 2;

  while (usedValues.has(value)) {
    value = `${base}-${count}`;
    count += 1;
  }

  return value;
}

function formatDate(value) {
  if (!value) return "No date";
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatUpdated(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function classFor(prefix, value) {
  const defaults = prefix === "status" ? DEFAULT_STATUSES : DEFAULT_OUTCOMES;
  const isDefault = defaults.some((option) => option.value === value);
  return isDefault ? `${prefix}-${value}` : `${prefix}-custom`;
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("startDate", "startDate");
        store.createIndex("status", "status");
        store.createIndex("outcome", "outcome");
        store.createIndex("updatedAt", "updatedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function tx(mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
}

function getAllExperiments() {
  return new Promise((resolve, reject) => {
    const request = tx().getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

function getExperiment(id) {
  return new Promise((resolve, reject) => {
    const request = tx().get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function putExperiment(experiment) {
  return new Promise((resolve, reject) => {
    const request = tx("readwrite").put(experiment);
    request.onsuccess = () => resolve(experiment);
    request.onerror = () => reject(request.error);
  });
}

function isDeletedRecord(record) {
  return Boolean(record && record.deletedAt);
}

function replaceAllExperiments(records) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    const store = transaction.objectStore(STORE);
    store.clear();
    records.forEach((record) => store.put(record));
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function saveExperimentRecord(experiment) {
  await putExperiment(experiment);
  if (driveState.connected) {
    await driveSaveRecord(experiment);
  }
}

async function markExperimentDeleted(experiment) {
  const timestamp = now();
  const deletedRecord = {
    ...experiment,
    deletedAt: experiment.deletedAt || timestamp,
    updatedAt: timestamp,
  };
  await saveExperimentRecord(deletedRecord);
  return deletedRecord;
}

async function restoreExperimentRecord(experiment) {
  const restoredRecord = {
    ...experiment,
    deletedAt: "",
    updatedAt: now(),
  };
  delete restoredRecord.deletedAt;
  await saveExperimentRecord(restoredRecord);
  return restoredRecord;
}

function createExperiment(section, seed = {}) {
  const timestamp = now();
  return {
    id: uid(),
    sectionId: section.id,
    title: seed.title || `Untitled ${section.name}`,
    startDate: seed.startDate || today(),
    status: seed.status || "planned",
    outcome: seed.outcome || "pending",
    labels: seed.labels || [],
    summary: seed.summary || "",
    customFields: seed.customFields || {},
    content:
      seed.content ||
      `<h2>${escapeHtml(section.name)} notes</h2><p></p><h2>Details</h2><ul><li></li></ul>`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function loadExperiments() {
  experiments = await getAllExperiments();
  experiments.forEach((experiment) => {
    if (!experiment.sectionId) experiment.sectionId = DEFAULT_SECTION_ID;
    if (!experiment.customFields || typeof experiment.customFields !== "object") {
      experiment.customFields = {};
    }
  });
  experiments.sort((a, b) => {
    const dateSort = (b.startDate || "").localeCompare(a.startDate || "");
    if (dateSort !== 0) return dateSort;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });
}

function taxonomyOptions(kind) {
  const defaults = kind === "statuses" ? DEFAULT_STATUSES : DEFAULT_OUTCOMES;
  const custom = taxonomy[kind] || [];
  const field = kind === "statuses" ? "status" : "outcome";
  const seen = new Set();
  const options = [];

  [...defaults, ...custom].forEach((option) => {
    if (!option || !option.value || seen.has(option.value)) return;
    seen.add(option.value);
    options.push({
      value: option.value,
      label: option.label || humanizeOption(option.value),
    });
  });

  experiments.forEach((experiment) => {
    const value = experiment[field];
    if (!value || seen.has(value)) return;
    seen.add(value);
    options.push({ value, label: humanizeOption(value) });
  });

  return options.sort((a, b) => {
    const aDefault = defaults.some((option) => option.value === a.value);
    const bDefault = defaults.some((option) => option.value === b.value);
    if (aDefault !== bDefault) return aDefault ? -1 : 1;
    return a.label.localeCompare(b.label);
  });
}

function taxonomyLabel(kind, value) {
  const option = taxonomyOptions(kind).find((item) => item.value === value);
  return option ? option.label : humanizeOption(value);
}

function addTaxonomyOption(kind, label) {
  const cleanLabel = String(label || "").trim().replace(/\s+/g, " ");
  if (!cleanLabel) return null;

  const options = taxonomyOptions(kind);
  const match = options.find(
    (option) =>
      option.value.toLowerCase() === cleanLabel.toLowerCase() ||
      option.label.toLowerCase() === cleanLabel.toLowerCase(),
  );

  if (match) return match;

  const usedValues = new Set(options.map((option) => option.value));
  const option = {
    value: uniqueValue(cleanLabel, usedValues),
    label: cleanLabel,
  };
  taxonomy[kind] = [...(taxonomy[kind] || []), option].sort((a, b) =>
    a.label.localeCompare(b.label),
  );
  saveTaxonomy();
  return option;
}

function optionList(options, selected) {
  return options
    .map(
      (option) =>
        `<option value="${escapeHtml(option.value)}" ${
          selected === option.value ? "selected" : ""
        }>${escapeHtml(option.label)}</option>`,
    )
    .join("");
}

function sectionRecords(section) {
  const query = currentFilters.search.toLowerCase();
  return experiments.filter((experiment) => {
    if (experiment.sectionId !== section.id) return false;
    if (!currentFilters.showDeleted && isDeletedRecord(experiment)) return false;
    if (!query) return true;
    const haystack = [
      experiment.title,
      experiment.summary,
      stripHtml(experiment.content),
      taxonomyLabel("statuses", experiment.status),
      taxonomyLabel("outcomes", experiment.outcome),
      ...(experiment.labels || []),
      ...Object.values(experiment.customFields || {}),
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });
}

function renderShell(content) {
  revokeDriveObjectUrls();
  document.title = term("appName");
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="#/" aria-label="${escapeHtml(term("appName"))} home">
        <span class="brand-mark">DN</span>
        <span class="brand-text">
          <span class="brand-name">${escapeHtml(term("appName"))}</span>
          <span class="brand-subtitle">${escapeHtml(term("notebook"))}</span>
        </span>
      </a>
      <div class="topbar-actions">
        <span class="storage-state">${escapeHtml(driveState.status)}</span>
        ${
          driveState.connected
            ? `<button class="btn ghost" type="button" data-action="drive-sync">Sync now</button>`
            : ""
        }
        <button class="btn ghost" type="button" data-action="backup">${ICONS.backup} Backup</button>
        <button class="btn ghost" type="button" data-action="drive-settings">${
          driveState.connected ? "Drive settings" : "Connect Drive"
        }</button>
      </div>
    </header>
    ${content}
  `;
  app.querySelector("[data-action='drive-settings']").addEventListener("click", openDriveDialog);
  app.querySelector("[data-action='drive-sync']")?.addEventListener("click", syncDriveNow);
  app.querySelector("[data-action='backup']").addEventListener("click", openBackupDialog);
}

function revokeDriveObjectUrls() {
  driveState.assetObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  driveState.assetObjectUrls = [];
}

function resetDriveState(status = "Local only") {
  driveState = {
    connected: false,
    accessToken: "",
    assetObjectUrls: [],
    recordModifiedTimes: {},
    status,
  };
}

function renderListPage() {
  activeExperiment = null;
  renderShell(`
    <main class="page">
      <section class="page-header">
        <div>
          <p class="eyebrow">${escapeHtml(term("notebook"))}</p>
          <h1>Sections</h1>
        </div>
        <div class="page-actions">
          <button class="btn ghost" type="button" data-action="edit-labels">${ICONS.settings} Edit labels</button>
        </div>
      </section>

      <section class="panel filters" aria-label="Notebook search">
        <input class="field" type="search" placeholder="Search all sections" value="${escapeHtml(
          currentFilters.search,
        )}" data-filter="search" />
        <label class="filter-toggle">
          <input type="checkbox" data-filter="show-deleted" ${
            currentFilters.showDeleted ? "checked" : ""
          } />
          <span>Show deleted records</span>
        </label>
      </section>

      <div class="sections-stack">
        ${sections().map((section) => renderSectionTable(section)).join("")}
        <button class="add-section-tile" type="button" data-action="add-section">
          ${ICONS.add}
          <span>Add section</span>
        </button>
      </div>
    </main>
  `);

  app.querySelector("[data-action='edit-labels']").addEventListener("click", openLabelDialog);
  app.querySelector("[data-action='add-section']").addEventListener("click", openSectionDialog);
  app.querySelectorAll("[data-action='new-record']").forEach((button) => {
    button.addEventListener("click", () => openNewRecordDialog(button.dataset.sectionId));
  });
  app.querySelectorAll("[data-action='add-column']").forEach((button) => {
    button.addEventListener("click", () => openColumnDialog(button.dataset.sectionId));
  });
  app.querySelectorAll("[data-action='remove-column']").forEach((button) => {
    button.addEventListener("click", () =>
      removeColumn(button.dataset.sectionId, button.dataset.columnId),
    );
  });
  app.querySelector("[data-filter='search']").addEventListener("input", (event) => {
    currentFilters.search = event.target.value;
    renderListPage();
    const search = app.querySelector("[data-filter='search']");
    search.focus();
    search.setSelectionRange(search.value.length, search.value.length);
  });
  app.querySelector("[data-filter='show-deleted']").addEventListener("change", (event) => {
    currentFilters.showDeleted = event.target.checked;
    renderListPage();
  });
}

function renderSectionTable(section) {
  const rows = sectionRecords(section);
  return `
    <section class="section-block">
      <div class="section-heading">
        <div>
          <h2>${escapeHtml(section.name)}</h2>
          <span class="save-state">${rows.length} records</span>
        </div>
        <div class="section-actions">
          <button class="btn ghost" type="button" data-action="add-column" data-section-id="${escapeHtml(
            section.id,
          )}">${ICONS.add} Add column</button>
          <button class="btn primary" type="button" data-action="new-record" data-section-id="${escapeHtml(
            section.id,
          )}">${ICONS.add} New</button>
        </div>
      </div>

      <div class="panel experiments-table-wrap">
        ${
          rows.length
            ? renderRecordsTable(section, rows)
            : `<div class="empty compact-empty"><div><strong>No records yet.</strong><span>Add a new item or change the search.</span></div></div>`
        }
      </div>
    </section>
  `;
}

function renderRecordsTable(section, rows) {
  return `
    <table class="experiments-table">
      <thead>
        <tr>
          <th>${escapeHtml(section.name)}</th>
          ${section.columns.map((column) => renderColumnHeader(section, column)).join("")}
          <th>${escapeHtml(term("updated"))}</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((experiment) => renderRecordRow(section, experiment)).join("")}
      </tbody>
    </table>
  `;
}

function renderColumnHeader(section, column) {
  return `
    <th class="managed-th">
      <span>${escapeHtml(column.label)}</span>
      <button class="column-action" type="button" title="Remove ${escapeHtml(
        column.label,
      )}" aria-label="Remove ${escapeHtml(column.label)}" data-action="remove-column" data-section-id="${escapeHtml(
        section.id,
      )}" data-column-id="${escapeHtml(column.id)}">${ICONS.chevron}</button>
    </th>
  `;
}

function renderRecordRow(section, experiment) {
  const deleted = isDeletedRecord(experiment);
  return `
    <tr class="experiment-row ${deleted ? "deleted-record" : ""}">
      <td>
        <a class="row-link" href="#/record/${experiment.id}">${escapeHtml(experiment.title)}</a>
        ${deleted ? `<span class="deleted-badge">Deleted</span>` : ""}
        <span class="row-note">${escapeHtml(
          deleted
            ? `Deleted ${formatDateTime(experiment.deletedAt)}`
            : experiment.summary || stripHtml(experiment.content) || "No notes yet",
        )}</span>
      </td>
      ${section.columns.map((column) => `<td>${renderColumnValue(column, experiment)}</td>`).join("")}
      <td>${formatUpdated(experiment.updatedAt)}</td>
    </tr>
  `;
}

function renderColumnValue(column, experiment) {
  if (column.kind === "builtin") {
    if (column.field === "startDate") return escapeHtml(formatDate(experiment.startDate));
    if (column.field === "status") {
      return `<span class="pill ${classFor("status", experiment.status)}">${escapeHtml(
        taxonomyLabel("statuses", experiment.status),
      )}</span>`;
    }
    if (column.field === "outcome") {
      return `<span class="pill ${classFor("outcome", experiment.outcome)}">${escapeHtml(
        taxonomyLabel("outcomes", experiment.outcome),
      )}</span>`;
    }
    if (column.field === "labels") return renderLabels(experiment.labels || [], false);
  }

  const value = experiment.customFields && experiment.customFields[column.id];
  if (!value) return `<span class="subtle">-</span>`;
  if (column.type === "date") return escapeHtml(formatDate(value));
  return escapeHtml(String(value));
}

function renderLabels(labels, removable) {
  if (!labels.length) return `<span class="subtle">None</span>`;
  return `<div class="label-stack">${labels
    .map(
      (label) => `
        <span class="label-pill">
          ${escapeHtml(label)}
          ${
            removable
              ? `<button type="button" title="Remove ${escapeHtml(
                  label,
                )}" data-label-remove="${escapeHtml(label)}">x</button>`
              : ""
          }
        </span>
      `,
    )
    .join("")}</div>`;
}

function iconButton({ title, icon, command, extraAttribute = "" }) {
  const commandAttribute = command ? `data-command="${command}"` : extraAttribute;
  return `
    <button class="icon-btn" type="button" title="${title}" aria-label="${title}" ${commandAttribute}>
      ${ICONS[icon]}
    </button>
  `;
}

async function renderDetailPage(id) {
  activeExperiment = await getExperiment(id);

  if (!activeExperiment) {
    location.hash = "#/";
    return;
  }

  if (!activeExperiment.sectionId) activeExperiment.sectionId = DEFAULT_SECTION_ID;
  if (!activeExperiment.customFields || typeof activeExperiment.customFields !== "object") {
    activeExperiment.customFields = {};
  }

  const section = sectionById(activeExperiment.sectionId);
  const deleted = isDeletedRecord(activeExperiment);
  renderShell(`
    <main class="page">
      <section class="page-header">
        <div>
          <p class="eyebrow">${escapeHtml(section.name)}</p>
          <input class="detail-title" value="${escapeHtml(
            activeExperiment.title,
          )}" aria-label="${escapeHtml(term("title"))}" data-field="title" />
        </div>
        <div class="topbar-actions">
          <span class="save-state" data-save-state>Saved</span>
          <button class="btn ghost" type="button" data-action="export-current">${ICONS.print} Export</button>
          <a class="btn ghost" href="#/" title="Back to sections">Back</a>
        </div>
      </section>

      ${
        deleted
          ? `<section class="deleted-notice">
              <div>
                <strong>Deleted record</strong>
                <span>This record is hidden from normal tables but still exists in storage. Restore it to make it active again.</span>
              </div>
              <button class="btn primary" type="button" data-action="restore-current">Restore</button>
            </section>`
          : ""
      }

      <section class="detail-layout">
        <div class="panel editor-shell">
          ${renderEditorToolbar()}
          <article class="editor" contenteditable="true" data-placeholder="Start writing..." data-editor>${
            activeExperiment.content || ""
          }</article>
          <input class="hidden" type="file" accept="image/*" data-media-input="image" />
          <input class="hidden" type="file" accept="video/*" data-media-input="video" />
        </div>

        <aside class="panel meta-panel">
          <div class="meta-section">
            <p class="meta-title">${escapeHtml(term("details"))}</p>
            ${renderColumnInputs(section, activeExperiment, "data-detail-column")}
          </div>

          <div class="meta-section">
            <p class="meta-title">${escapeHtml(term("summary"))}</p>
            <textarea class="textarea" data-field="summary" placeholder="${escapeHtml(
              term("summary"),
            )}">${escapeHtml(activeExperiment.summary || "")}</textarea>
          </div>

          <div class="meta-section">
            <p class="meta-title">${escapeHtml(term("actions"))}</p>
            ${
              deleted
                ? `<button class="btn primary" type="button" data-action="restore-current">Restore</button>`
                : `<button class="btn danger" type="button" data-action="delete-current">Delete</button>`
            }
          </div>
        </aside>
      </section>
    </main>
  `);

  bindDetailPage(section);
  hydrateDriveMedia(app.querySelector("[data-editor]"));
}

function renderColumnInputs(section, experiment, attributeName) {
  return section.columns.map((column) => renderColumnInput(column, experiment, attributeName)).join("");
}

function renderColumnInput(column, experiment, attributeName) {
  if (column.kind === "builtin") {
    if (column.field === "startDate") {
      return `
        <div class="field-group">
          <label class="field-label" for="startDate">${escapeHtml(column.label)}</label>
          <input id="startDate" class="field" type="date" value="${escapeHtml(
            experiment.startDate || "",
          )}" data-field="startDate" />
        </div>
      `;
    }
    if (column.field === "status") {
      return `
        <div class="field-group">
          <label class="field-label" for="status">${escapeHtml(column.label)}</label>
          <div class="choice-row">
            <select id="status" class="select" data-field="status">
              ${optionList(taxonomyOptions("statuses"), experiment.status)}
            </select>
            <button class="icon-btn" type="button" title="Add ${escapeHtml(
              termLower("status"),
            )}" aria-label="Add ${escapeHtml(
              termLower("status"),
            )}" data-taxonomy-add="statuses" data-target-select="#status">${ICONS.add}</button>
          </div>
        </div>
      `;
    }
    if (column.field === "outcome") {
      return `
        <div class="field-group">
          <label class="field-label" for="outcome">${escapeHtml(column.label)}</label>
          <div class="choice-row">
            <select id="outcome" class="select" data-field="outcome">
              ${optionList(taxonomyOptions("outcomes"), experiment.outcome)}
            </select>
            <button class="icon-btn" type="button" title="Add ${escapeHtml(
              termLower("outcome"),
            )}" aria-label="Add ${escapeHtml(
              termLower("outcome"),
            )}" data-taxonomy-add="outcomes" data-target-select="#outcome">${ICONS.add}</button>
          </div>
        </div>
      `;
    }
    if (column.field === "labels") {
      if (attributeName === "data-new-column") {
        return `
          <div class="field-group">
            <label class="field-label" for="newLabels">${escapeHtml(column.label)}</label>
            <input id="newLabels" class="field" data-label-input placeholder="comma, separated ${escapeHtml(
              termLower("labels"),
            )}" />
          </div>
        `;
      }

      return `
        <div class="field-group">
          <label class="field-label">${escapeHtml(column.label)}</label>
          <div data-labels>${renderLabels(experiment.labels || [], true)}</div>
          <div class="label-input-row field-group">
            <input class="field" data-label-input placeholder="Add ${escapeHtml(termLower("labels"))}" />
            <button class="icon-btn" type="button" title="Add ${escapeHtml(
              termLower("labels"),
            )}" aria-label="Add ${escapeHtml(termLower("labels"))}" data-label-add>${ICONS.add}</button>
          </div>
        </div>
      `;
    }
  }

  const type = column.type === "date" || column.type === "number" ? column.type : "text";
  const value = experiment.customFields && experiment.customFields[column.id];
  return `
    <div class="field-group">
      <label class="field-label" for="${attributeName}-${escapeHtml(column.id)}">${escapeHtml(
        column.label,
      )}</label>
      <input id="${attributeName}-${escapeHtml(column.id)}" class="field" type="${type}" value="${escapeHtml(
        value || "",
      )}" ${attributeName}="${escapeHtml(column.id)}" />
    </div>
  `;
}

function renderEditorToolbar() {
  return `
    <div class="editor-toolbar" role="toolbar" aria-label="Editor toolbar">
      <div class="toolbar-group">
        <select class="select" data-command-block title="Text style" aria-label="Text style">
          <option value="P">Paragraph</option>
          <option value="H2">Heading</option>
          <option value="H3">Subheading</option>
          <option value="BLOCKQUOTE">Quote</option>
          <option value="PRE">Code block</option>
        </select>
      </div>
      <div class="toolbar-group">
        ${iconButton({ title: "Bold", icon: "bold", command: "bold" })}
        ${iconButton({ title: "Italic", icon: "italic", command: "italic" })}
        ${iconButton({ title: "Underline", icon: "underline", command: "underline" })}
        ${iconButton({ title: "Strikethrough", icon: "strikethrough", command: "strikeThrough" })}
      </div>
      <div class="toolbar-group">
        ${iconButton({ title: "Bulleted list", icon: "bulletList", command: "insertUnorderedList" })}
        ${iconButton({ title: "Numbered list", icon: "orderedList", command: "insertOrderedList" })}
        ${iconButton({ title: "Outdent", icon: "outdent", command: "outdent" })}
        ${iconButton({ title: "Indent", icon: "indent", command: "indent" })}
      </div>
      <div class="toolbar-group">
        ${iconButton({ title: "Link", icon: "link", extraAttribute: "data-command-link" })}
        ${iconButton({ title: "Image", icon: "image", extraAttribute: 'data-command-media="image"' })}
        ${iconButton({ title: "Video", icon: "video", extraAttribute: 'data-command-media="video"' })}
      </div>
      <div class="toolbar-group">
        ${iconButton({ title: "Undo", icon: "undo", command: "undo" })}
        ${iconButton({ title: "Redo", icon: "redo", command: "redo" })}
        ${iconButton({ title: "Remove format", icon: "removeFormat", command: "removeFormat" })}
      </div>
    </div>
  `;
}

function syncActiveExperimentFromDetail() {
  if (!activeExperiment) return;
  app.querySelectorAll("[data-field]").forEach((field) => {
    activeExperiment[field.dataset.field] = field.value;
  });
  app.querySelectorAll("[data-detail-column]").forEach((field) => {
    activeExperiment.customFields = activeExperiment.customFields || {};
    activeExperiment.customFields[field.dataset.detailColumn] = field.value;
  });
  const editor = app.querySelector("[data-editor]");
  if (editor) activeExperiment.content = editor.innerHTML;
}

function reportFieldValue(column, experiment) {
  if (column.kind === "builtin") {
    if (column.field === "startDate") return formatDate(experiment.startDate);
    if (column.field === "status") return taxonomyLabel("statuses", experiment.status);
    if (column.field === "outcome") return taxonomyLabel("outcomes", experiment.outcome);
    if (column.field === "labels") return (experiment.labels || []).join(", ") || "None";
  }

  const value = experiment.customFields && experiment.customFields[column.id];
  if (!value) return "None";
  if (column.type === "date") return formatDate(value);
  return String(value);
}

function buildReportRows(section, experiment) {
  const rows = section.columns.map((column) => ({
    label: column.label,
    value: reportFieldValue(column, experiment),
  }));
  if (isDeletedRecord(experiment)) {
    rows.push({ label: "Deleted", value: formatDateTime(experiment.deletedAt) });
  }
  rows.push(
    { label: term("updated"), value: formatDateTime(experiment.updatedAt) },
    { label: "Created", value: formatDateTime(experiment.createdAt) },
  );
  return rows;
}

function reportHtml(section, experiment) {
  const reportRows = buildReportRows(section, experiment);
  const summary = String(experiment.summary || "").trim();
  const content = sanitizeHtml(experiment.content || "<p>No notes yet.</p>");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(experiment.title)} report</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #15221b;
        --muted: #5d6e65;
        --line: #d7e0da;
        --soft: #f5f7f4;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        color: var(--ink);
        background: white;
        font-family:
          Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        line-height: 1.5;
      }

      main {
        max-width: 900px;
        margin: 0 auto;
        padding: 46px 42px 64px;
      }

      header {
        padding-bottom: 18px;
        border-bottom: 2px solid var(--ink);
      }

      .eyebrow {
        margin: 0 0 8px;
        color: var(--muted);
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1 {
        margin: 0;
        font-size: 34px;
        line-height: 1.15;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 0;
        margin-top: 22px;
        border: 1px solid var(--line);
      }

      .meta-item {
        min-height: 58px;
        padding: 11px 13px;
        border-right: 1px solid var(--line);
        border-bottom: 1px solid var(--line);
      }

      .meta-item:nth-child(2n) {
        border-right: 0;
      }

      .meta-label {
        display: block;
        color: var(--muted);
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .meta-value {
        display: block;
        margin-top: 5px;
        font-weight: 700;
        overflow-wrap: anywhere;
      }

      section {
        margin-top: 28px;
      }

      h2 {
        margin: 0 0 10px;
        font-size: 18px;
      }

      .summary {
        margin: 0;
        padding: 14px 16px;
        border-left: 4px solid var(--ink);
        background: var(--soft);
        color: #26342d;
      }

      .notes {
        overflow-wrap: anywhere;
      }

      .notes img,
      .notes video {
        max-width: 100%;
        height: auto;
        margin: 12px 0;
        border: 1px solid var(--line);
      }

      .notes table {
        width: 100%;
        border-collapse: collapse;
      }

      .notes th,
      .notes td {
        border: 1px solid var(--line);
        padding: 8px;
      }

      @media print {
        main {
          padding: 0;
        }

        .meta-grid {
          break-inside: avoid;
        }

        .notes img,
        .notes video {
          break-inside: avoid;
        }
      }

      @media (max-width: 680px) {
        main {
          padding: 28px 18px 44px;
        }

        .meta-grid {
          grid-template-columns: 1fr;
        }

        .meta-item {
          border-right: 0;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <p class="eyebrow">${escapeHtml(section.name)} report</p>
        <h1>${escapeHtml(experiment.title)}</h1>
      </header>

      <section aria-label="Record details">
        <div class="meta-grid">
          ${reportRows
            .map(
              (row) => `
                <div class="meta-item">
                  <span class="meta-label">${escapeHtml(row.label)}</span>
                  <span class="meta-value">${escapeHtml(row.value)}</span>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>

      ${
        summary
          ? `<section>
              <h2>${escapeHtml(term("summary"))}</h2>
              <p class="summary">${escapeHtml(summary)}</p>
            </section>`
          : ""
      }

      <section>
        <h2>Notes</h2>
        <div class="notes">${content}</div>
      </section>
    </main>
  </body>
</html>`;
}

function exportActiveExperiment(section) {
  syncActiveExperimentFromDetail();
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) {
    window.alert("Please allow pop-ups to export this report.");
    return;
  }

  reportWindow.document.open();
  reportWindow.document.write(reportHtml(section, activeExperiment));
  reportWindow.document.close();

  const printReport = () => {
    reportWindow.focus();
    reportWindow.print();
  };

  if (reportWindow.document.readyState === "complete") {
    window.setTimeout(printReport, 100);
  } else {
    reportWindow.addEventListener("load", printReport, { once: true });
  }
}

function bindDetailPage(section) {
  const editor = app.querySelector("[data-editor]");

  app.querySelectorAll("[data-field]").forEach((field) => {
    const eventName = field.tagName === "SELECT" || field.type === "date" ? "change" : "input";
    field.addEventListener(eventName, () => {
      activeExperiment[field.dataset.field] = field.value;
      scheduleSave();
    });
  });

  app.querySelectorAll("[data-detail-column]").forEach((field) => {
    const eventName = field.type === "date" ? "change" : "input";
    field.addEventListener(eventName, () => {
      activeExperiment.customFields = activeExperiment.customFields || {};
      activeExperiment.customFields[field.dataset.detailColumn] = field.value;
      scheduleSave();
    });
  });

  bindTaxonomyAddButtons(app);
  bindLabelControls();

  editor.addEventListener("input", () => {
    activeExperiment.content = editor.innerHTML;
    scheduleSave();
  });

  app.querySelectorAll("[data-command]").forEach((button) => {
    button.addEventListener("click", () => runCommand(button.dataset.command));
  });

  app.querySelector("[data-command-block]").addEventListener("change", (event) => {
    runCommand("formatBlock", event.target.value);
    event.target.value = "P";
  });

  app.querySelector("[data-command-link]").addEventListener("click", () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    runCommand("createLink", url);
  });

  app.querySelectorAll("[data-command-media]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = app.querySelector(`[data-media-input="${button.dataset.commandMedia}"]`);
      input.click();
    });
  });

  app.querySelectorAll("[data-media-input]").forEach((input) => {
    input.addEventListener("change", () => insertMedia(input));
  });

  app.querySelector("[data-action='export-current']").addEventListener("click", () => {
    exportActiveExperiment(section);
  });

  app.querySelectorAll("[data-action='restore-current']").forEach((button) => {
    button.addEventListener("click", async () => {
      activeExperiment = await restoreExperimentRecord(activeExperiment);
      await loadExperiments();
      await route();
    });
  });

  app.querySelector("[data-action='delete-current']")?.addEventListener("click", async () => {
    const confirmed = window.confirm(
      `Delete "${activeExperiment.title}"? It will be hidden in the app but kept in storage for recovery.`,
    );
    if (!confirmed) return;
    activeExperiment = await markExperimentDeleted(activeExperiment);
    await loadExperiments();
    location.hash = "#/";
  });
}

function bindTaxonomyAddButtons(root) {
  root.querySelectorAll("[data-taxonomy-add]").forEach((button) => {
    button.addEventListener("click", () => {
      const kind = button.dataset.taxonomyAdd;
      const noun = kind === "statuses" ? termLower("status") : termLower("outcome");
      const label = window.prompt(`New ${noun} name`);
      const option = addTaxonomyOption(kind, label);
      if (!option) return;

      const select = root.querySelector(button.dataset.targetSelect);
      if (!select) return;

      select.innerHTML = optionList(taxonomyOptions(kind), option.value);
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    });
  });
}

function bindLabelControls() {
  const input = app.querySelector("[data-label-input]");
  const button = app.querySelector("[data-label-add]");
  if (!input || !button) return;

  button.addEventListener("click", addLabel);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addLabel();
    }
  });
  bindRemoveLabelButtons();
}

function openLabelDialog() {
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <form class="panel dialog wide-dialog" data-label-form>
      <h2>Edit labels</h2>
      <div class="settings-grid">
        ${LABEL_FIELDS.map(
          (field) => `
            <div class="field-group">
              <label class="field-label" for="label-${field.key}">${escapeHtml(field.label)}</label>
              <input id="label-${field.key}" class="field" name="${field.key}" value="${escapeHtml(
                term(field.key),
              )}" />
            </div>
          `,
        ).join("")}
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn primary" type="submit">Save</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-label-form]");
  wireDialogClose(dialog);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    taxonomy.labels = taxonomy.labels || {};

    LABEL_FIELDS.forEach((field) => {
      const value = String(data.get(field.key) || "").trim();
      if (!value || value === DEFAULT_FIELD_LABELS[field.key]) {
        delete taxonomy.labels[field.key];
        return;
      }
      taxonomy.labels[field.key] = value;
    });

    syncBuiltinColumnLabels();
    saveTaxonomy();
    dialog.remove();
    await route();
  });
}

function syncBuiltinColumnLabels() {
  sections().forEach((section) => {
    section.columns = section.columns.map((column) => {
      if (column.kind !== "builtin") return column;
      return { ...column, label: term(column.field) };
    });
  });
}

function openSectionDialog() {
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <form class="panel dialog" data-section-form>
      <h2>Add section</h2>
      <div class="field-group">
        <label class="field-label" for="sectionName">Section name</label>
        <input id="sectionName" class="field" name="name" required placeholder="Meeting notes" />
      </div>
      <div class="field-group">
        <label class="field-label">Starting columns</label>
        <div class="checkbox-grid">
          ${Object.keys(BUILTIN_COLUMNS)
            .map(
              (key) => `
                <label class="check-row">
                  <input type="checkbox" name="builtin" value="${key}" ${
                    key === "startDate" || key === "labels" ? "checked" : ""
                  } />
                  <span>${escapeHtml(term(key))}</span>
                </label>
              `,
            )
            .join("")}
        </div>
      </div>
      <div class="field-group">
        <label class="field-label" for="sectionColumns">Extra columns</label>
        <input id="sectionColumns" class="field" name="columns" placeholder="Attendees, Decision, Owner" />
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn primary" type="submit">Create</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-section-form]");
  dialog.querySelector("#sectionName").focus();
  wireDialogClose(dialog);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) return;

    const used = new Set(sections().map((section) => section.id));
    const section = {
      id: uniquePrefixedId("section", name, used),
      name,
      columns: data
        .getAll("builtin")
        .map((key) => ({ ...BUILTIN_COLUMNS[key], label: term(key) })),
    };

    String(data.get("columns") || "")
      .split(",")
      .map((label) => label.trim())
      .filter(Boolean)
      .forEach((label) => {
        section.columns.push({
          id: uniqueColumnId(section, label),
          kind: "custom",
          label,
          type: "text",
        });
      });

    taxonomy.sections = [...sections(), section];
    saveTaxonomy();
    dialog.remove();
    await route();
  });
}

function openColumnDialog(sectionId) {
  const section = sectionById(sectionId);
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <form class="panel dialog" data-column-form>
      <h2>Add column</h2>
      <div class="field-group">
        <label class="field-label" for="columnKind">Column</label>
        <select id="columnKind" class="select" name="kind">
          <option value="custom">Custom column</option>
          ${Object.keys(BUILTIN_COLUMNS)
            .filter((key) => !section.columns.some((column) => column.id === key))
            .map((key) => `<option value="${key}">${escapeHtml(term(key))}</option>`)
            .join("")}
        </select>
      </div>
      <div class="field-group" data-custom-column-fields>
        <label class="field-label" for="columnLabel">Column label</label>
        <input id="columnLabel" class="field" name="label" placeholder="Owner" />
      </div>
      <div class="field-group" data-custom-column-fields>
        <label class="field-label" for="columnType">Column type</label>
        <select id="columnType" class="select" name="type">
          ${optionList(CUSTOM_FIELD_TYPES, "text")}
        </select>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn primary" type="submit">Add</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-column-form]");
  const kindSelect = dialog.querySelector("#columnKind");
  const labelInput = dialog.querySelector("#columnLabel");
  labelInput.focus();
  wireDialogClose(dialog);
  kindSelect.addEventListener("change", () => {
    const showCustom = kindSelect.value === "custom";
    dialog.querySelectorAll("[data-custom-column-fields]").forEach((field) => {
      field.classList.toggle("hidden", !showCustom);
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const kind = String(data.get("kind") || "custom");

    if (kind !== "custom") {
      section.columns.push({ ...BUILTIN_COLUMNS[kind], label: term(kind) });
    } else {
      const label = String(data.get("label") || "").trim();
      if (!label) return;
      section.columns.push({
        id: uniqueColumnId(section, label),
        kind: "custom",
        label,
        type: validFieldType(data.get("type")),
      });
    }

    saveTaxonomy();
    dialog.remove();
    await route();
  });
}

function uniqueColumnId(section, label) {
  return uniquePrefixedId("field", label, new Set(section.columns.map((column) => column.id)));
}

async function removeColumn(sectionId, columnId) {
  const section = sectionById(sectionId);
  const column = section.columns.find((item) => item.id === columnId);
  if (!column) return;

  const confirmed = window.confirm(`Remove the "${column.label}" column from ${section.name}?`);
  if (!confirmed) return;

  section.columns = section.columns.filter((item) => item.id !== columnId);
  saveTaxonomy();
  await route();
}

function wireDialogClose(dialog) {
  dialog.querySelector("[data-dialog-close]").addEventListener("click", () => dialog.remove());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.remove();
  });
}

function openDriveDialog() {
  const hasHostedConfig = Boolean(driveSettings.configuredByHost);
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <div class="panel dialog" data-drive-dialog>
      <h2>Notebook backend</h2>
      <p class="dialog-copy">${
        hasHostedConfig
          ? "Sign in with an allowed Google account. The private backend handles Drive storage."
          : "Add the backend setup values, then sign in with an allowed Google account."
      }</p>
      ${
        hasHostedConfig
          ? `<div class="config-summary">
              <strong>Configured by this site</strong>
              <span>Backend: ${escapeHtml(driveSettings.backendUrl || "Not set yet")}</span>
              <button class="btn ghost" type="button" data-action="show-drive-fields">Edit setup</button>
            </div>`
          : ""
      }
      <div class="field-group ${hasHostedConfig ? "hidden" : ""}" data-drive-advanced>
        <label class="field-label" for="driveClientId">Google OAuth Client ID</label>
        <input id="driveClientId" class="field" name="clientId" value="${escapeHtml(
          driveSettings.clientId,
        )}" placeholder="1234567890-abc.apps.googleusercontent.com" />
      </div>
      <div class="field-group ${hasHostedConfig ? "hidden" : ""}" data-drive-advanced>
        <label class="field-label" for="driveBackendUrl">Cloud Run backend URL</label>
        <input id="driveBackendUrl" class="field" name="backendUrl" value="${escapeHtml(
          driveSettings.backendUrl,
        )}" placeholder="https://znotebook-api-abc-uc.a.run.app" />
      </div>
      <div class="field-group">
        <label class="field-label">Google sign-in</label>
        <div data-google-signin></div>
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn ghost" type="button" data-action="save-drive-setup">Save setup</button>
        ${
          driveState.connected
            ? `<button class="btn ghost" type="button" data-action="drive-disconnect">Use local only</button>`
            : ""
        }
      </div>
    </div>
  `;

  document.body.appendChild(dialog);
  wireDialogClose(dialog);
  dialog.querySelector("[data-action='show-drive-fields']")?.addEventListener("click", () => {
    dialog.querySelectorAll("[data-drive-advanced]").forEach((field) => {
      field.classList.remove("hidden");
    });
    dialog.querySelector("[data-action='show-drive-fields']").classList.add("hidden");
  });
  dialog.querySelector("[data-action='save-drive-setup']").addEventListener("click", () => {
    const clientId = dialog.querySelector("#driveClientId")?.value.trim() || driveSettings.clientId;
    const backendUrl =
      dialog.querySelector("#driveBackendUrl")?.value.trim() || driveSettings.backendUrl;
    if (!clientId || !backendUrl) {
      window.alert("Add both the Google Client ID and Cloud Run backend URL.");
      return;
    }
    saveDriveSettings({ clientId, backendUrl });
    dialog.remove();
    openDriveDialog();
  });
  dialog.querySelector("[data-action='drive-disconnect']")?.addEventListener("click", async () => {
    localStorage.removeItem(BACKEND_CREDENTIAL_KEY);
    resetDriveState();
    dialog.remove();
    await route();
  });

  renderBackendSignIn(dialog.querySelector("[data-google-signin]"), dialog);
}

function openBackupDialog() {
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <div class="panel dialog">
      <h2>Backup</h2>
      <div class="backup-actions">
        <button class="btn" type="button" data-action="export-backup">${ICONS.download} Export JSON</button>
        <button class="btn" type="button" data-action="choose-import">${ICONS.upload} Import JSON</button>
      </div>
      <input class="hidden" type="file" accept="application/json,.json" data-backup-import />
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Close</button>
      </div>
    </div>
  `;

  document.body.appendChild(dialog);
  wireDialogClose(dialog);
  const input = dialog.querySelector("[data-backup-import]");
  dialog.querySelector("[data-action='export-backup']").addEventListener("click", exportNotebookBackup);
  dialog.querySelector("[data-action='choose-import']").addEventListener("click", () => input.click());
  input.addEventListener("change", async () => {
    await importNotebookBackup(input.files && input.files[0]);
    input.value = "";
    dialog.remove();
  });
}

async function exportNotebookBackup() {
  try {
    if (activeExperiment) {
      const editor = app.querySelector("[data-editor]");
      if (editor) {
        activeExperiment.updatedAt = now();
        activeExperiment.content = prepareContentForSave(editor.innerHTML);
        await putExperiment(activeExperiment);
        await loadExperiments();
      }
    }

    const backup = {
      app: "Definitely not Notion",
      version: 1,
      exportedAt: now(),
      taxonomy,
      records: experiments,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `definitely-not-notion-backup-${today()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error(error);
    window.alert(`Could not export backup: ${error.message || String(error)}`);
  }
}

async function importNotebookBackup(file) {
  if (!file) return;

  try {
    const parsed = JSON.parse(await file.text());
    const records = Array.isArray(parsed.records)
      ? parsed.records
      : Array.isArray(parsed.experiments)
        ? parsed.experiments
        : null;
    if (!records) {
      throw new Error("Backup file does not contain notebook records.");
    }

    const confirmed = window.confirm(
      driveState.connected
        ? "Importing a backup will switch this browser to local-only mode and replace local records. Continue?"
        : "Importing a backup will replace local sections and records in this browser. Continue?",
    );
    if (!confirmed) return;

    if (driveState.connected) resetDriveState();
    localStorage.setItem(TAXONOMY_KEY, JSON.stringify(normalizeBackupTaxonomy(parsed.taxonomy)));
    taxonomy = loadTaxonomy();
    await replaceAllExperiments(normalizeBackupRecords(records));
    await loadExperiments();
    driveState.status = "Backup imported";
    await route();
  } catch (error) {
    console.error(error);
    window.alert(`Could not import backup: ${error.message || String(error)}`);
  }
}

function normalizeBackupRecords(records) {
  const availableSections = sections();
  const sectionIds = new Set(availableSections.map((section) => section.id));
  const fallbackSectionId = availableSections[0]?.id || DEFAULT_SECTION_ID;

  return records
    .filter((record) => record && typeof record === "object")
    .map((record) => {
      const timestamp = now();
      const customFields =
        record.customFields && typeof record.customFields === "object"
          ? Object.fromEntries(
              Object.entries(record.customFields).map(([key, value]) => [
                String(key),
                String(value ?? ""),
              ]),
            )
          : {};

      const normalized = {
        id: String(record.id || uid()),
        sectionId: sectionIds.has(record.sectionId) ? record.sectionId : fallbackSectionId,
        title: String(record.title || "Untitled record"),
        startDate: String(record.startDate || today()),
        status: String(record.status || "planned"),
        outcome: String(record.outcome || "pending"),
        labels: Array.isArray(record.labels) ? record.labels.map((label) => String(label)) : [],
        summary: String(record.summary || ""),
        customFields,
        content: sanitizeHtml(record.content || "<p></p>"),
        createdAt: String(record.createdAt || timestamp),
        updatedAt: String(record.updatedAt || timestamp),
      };
      if (record.deletedAt) normalized.deletedAt = String(record.deletedAt);
      return normalized;
    });
}

function loadGoogleIdentityScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector("script[data-google-identity]");
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function renderBackendSignIn(container, dialog) {
  if (!container) return;
  if (!driveSettings.clientId || !driveSettings.backendUrl) {
    container.innerHTML = `<p class="dialog-copy">Add the Google Client ID and Cloud Run backend URL first.</p>`;
    return;
  }

  try {
    await loadGoogleIdentityScript();
    google.accounts.id.initialize({
      client_id: driveSettings.clientId,
      callback: async (response) => {
        if (!response.credential) return;
        try {
          localStorage.setItem(BACKEND_CREDENTIAL_KEY, response.credential);
          dialog.remove();
          await connectDrive(response.credential);
        } catch (error) {
          handleDriveError(error);
          await route();
        }
      },
    });
    google.accounts.id.renderButton(container, {
      theme: "outline",
      size: "large",
      type: "standard",
      text: "signin_with",
      shape: "rectangular",
      width: 260,
    });
  } catch (error) {
    container.innerHTML = `<p class="dialog-copy">Google sign-in could not load.</p>`;
    console.error(error);
  }
}

async function connectDrive(credential) {
  if (!driveSettings.clientId || !driveSettings.backendUrl) {
    throw new Error("Backend storage is not configured yet.");
  }

  driveState.accessToken = credential;
  driveState.status = "Connecting...";
  await route();

  const workspace = await backendRequest("/workspace/init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taxonomy, records: experiments }),
  });
  await applyWorkspaceSnapshot(workspace);
  driveState.connected = true;
  driveState.status = "Backend connected";
  await route();
}

async function tryAutoConnectBackend() {
  if (!driveSettings.backendUrl || !driveSettings.clientId) return;
  const credential = localStorage.getItem(BACKEND_CREDENTIAL_KEY);
  if (!isJwtLikelyValid(credential)) return;

  try {
    await connectDrive(credential);
  } catch (error) {
    console.warn("Could not reconnect to backend", error);
    localStorage.removeItem(BACKEND_CREDENTIAL_KEY);
    resetDriveState();
  }
}

function isJwtLikelyValid(token) {
  try {
    const payloadPart = String(token).split(".")[1] || "";
    const normalized = payloadPart.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded));
    return payload.exp && payload.exp * 1000 > Date.now() + 60000;
  } catch {
    return false;
  }
}

async function initializeDriveWorkspace() {
  return null;
}

async function loadDriveWorkspace() {
  const workspace = await backendRequest("/workspace");
  await applyWorkspaceSnapshot(workspace);
}

async function applyWorkspaceSnapshot(workspace) {
  if (workspace && workspace.taxonomy) {
    taxonomy = {
      statuses: Array.isArray(workspace.taxonomy.statuses) ? workspace.taxonomy.statuses : [],
      outcomes: Array.isArray(workspace.taxonomy.outcomes) ? workspace.taxonomy.outcomes : [],
      labels:
        workspace.taxonomy.labels && typeof workspace.taxonomy.labels === "object"
          ? workspace.taxonomy.labels
          : {},
      sections: Array.isArray(workspace.taxonomy.sections)
        ? workspace.taxonomy.sections.map(normalizeSection).filter(Boolean)
        : [defaultSection()],
    };
    localStorage.setItem(TAXONOMY_KEY, JSON.stringify(taxonomy));
  }

  driveState.recordModifiedTimes = Object.fromEntries(
    Object.entries(workspace?.recordMeta || {}).map(([id, meta]) => [
      id,
      String(meta.modifiedTime || ""),
    ]),
  );

  if (Array.isArray(workspace?.records)) {
    await replaceAllExperiments(workspace.records);
    await loadExperiments();
  }
}

async function syncDriveNow() {
  if (!driveState.connected) return;
  try {
    driveState.status = "Syncing...";
    await route();
    await loadDriveWorkspace();
    driveState.status = `Synced ${new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
    await route();
  } catch (error) {
    handleDriveError(error);
    await route();
  }
}

async function driveSaveConfig() {
  if (!driveState.connected) return;
  await backendRequest("/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ taxonomy }),
  });
}

async function driveSaveRecord(experiment) {
  if (!driveState.connected) return;
  const payload = {
    record: experiment,
    lastKnownModifiedTime: driveState.recordModifiedTimes[experiment.id] || "",
    force: false,
  };

  try {
    const saved = await backendRequest(`/records/${encodeURIComponent(experiment.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    driveState.recordModifiedTimes[experiment.id] = saved.modifiedTime || "";
  } catch (error) {
    if (error.status !== 409) throw error;
    const overwrite = window.confirm(
      `"${experiment.title}" changed in Google Drive since you last loaded it. Overwrite the Drive version with your current edits?`,
    );
    if (!overwrite) {
      driveState.status = "Sync needed";
      throw createDriveConflictError("Save cancelled to avoid overwriting newer Drive changes.");
    }

    payload.force = true;
    const saved = await backendRequest(`/records/${encodeURIComponent(experiment.id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    driveState.recordModifiedTimes[experiment.id] = saved.modifiedTime || "";
  }
}

async function driveDeleteRecord(id) {
  throw new Error(
    `Hard deletion is disabled for Drive records (${id}). Mark the record deleted instead.`,
  );
}

async function driveUploadAsset(recordId, file) {
  const form = new FormData();
  form.append("file", file, file.name || "asset");
  return backendRequest(`/records/${encodeURIComponent(recordId)}/assets`, {
    method: "POST",
    body: form,
  });
}

async function driveBlobUrl(fileId) {
  const response = await backendFetch(`/assets/${encodeURIComponent(fileId)}`);
  if (!response.ok) {
    throw await backendError(response);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  driveState.assetObjectUrls.push(url);
  return url;
}

async function backendRequest(path, options = {}) {
  const response = await backendFetch(path, options);
  if (!response.ok) throw await backendError(response);
  if (response.status === 204) return null;
  return response.json();
}

async function backendFetch(path, options = {}) {
  if (!driveSettings.backendUrl) throw new Error("Cloud Run backend URL is not configured.");
  return fetch(`${driveSettings.backendUrl}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${driveState.accessToken}`,
    },
  });
}

async function backendError(response) {
  let message = `Notebook backend request failed with ${response.status}`;
  try {
    const body = await response.json();
    if (body && body.error) message = body.error;
  } catch {
    const text = await response.text().catch(() => "");
    if (text) message = text;
  }

  const error = new Error(message);
  error.status = response.status;
  return error;
}

function handleDriveError(error) {
  console.error(error);
  if (error.status === 401) {
    localStorage.removeItem(BACKEND_CREDENTIAL_KEY);
  }
  driveState.connected = false;
  driveState.accessToken = "";
  driveState.status = "Backend error";
  window.alert(error.message || String(error));
}

function createDriveConflictError(message) {
  const error = new Error(message);
  error.driveConflict = true;
  return error;
}

function isDriveConflictError(error) {
  return Boolean(error && error.driveConflict);
}

function runCommand(command, value = null) {
  const editor = app.querySelector("[data-editor]");
  editor.focus();
  document.execCommand(command, false, value);
  activeExperiment.content = editor.innerHTML;
  scheduleSave();
}

async function insertMedia(input) {
  const file = input.files && input.files[0];
  if (!file) return;

  if (driveState.connected) {
    try {
      setSaveState("Uploading media...");
      const uploaded = await driveUploadAsset(activeExperiment.id, file);
      const previewUrl = URL.createObjectURL(file);
      driveState.assetObjectUrls.push(previewUrl);
      insertMediaMarkup(input.dataset.mediaInput, previewUrl, file.name, uploaded.id, file.type);
      input.value = "";
    } catch (error) {
      handleDriveError(error);
    }
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    insertMediaMarkup(input.dataset.mediaInput, reader.result, file.name);
    input.value = "";
  };
  reader.readAsDataURL(file);
}

function insertMediaMarkup(kind, src, fileName, driveFileId = "", mimeType = "") {
  const editor = app.querySelector("[data-editor]");
  editor.focus();
  const safeName = escapeHtml(fileName || "media");
  const driveAttrs = driveFileId
    ? ` data-drive-file-id="${escapeHtml(driveFileId)}" data-drive-mime="${escapeHtml(mimeType)}"`
    : "";
  const markup =
    kind === "video"
      ? `<video controls src="${src}" title="${safeName}"${driveAttrs}></video><p></p>`
      : `<img src="${src}" alt="${safeName}"${driveAttrs} /><p></p>`;
  document.execCommand("insertHTML", false, markup);
  activeExperiment.content = editor.innerHTML;
  scheduleSave();
}

function addLabel() {
  const input = app.querySelector("[data-label-input]");
  const value = input.value.trim();
  if (!value) return;

  const labels = new Set(activeExperiment.labels || []);
  labels.add(value);
  activeExperiment.labels = [...labels].sort((a, b) => a.localeCompare(b));
  input.value = "";
  renderLabelArea();
  scheduleSave();
}

function bindRemoveLabelButtons() {
  app.querySelectorAll("[data-label-remove]").forEach((button) => {
    button.addEventListener("click", () => {
      activeExperiment.labels = (activeExperiment.labels || []).filter(
        (label) => label !== button.dataset.labelRemove,
      );
      renderLabelArea();
      scheduleSave();
    });
  });
}

function renderLabelArea() {
  const area = app.querySelector("[data-labels]");
  if (!area) return;
  area.innerHTML = renderLabels(activeExperiment.labels || [], true);
  bindRemoveLabelButtons();
}

function setSaveState(label) {
  const state = app.querySelector("[data-save-state]");
  if (state) state.textContent = label;
}

function scheduleSave() {
  setSaveState("Saving...");
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveActiveExperiment, 350);
}

async function saveActiveExperiment() {
  if (!activeExperiment) return;
  try {
    activeExperiment.updatedAt = now();
    activeExperiment.content = prepareContentForSave(activeExperiment.content || "");
    await saveExperimentRecord(activeExperiment);
    await loadExperiments();
    setSaveState("Saved");
  } catch (error) {
    if (isDriveConflictError(error)) {
      console.warn(error.message || error);
      setSaveState("Sync needed");
      return;
    }
    console.error(error);
    setSaveState("Save failed");
    if (driveState.connected) {
      handleDriveError(error);
    } else {
      window.alert(error.message || String(error));
    }
  }
}

function openNewRecordDialog(sectionId) {
  const section = sectionById(sectionId);
  const draft = { customFields: {} };
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <form class="panel dialog" data-new-form>
      <h2>New ${escapeHtml(section.name)}</h2>
      <div class="field-group">
        <label class="field-label" for="newTitle">${escapeHtml(term("title"))}</label>
        <input id="newTitle" class="field" name="title" required placeholder="${escapeHtml(
          section.name,
        )}" />
      </div>
      ${renderColumnInputs(section, draft, "data-new-column")}
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn primary" type="submit">Create</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-new-form]");
  dialog.querySelector("#newTitle").focus();
  bindTaxonomyAddButtons(dialog);
  wireDialogClose(dialog);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const experiment = createExperiment(section, {
      title: data.get("title").trim(),
      startDate: data.get("startDate") || today(),
      status: data.get("status") || "planned",
      outcome: data.get("outcome") || "pending",
      labels: collectLabelString(dialog),
      customFields: collectCustomFields(dialog, "data-new-column"),
    });
    await saveExperimentRecord(experiment);
    await loadExperiments();
    dialog.remove();
    location.hash = `#/record/${experiment.id}`;
  });
}

function collectCustomFields(root, attributeName) {
  const values = {};
  root.querySelectorAll(`[${attributeName}]`).forEach((input) => {
    values[input.getAttribute(attributeName)] = input.value;
  });
  return values;
}

function collectLabelString(root) {
  const input = root.querySelector("[data-label-input]");
  if (!input) return [];
  return input.value
    .split(",")
    .map((label) => label.trim())
    .filter(Boolean);
}

async function seedIfEmpty() {
  const existing = await getAllExperiments();
  if (existing.length) return;

  const section = sectionById(DEFAULT_SECTION_ID);
  await saveExperimentRecord(
    createExperiment(section, {
      title: "Media condition pilot",
      startDate: today(),
      status: "in-progress",
      outcome: "pending",
      labels: ["pilot", "cell-culture"],
      summary: "Compare baseline media recipe against revised supplement timing.",
      content:
        "<h2>Aim</h2><p>Compare baseline media recipe against revised supplement timing.</p><h2>Protocol</h2><ul><li>Prepare two matched plates.</li><li>Apply supplement at 0h and 6h.</li><li>Capture images at 24h.</li></ul><h2>Observations</h2><p>Attach microscopy images and daily notes here.</p>",
    }),
  );
}

async function route() {
  const hash = location.hash || "#/";
  if (hash.startsWith("#/record/")) {
    await renderDetailPage(hash.replace("#/record/", ""));
    return;
  }
  if (hash.startsWith("#/experiment/")) {
    await renderDetailPage(hash.replace("#/experiment/", ""));
    return;
  }
  renderListPage();
}

async function init() {
  db = await openDb();
  await seedIfEmpty();
  await loadExperiments();
  window.addEventListener("hashchange", route);
  await tryAutoConnectBackend();
  await route();
}

init().catch((error) => {
  console.error(error);
  app.innerHTML = `
    <main class="page">
      <section class="panel empty">
        <div>
          <strong>${escapeHtml(term("appName"))} could not start.</strong>
          <span>${escapeHtml(error.message || String(error))}</span>
        </div>
      </section>
    </main>
  `;
});
