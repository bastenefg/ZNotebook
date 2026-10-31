const DB_NAME = "labbook-db";
const DB_VERSION = 2;
const STORE = "experiments";
const TAXONOMY_KEY = "labbook-taxonomy-v1";
const DRIVE_SETTINGS_KEY = "definitely-not-notion-drive-v1";
const BACKEND_CREDENTIAL_KEY = "definitely-not-notion-backend-credential-v1";
const TERMINATION_REMINDER_KEY = "infus-termination-reminders-dismissed-v1";
const TERMINATION_REMINDER_WINDOW_DAYS = 2;
const BACKEND_CONNECT_RETRY_DELAY_MS = 900;
const BACKEND_CONNECT_TIMEOUT_MS = 45000;
const EDITOR_IMAGE_MIN_WIDTH = 120;
const EDITOR_IMAGE_MAX_STORED_WIDTH = 4096;
const DEFAULT_SECTION_ID = "experiments";
const SURGERY_SECTION_ID = "__surgeries__";
const DEFAULT_RECORD_STATUS = "in-progress";
const DEFAULT_RECORD_OUTCOME = "pending";
const DEFAULT_RECORD_CONTENT = "<h2>Details</h2><ul><li></li></ul>";

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
  appName: "INFUS Notebook",
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
  arrowDown: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14"/><path d="m19 12-7 7-7-7"/></svg>`,
  arrowLeft: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>`,
  arrowRight: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  arrowUp: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5"/><path d="m5 12 7-7 7 7"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
  drive: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14.5 8.5 6h7l4.5 8.5"/><path d="M4 14.5 7 20h10l3-5.5z"/><path d="M8.5 6 12 14.5 15.5 6"/></svg>`,
  fileText: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>`,
  refresh: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7h-5V2"/><path d="M20 7a9 9 0 1 0 2 8"/></svg>`,
  search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>`,
  settings: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.8 1.8 0 0 0-2-.4 1.8 1.8 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.8 1.8 0 0 0-1-1.6 1.8 1.8 0 0 0-2 .4l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.8 1.8 0 0 0 .4-2 1.8 1.8 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.8 1.8 0 0 0 1.6-1 1.8 1.8 0 0 0-.4-2l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.8 1.8 0 0 0 2 .4 1.8 1.8 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.8 1.8 0 0 0 1 1.6 1.8 1.8 0 0 0 2-.4l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.8 1.8 0 0 0-.4 2 1.8 1.8 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.8 1.8 0 0 0-1.5 1z"/></svg>`,
  bell: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>`,
  backup: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7"/><path d="M4 7l2-3h12l2 3"/><path d="M9 14l3 3 3-3"/><path d="M12 10v7"/></svg>`,
  download: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/></svg>`,
  print: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/><path d="M18 12h.01"/></svg>`,
  chevron: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>`,
  pencil: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></svg>`,
  trash: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>`,
  restore: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3z"/><circle cx="12" cy="13" r="4"/></svg>`,
  clipboard: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="18" rx="2"/><path d="M9 4V2h6v2M9 9h6M9 13h6M9 17h4"/></svg>`,
  checkCircle: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16 9"/></svg>`,
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
  expand: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`,
  moveDiagonal: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M13 5h6v6M11 19H5v-6"/></svg>`,
  undo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 14l-4-4 4-4"/><path d="M5 10h9a6 6 0 1 1 0 12h-2"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 14l4-4-4-4"/><path d="M19 10h-9a6 6 0 1 0 0 12h2"/></svg>`,
  removeFormat: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7V5h11v2"/><path d="M9 5v7"/><path d="M12 19H5l9-9 5 5-4 4"/><path d="M5 19h14"/></svg>`,
};

const app = document.getElementById("app");
let db;
let experiments = [];
let activeExperiment = null;
let activeSurgery = null;
let saveTimer = null;
let editorImageResizeCleanup = null;
const recordSaveQueues = new Map();
const localSaveOperations = new Set();
const failedLocalWrites = new Map();
const latestLocalRevisions = new Map();
let pendingDrafts = [];
let renderedHash = "";
let importedLocalOnly = (() => {
  try { return localStorage.getItem("labbook-import-local-only") === "true"; } catch { return false; }
})();
let currentFilters = { search: "", showDeleted: false, showDeletedSections: false };
let surgeryFilters = {
  search: "",
  showDeleted: false,
  sortBy: { active: "performed", collected: "termination" },
  sortDirection: { active: "desc", collected: "desc" },
};
let taxonomy = loadTaxonomy();
let driveSettings = loadDriveSettings();
let connectionAttempt = null;
let googleIdentityPromise = null;
let backendWarmup = null;
let driveState = {
  connected: false,
  connecting: false,
  syncing: false,
  error: "",
  accessToken: "",
  assetObjectUrls: [],
  recordModifiedTimes: {},
  status: "Local only",
};

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const today = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
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
    const labels = normalizeSavedLabels(saved.labels);

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

function normalizeSavedLabels(value) {
  const labels = value && typeof value === "object" ? { ...value } : {};
  if (String(labels.appName || "").trim() === "Definitely not Notion") {
    delete labels.appName;
  }
  delete labels.recordSingular;
  delete labels.recordPlural;
  delete labels.record;
  return labels;
}

function normalizeSection(section) {
  if (!section || !section.name) return null;
  const seen = new Set();
  const columns = Array.isArray(section.columns) ? section.columns : [];
  const normalized = {
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
  if (section.deletedAt) normalized.deletedAt = String(section.deletedAt);
  return normalized;
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
  const labels = normalizeSavedLabels(source.labels);
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

function isDeletedSection(section) {
  return Boolean(section && section.deletedAt);
}

function visibleSections() {
  return sections().filter(
    (section) => currentFilters.showDeletedSections || !isDeletedSection(section),
  );
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
        IMG: ["src", "alt", "title", "width", "data-drive-file-id", "data-drive-mime"],
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

      if (element.tagName === "IMG" && name === "width") {
        const width = Number(value);
        if (
          !Number.isInteger(width) ||
          width < EDITOR_IMAGE_MIN_WIDTH ||
          width > EDITOR_IMAGE_MAX_STORED_WIDTH
        ) {
          element.removeAttribute(attribute.name);
        } else {
          element.setAttribute("width", String(width));
        }
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

function calendarDayNumber(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const date = new Date(timestamp);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return timestamp / 86400000;
}

function normalizeEndpointDays(value) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const days = Number(value);
  return Number.isInteger(days) && days >= 0 ? days : null;
}

function calculatePlannedTerminationDate(surgeryDate, endpointDays) {
  const startDay = calendarDayNumber(surgeryDate);
  const days = normalizeEndpointDays(endpointDays);
  if (startDay === null || days === null) return "";

  const date = new Date((startDay + days) * 86400000);
  const year = date.getUTCFullYear();
  if (Number.isNaN(date.getTime()) || year < 1 || year > 9999) return "";
  return date.toISOString().slice(0, 10);
}

function daysBetweenDates(startValue, endValue) {
  const startDay = calendarDayNumber(startValue);
  const endDay = calendarDayNumber(endValue);
  if (startDay === null || endDay === null) return null;
  return endDay - startDay;
}

function formatElapsedDays(days) {
  if (!Number.isInteger(days)) return "Not available";
  if (days < 0) return "Check dates";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

function formatEndpointDays(value) {
  const days = normalizeEndpointDays(value);
  return days === null ? "Not set" : formatElapsedDays(days);
}

function bindPlannedTerminationPreview(root) {
  const dateInput = root.querySelector("[data-surgery-date-input]");
  const endpointInput = root.querySelector("[data-endpoint-days-input]");
  const output = root.querySelector("[data-planned-termination-value]");
  if (!dateInput || !endpointInput || !output) return;

  const update = () => {
    const plannedDate = calculatePlannedTerminationDate(dateInput.value, endpointInput.value);
    output.textContent = plannedDate ? formatDate(plannedDate) : "Not set";
  };

  dateInput.addEventListener("input", update);
  endpointInput.addEventListener("input", update);
  update();
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

    request.onupgradeneeded = (event) => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("startDate", "startDate");
        store.createIndex("status", "status");
        store.createIndex("outcome", "outcome");
        store.createIndex("updatedAt", "updatedAt");
      }
      if (!database.objectStoreNames.contains("pendingWrites")) {
        database.createObjectStore("pendingWrites", { keyPath: "key" });
      }
      if (!database.objectStoreNames.contains("workspaceMeta")) {
        database.createObjectStore("workspaceMeta", { keyPath: "backendUrl" });
      }
      if (event.oldVersion === 1 && driveSettings.backendUrl && !importedLocalOnly) {
        const previous = request.transaction.objectStore(STORE).getAll();
        previous.onsuccess = () => {
          const drafts = request.transaction.objectStore("pendingWrites");
          previous.result.forEach((record) => drafts.put({
            key: `${driveSettings.backendUrl}\n${record.id}`, backendUrl: driveSettings.backendUrl,
            recordId: record.id, record, revision: uid(), baseModifiedTime: "", needsReview: true,
            reason: "Recovered from the previous app version. Compare this device's copy with Drive before saving.",
          }));
        };
      }
    };

    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onblocked = () => {
      app.textContent = "Close other notebook tabs, then reload to finish updating local save protection.";
    };
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
    const transaction = db.transaction(STORE, "readwrite", { durability: "strict" });
    transaction.objectStore(STORE).put(experiment);
    transaction.oncomplete = () => resolve(experiment);
    transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error("Local save was interrupted."));
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
    transaction.onabort = transaction.onerror = () => reject(transaction.error || new Error("Local import was interrupted."));
  });
}

function stageRecordSave(experiment) {
  // Capture the record now; navigation and later edits must not change this write.
  const record = JSON.parse(JSON.stringify(experiment));
  const backendUrl = importedLocalOnly ? "" : driveSettings.backendUrl;
  const revision = uid();
  latestLocalRevisions.set(record.id, revision);
  const draft = { key: `${backendUrl}\n${record.id}`, backendUrl, recordId: record.id, record, revision,
    baseModifiedTime: Object.prototype.hasOwnProperty.call(driveState.recordModifiedTimes, record.id)
      ? driveState.recordModifiedTimes[record.id] : undefined };
  const operation = Promise.resolve().then(async () => {
    try {
      if (backendUrl) await NotebookPersistence.stageDraft(db, draft);
      else await putExperiment(record);
      if (latestLocalRevisions.get(record.id) === revision) failedLocalWrites.delete(record.id);
      await refreshPendingDrafts();
      await loadExperiments();
    } catch (error) {
      if (latestLocalRevisions.get(record.id) === revision) failedLocalWrites.set(record.id, { record, error });
      throw error;
    } finally {
      localSaveOperations.delete(operation);
      updateSaveUi();
    }
  });
  localSaveOperations.add(operation);
  updateSaveUi();
  return operation;
}

async function waitForLocalSaves() {
  while (localSaveOperations.size) await Promise.allSettled([...localSaveOperations]);
  return failedLocalWrites.size === 0;
}

async function refreshPendingDrafts() {
  if (!db) return;
  pendingDrafts = driveSettings.backendUrl ? await NotebookPersistence.getDrafts(db, driveSettings.backendUrl) : [];
  updateSaveUi();
}

async function saveExperimentRecord(experiment) {
  await stageRecordSave(experiment);
  if (!importedLocalOnly) await flushRecordDraft(experiment.id);
}

function flushRecordDraft(recordId) {
  const backendUrl = driveSettings.backendUrl;
  const key = `${backendUrl}\n${recordId}`;
  if (recordSaveQueues.has(key)) return recordSaveQueues.get(key);
  if (!driveState.connected || driveState.connecting || driveState.readingWorkspace || importedLocalOnly) return Promise.resolve();
  const session = driveState;
  const credential = session.accessToken;
  const operation = withWorkspaceLock(backendUrl, async () => {
    while (driveState === session && session.connected && session.accessToken === credential && !session.connecting && !session.readingWorkspace) {
      const draft = (await NotebookPersistence.getDrafts(db, backendUrl)).find((item) => item.key === key);
      if (!draft || draft.needsReview) break;
      try {
        const saved = await driveSaveRecord(draft.record, draft.baseModifiedTime);
        if (!saved?.modifiedTime) throw new Error("Drive did not confirm the save. Reconnect to check it safely.");
        await NotebookPersistence.acknowledgeDraft(db, { key, revision: draft.revision, modifiedTime: saved.modifiedTime });
        if (driveState === session && driveSettings.backendUrl === backendUrl) {
          session.recordModifiedTimes[recordId] = saved.modifiedTime;
        }
      } catch (error) {
        if (error.status === 409) {
          await NotebookPersistence.updateDraftReview(db, { key, revision: draft.revision, reason: "The Drive copy changed. Your local draft is preserved." });
          // Mark the latest revision too: typing during the request must not bypass a conflict.
          const latest = (await NotebookPersistence.getDrafts(db, backendUrl)).find((item) => item.key === key);
          if (latest) await NotebookPersistence.updateDraftReview(db, { key, revision: latest.revision, reason: "The Drive copy changed. Your local draft is preserved." });
        } else if (driveState === session && session.accessToken === credential) {
          handleDriveError(error, { notify: false });
        }
        break;
      }
    }
  }).finally(async () => {
    if (recordSaveQueues.get(key) === operation) recordSaveQueues.delete(key);
    await refreshPendingDrafts();
  });
  recordSaveQueues.set(key, operation);
  updateSaveUi();
  return operation;
}

function withWorkspaceLock(backendUrl, action) {
  // Coordinate snapshot reads and writes between tabs sharing this browser.
  if (typeof navigator !== "undefined" && navigator.locks) {
    return navigator.locks.request(`notebook-workspace:${backendUrl}`, action);
  }
  return Promise.resolve().then(action);
}

async function flushPendingWrites() {
  if (!await waitForLocalSaves()) return false;
  await refreshPendingDrafts();
  // Serial uploads avoid a burst of Drive writes when an offline session reconnects.
  for (const draft of pendingDrafts) await flushRecordDraft(draft.recordId);
  return true;
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

function isSurgeryRecord(record) {
  return Boolean(record && record.recordType === "surgery");
}

function normalizedRecordDate(value, fallback = today()) {
  const candidate = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : fallback;
}

function normalizeSurgeryPhoto(photo) {
  if (!photo || typeof photo !== "object") return null;
  const driveFileId = String(photo.driveFileId || "").trim();
  const candidateDataUrl = String(photo.dataUrl || "").trim();
  const dataUrl = /^data:image\/[a-z0-9.+-]+;base64,/i.test(candidateDataUrl)
    ? candidateDataUrl
    : "";
  if (!driveFileId && !dataUrl) return null;

  return {
    id: String(photo.id || uid()),
    name: String(photo.name || "Surgery photo"),
    mimeType: String(photo.mimeType || "image/jpeg"),
    driveFileId,
    dataUrl,
    createdAt: String(photo.createdAt || now()),
  };
}

function normalizeSurgeryRecord(record) {
  const timestamp = now();
  const surgeryDate = normalizedRecordDate(record.surgeryDate || record.startDate);
  const normalized = {
    id: String(record.id || uid()),
    recordType: "surgery",
    sectionId: SURGERY_SECTION_ID,
    title: String(record.title || record.name || "Untitled surgery"),
    surgeryDate,
    startDate: surgeryDate,
    plannedEndpointDays: normalizeEndpointDays(record.plannedEndpointDays),
    surgeryNotes: String(record.surgeryNotes || record.notes || ""),
    surgeryPhotos: (Array.isArray(record.surgeryPhotos) ? record.surgeryPhotos : [])
      .map(normalizeSurgeryPhoto)
      .filter(Boolean),
    terminationDate: record.terminationDate
      ? normalizedRecordDate(record.terminationDate, surgeryDate)
      : "",
    terminationNotes: String(record.terminationNotes || ""),
    terminationPhotos: (Array.isArray(record.terminationPhotos) ? record.terminationPhotos : [])
      .map(normalizeSurgeryPhoto)
      .filter(Boolean),
    terminatedAt: String(record.terminatedAt || ""),
    createdAt: String(record.createdAt || timestamp),
    updatedAt: String(record.updatedAt || timestamp),
  };
  if (record.deletedAt) normalized.deletedAt = String(record.deletedAt);
  return normalized;
}

function createSurgery(seed = {}) {
  return normalizeSurgeryRecord({
    id: uid(),
    recordType: "surgery",
    title: seed.title || "Untitled surgery",
    surgeryDate: seed.surgeryDate || today(),
    plannedEndpointDays: seed.plannedEndpointDays,
    surgeryNotes: seed.surgeryNotes || "",
    surgeryPhotos: [],
    terminationDate: "",
    terminationNotes: "",
    terminationPhotos: [],
    createdAt: now(),
    updatedAt: now(),
  });
}

function createExperiment(section, seed = {}) {
  const timestamp = now();
  return {
    id: uid(),
    recordType: "notebook",
    sectionId: section.id,
    title: seed.title || `Untitled ${section.name}`,
    startDate: seed.startDate || today(),
    status: seed.status || DEFAULT_RECORD_STATUS,
    outcome: seed.outcome || DEFAULT_RECORD_OUTCOME,
    labels: seed.labels || [],
    summary: seed.summary || "",
    customFields: seed.customFields || {},
    content: seed.content || DEFAULT_RECORD_CONTENT,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function loadExperiments() {
  experiments = (await getAllExperiments()).map((experiment) => {
    if (isSurgeryRecord(experiment)) return normalizeSurgeryRecord(experiment);
    if (!experiment.recordType) experiment.recordType = "notebook";
    if (!experiment.sectionId) experiment.sectionId = DEFAULT_SECTION_ID;
    if (!experiment.customFields || typeof experiment.customFields !== "object") {
      experiment.customFields = {};
    }
    return experiment;
  });
  experiments.sort((a, b) => {
    const dateSort = (b.surgeryDate || b.startDate || "").localeCompare(
      a.surgeryDate || a.startDate || "",
    );
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
    if (isSurgeryRecord(experiment)) return false;
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

function loadDismissedTerminationReminders() {
  try {
    const saved = JSON.parse(localStorage.getItem(TERMINATION_REMINDER_KEY) || "[]");
    return new Set(Array.isArray(saved) ? saved.map(String) : []);
  } catch {
    return new Set();
  }
}

function terminationReminderKey(record, plannedDate) {
  return `${record.id}:${plannedDate}`;
}

function terminationReminderItems() {
  const dismissed = loadDismissedTerminationReminders();
  const currentDate = today();

  return surgeryRecords()
    .filter((record) => !record.terminationDate)
    .map((record) => {
      const plannedDate = calculatePlannedTerminationDate(
        record.surgeryDate,
        record.plannedEndpointDays,
      );
      const daysUntil = plannedDate ? daysBetweenDates(currentDate, plannedDate) : null;
      return {
        record,
        plannedDate,
        daysUntil,
        key: plannedDate ? terminationReminderKey(record, plannedDate) : "",
      };
    })
    .filter(
      (item) =>
        item.plannedDate &&
        Number.isInteger(item.daysUntil) &&
        item.daysUntil <= TERMINATION_REMINDER_WINDOW_DAYS &&
        !dismissed.has(item.key),
    )
    .sort(
      (a, b) =>
        a.plannedDate.localeCompare(b.plannedDate) ||
        a.record.title.localeCompare(b.record.title),
    );
}

function terminationReminderTiming(daysUntil) {
  if (daysUntil < -1) return `${Math.abs(daysUntil)} days overdue`;
  if (daysUntil === -1) return "1 day overdue";
  if (daysUntil === 0) return "Due today";
  if (daysUntil === 1) return "Due tomorrow";
  return `Due in ${daysUntil} days`;
}

function terminationReminderMarkup(items) {
  if (!items.length) return "";
  const visibleItems = items.slice(0, 4);
  const remaining = items.length - visibleItems.length;
  const heading =
    items.length === 1 ? "Termination reminder" : `${items.length} termination reminders`;

  return `
    <aside class="termination-reminder" aria-label="Planned termination reminders">
      <span class="termination-reminder-icon" aria-hidden="true">${ICONS.bell}</span>
      <div class="termination-reminder-content">
        <strong class="termination-reminder-title">${heading}</strong>
        <div class="termination-reminder-items">
          ${visibleItems
            .map(
              (item) => `
                <a class="termination-reminder-item" href="#/surgery/${escapeHtml(item.record.id)}">
                  <span class="termination-reminder-name">${escapeHtml(item.record.title)}</span>
                  <span class="termination-reminder-meta">
                    <span>${escapeHtml(formatDate(item.plannedDate))}</span>
                    <span class="termination-reminder-timing ${
                      item.daysUntil < 0 ? "is-overdue" : ""
                    }">${escapeHtml(terminationReminderTiming(item.daysUntil))}</span>
                  </span>
                </a>
              `,
            )
            .join("")}
          ${
            remaining > 0
              ? `<a class="termination-reminder-more" href="#/surgeries">View ${remaining} more</a>`
              : ""
          }
        </div>
      </div>
      <button class="icon-btn termination-reminder-dismiss" type="button" title="Dismiss reminders" aria-label="Dismiss termination reminders" data-action="dismiss-termination-reminders">${ICONS.close}</button>
    </aside>
  `;
}

function dismissTerminationReminders(items) {
  const dismissed = loadDismissedTerminationReminders();
  items.forEach((item) => dismissed.add(item.key));
  try {
    localStorage.setItem(
      TERMINATION_REMINDER_KEY,
      JSON.stringify(Array.from(dismissed).slice(-200)),
    );
  } catch {
    // The banner can still be hidden for this render when browser storage is unavailable.
  }
}

function renderShell(content) {
  editorImageResizeCleanup?.();
  editorImageResizeCleanup = null;
  revokeDriveObjectUrls();
  const surgeriesActive = /^#\/surger/.test(location.hash || "");
  const terminationReminders = terminationReminderItems();
  document.title = surgeriesActive ? `Surgeries | ${term("appName")}` : term("appName");
  app.innerHTML = `
    <header class="topbar">
      <div class="brand-navigation">
        <a class="brand" href="#/" aria-label="${escapeHtml(term("appName"))} home">
          <span class="brand-mark" aria-hidden="true">INFUS</span>
          <span class="brand-text">
            <span class="brand-name">${escapeHtml(term("appName"))}</span>
            <span class="brand-subtitle">${escapeHtml(term("notebook"))}</span>
          </span>
        </a>
        <nav class="primary-navigation" aria-label="Primary navigation">
          <a class="primary-nav-link ${surgeriesActive ? "" : "active"}" href="#/" ${
            surgeriesActive ? "" : 'aria-current="page"'
          }>Notebook</a>
          <a class="primary-nav-link ${surgeriesActive ? "active" : ""}" href="#/surgeries" ${
            surgeriesActive ? 'aria-current="page"' : ""
          }>Surgeries</a>
        </nav>
      </div>
      <div class="topbar-actions">
        <span class="storage-state ${driveState.connected ? "is-connected" : ""}" role="status" aria-live="polite">
          <span class="storage-dot" aria-hidden="true"></span>
          ${escapeHtml(driveState.status)}
        </span>
        ${
          driveState.connected
            ? `<button class="btn ghost topbar-button" type="button" title="Sync notebook" data-action="drive-sync">${ICONS.refresh}<span class="action-label">Sync</span></button>`
            : ""
        }
        <button class="btn ghost topbar-button" type="button" title="Backup notebook" data-action="backup">${ICONS.backup}<span class="action-label">Backup</span></button>
        <button class="btn drive-action ${driveState.connected ? "ghost" : "primary"}" type="button" title="${
          driveState.connected ? "Drive settings" : "Connect Drive"
        }" data-action="drive-settings">${ICONS.drive}<span class="action-label">${
          driveState.connected ? "Drive settings" : "Connect Drive"
        }</span></button>
      </div>
    </header>
    <section class="connection-feedback" data-connection-feedback role="status" aria-live="polite" aria-atomic="true"></section>
    <section class="connection-feedback" data-save-feedback role="status" aria-live="polite" aria-atomic="true" hidden></section>
    ${
      terminationReminders.length
        ? `<div class="global-alerts">${terminationReminderMarkup(terminationReminders)}</div>`
        : ""
    }
    ${content}
  `;
  app.querySelector("[data-action='drive-settings']").addEventListener("click", openDriveDialog);
  app.querySelector("[data-action='drive-sync']")?.addEventListener("click", syncDriveNow);
  app.querySelector("[data-action='backup']").addEventListener("click", openBackupDialog);
  updateConnectionUi();
  updateSaveUi();
  app
    .querySelector("[data-action='dismiss-termination-reminders']")
    ?.addEventListener("click", () => {
      dismissTerminationReminders(terminationReminders);
      app.querySelector(".global-alerts")?.remove();
    });
}

function revokeDriveObjectUrls() {
  driveState.assetObjectUrls.forEach((url) => URL.revokeObjectURL(url));
  driveState.assetObjectUrls = [];
}

function resetDriveState(status = "Local only") {
  connectionAttempt?.controller.abort();
  connectionAttempt = null;
  revokeDriveObjectUrls();
  driveState = {
    connected: false,
    connecting: false,
    syncing: false,
    error: "",
    accessToken: "",
    assetObjectUrls: [],
    recordModifiedTimes: {},
    status,
  };
}

function savedBackendCredential() {
  try {
    return localStorage.getItem(BACKEND_CREDENTIAL_KEY) || "";
  } catch {
    return "";
  }
}

function rememberBackendCredential(credential) {
  try {
    if (credential) localStorage.setItem(BACKEND_CREDENTIAL_KEY, credential);
    else localStorage.removeItem(BACKEND_CREDENTIAL_KEY);
  } catch {
    // Sign-in still works when the browser cannot persist a session.
  }
}

function updateConnectionUi() {
  const busy = driveState.connecting || driveState.syncing;
  const canRetry = Boolean(driveState.error && isJwtLikelyValid(savedBackendCredential()));
  const detail = driveState.error || (busy
    ? "Please wait. Your shared notebook is loading."
    : driveState.connected ? "Changes save to your shared Drive." : "Connect Drive to open the shared notebook.");
  const markup = `<span class="connection-indicator ${busy ? "is-spinning" : ""}" aria-hidden="true"></span>
    <div class="connection-copy"><strong>${escapeHtml(driveState.status)}</strong><span>${escapeHtml(detail)}</span></div>
    ${driveState.error && !busy ? `<button class="btn ghost" type="button" data-connection-retry>${canRetry ? "Retry connection" : "Sign in"}</button>` : ""}`;
  document.querySelectorAll("[data-connection-feedback]").forEach((element) => {
    element.classList.toggle("is-active", Boolean(busy || driveState.error));
    element.classList.toggle("has-error", Boolean(driveState.error));
    element.innerHTML = markup;
    element.querySelector("[data-connection-retry]")?.addEventListener("click", () => {
      if (canRetry) connectDrive(savedBackendCredential()).catch(() => {});
      else openDriveDialog();
    });
  });
  document.querySelectorAll(".storage-state").forEach((element) => {
    element.classList.toggle("is-connected", driveState.connected);
    element.innerHTML = `<span class="storage-dot" aria-hidden="true"></span>${escapeHtml(driveState.status)}`;
  });
  document.querySelectorAll("[data-action='drive-sync'], [data-action='backup']").forEach((button) => { button.disabled = busy; });
  document.querySelectorAll("[data-google-signin]").forEach((element) => { element.hidden = busy; });
  document.querySelectorAll("[data-action='save-drive-setup'], [data-action='drive-disconnect']").forEach((button) => { button.disabled = busy; });
  // Do not allow edits to race with replacement of the local Drive snapshot.
  const page = app.querySelector("main");
  if (page) {
    page.inert = busy;
    page.setAttribute("aria-busy", String(busy));
  }
  updateSaveUi();
}

function recordSaveLabel(recordId) {
  if (failedLocalWrites.has(recordId)) return "Not saved — keep this tab open";
  if (localSaveOperations.size) return "Saving on this device…";
  const draft = pendingDrafts.find((item) => item.recordId === recordId);
  if (draft?.needsReview) return "Saved on this device — review needed";
  if (draft) return driveState.connected ? "Saved on this device — waiting for Drive" : "Saved on this device — offline";
  return driveState.connected ? "Saved to Drive" : "Saved on this device";
}

function updateSaveUi() {
  const count = pendingDrafts.length;
  const failed = failedLocalWrites.size > 0;
  const review = pendingDrafts.some((draft) => draft.needsReview);
  const title = failed ? "Local save failed — keep this tab open" : localSaveOperations.size
    ? "Saving on this device…" : `${count} ${count === 1 ? "record is" : "records are"} waiting for Drive`;
  const detail = failed ? "Your latest edits are still in memory. Retry saving or download a recovery file before closing."
    : review ? "A Drive copy changed. Your draft is preserved on this device; review it before continuing."
    : "These edits are stored in this browser. Keep this device until Drive confirms the save; clearing browser data removes local drafts.";
  document.querySelectorAll("[data-save-feedback]").forEach((element) => {
    element.hidden = !failed && !count && !localSaveOperations.size;
    element.classList.toggle("is-active", !element.hidden);
    element.classList.toggle("has-error", failed || review);
    element.innerHTML = `<div class="connection-copy"><strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span></div>
      ${failed ? '<button class="btn ghost" data-retry-local>Retry saving</button>' : ""}
      ${review ? '<button class="btn ghost" data-review-drafts>Review drafts</button>' : ""}
      ${count || failed ? '<button class="btn ghost" data-export-drafts>Download recovery file</button>' : ""}`;
    element.querySelector("[data-retry-local]")?.addEventListener("click", async () => {
      await Promise.allSettled([...failedLocalWrites.values()].map(({ record }) => stageRecordSave(record)));
      flushPendingWrites().catch(reportLocalSaveError);
    });
    element.querySelector("[data-review-drafts]")?.addEventListener("click", openDraftReview);
    element.querySelector("[data-export-drafts]")?.addEventListener("click", exportPendingDrafts);
  });
  if (activeExperiment) setSaveState(recordSaveLabel(activeExperiment.id));
  if (activeSurgery) setSurgerySaveState(recordSaveLabel(activeSurgery.id));
}

function downloadRecoveryFile(records) {
  const blob = new Blob([JSON.stringify({ app: "INFUS Notebook", version: 1, exportedAt: now(), taxonomy, records }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `infus-unsynced-records-${today()}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportPendingDrafts() {
  await waitForLocalSaves();
  const records = new Map(pendingDrafts.map((draft) => [draft.recordId, draft.record]));
  failedLocalWrites.forEach(({ record }) => records.set(record.id, record));
  downloadRecoveryFile([...records.values()]);
}

function openDraftReview() {
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `<div class="panel dialog"><h2>Preserved drafts</h2>
    <p class="dialog-copy">These drafts differ from Drive. You can save each as a separate recovered record, then compare it with the original. The original Drive record stays unchanged. Recovery downloads contain record text and media references, not a complete photo backup.</p>
    ${pendingDrafts.filter((draft) => draft.needsReview).map((draft) => `<div class="field-group"><strong>${escapeHtml(draft.record.title || "Untitled record")}</strong><span>${escapeHtml(draft.reason || "Review needed")}</span><button class="btn" data-recover-draft="${escapeHtml(draft.recordId)}">Save as a separate recovered record</button></div>`).join("")}
    <div class="dialog-actions"><button class="btn ghost" data-dialog-close>Close</button></div></div>`;
  document.body.appendChild(dialog);
  wireDialogClose(dialog);
  dialog.querySelectorAll("[data-recover-draft]").forEach((button) => button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (!await waitForLocalSaves()) throw new Error("Retry the failed local save first.");
      const draft = (await NotebookPersistence.getDrafts(db, driveSettings.backendUrl)).find((item) => item.recordId === button.dataset.recoverDraft);
      if (!draft) return;
      const copy = { ...draft.record, id: uid(), title: `${draft.record.title || "Untitled record"} (recovered copy)`, createdAt: now(), updatedAt: now() };
      await stageRecordSave(copy);
      // Retire only the revision we copied, and only after the copy is durable.
      await NotebookPersistence.acknowledgeDraft(db, { key: draft.key, revision: draft.revision, modifiedTime: driveState.recordModifiedTimes[draft.recordId] || "" });
      await refreshPendingDrafts();
      await flushRecordDraft(copy.id);
      dialog.remove();
      if (driveState.connected) await syncDriveNow();
      location.hash = `#/record/${copy.id}`;
    } catch (error) {
      reportLocalSaveError(error);
      window.alert(error.message || String(error));
    } finally {
      button.disabled = false;
    }
  }));
}

function renderListPage() {
  activeExperiment = null;
  activeSurgery = null;
  const hasDeletedSections = sections().some(isDeletedSection);
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

      <section class="filters" aria-label="Notebook search and filters">
        <div class="search-control">
          ${ICONS.search}
          <input class="field" type="search" aria-label="Search all sections" placeholder="Search all sections" value="${escapeHtml(
            currentFilters.search,
          )}" data-filter="search" />
        </div>
        <label class="filter-toggle">
          <input type="checkbox" data-filter="show-deleted" ${
            currentFilters.showDeleted ? "checked" : ""
          } />
          <span>Show deleted records</span>
        </label>
        ${
          hasDeletedSections
            ? `<label class="filter-toggle">
                <input type="checkbox" data-filter="show-deleted-sections" ${
                  currentFilters.showDeletedSections ? "checked" : ""
                } />
                <span>Show deleted sections</span>
              </label>`
            : ""
        }
      </section>

      <div class="sections-stack">
        ${visibleSections().map((section) => renderSectionTable(section)).join("")}
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
  app.querySelectorAll("[data-action='rename-section']").forEach((button) => {
    button.addEventListener("click", () => openRenameSectionDialog(button.dataset.sectionId));
  });
  app.querySelectorAll("[data-action='delete-section']").forEach((button) => {
    button.addEventListener("click", () => deleteSection(button.dataset.sectionId));
  });
  app.querySelectorAll("[data-action='restore-section']").forEach((button) => {
    button.addEventListener("click", () => restoreSection(button.dataset.sectionId));
  });
  app.querySelectorAll("[data-action='remove-column']").forEach((button) => {
    button.addEventListener("click", () =>
      removeColumn(button.dataset.sectionId, button.dataset.columnId),
    );
  });
  app.querySelectorAll("[data-record-href]").forEach((row) => {
    row.addEventListener("click", (event) => {
      if (event.target.closest("a, button, input, select, textarea")) return;
      if (window.getSelection()?.toString()) return;
      location.hash = row.dataset.recordHref;
    });
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
  app.querySelector("[data-filter='show-deleted-sections']")?.addEventListener(
    "change",
    (event) => {
      currentFilters.showDeletedSections = event.target.checked;
      renderListPage();
    },
  );
}

function renderSectionTable(section) {
  const rows = sectionRecords(section);
  const recordCount = `${rows.length} ${rows.length === 1 ? "record" : "records"}`;
  const deleted = isDeletedSection(section);
  return `
    <section class="section-block ${deleted ? "deleted-section" : ""}">
      <div class="section-heading">
        <div class="section-title-group">
          <div class="section-title-row">
            <h2>${escapeHtml(section.name)}</h2>
            ${deleted ? `<span class="deleted-badge">Deleted</span>` : ""}
            ${
              deleted
                ? ""
                : `<div class="section-title-tools" aria-label="Section actions">
                    <button class="icon-btn compact" type="button" title="Rename section" aria-label="Rename ${escapeHtml(
                      section.name,
                    )}" data-action="rename-section" data-section-id="${escapeHtml(section.id)}">${ICONS.pencil}</button>
                    <button class="icon-btn compact danger-ghost" type="button" title="Delete section" aria-label="Delete ${escapeHtml(
                      section.name,
                    )}" data-action="delete-section" data-section-id="${escapeHtml(section.id)}">${ICONS.trash}</button>
                  </div>`
            }
          </div>
          <span class="save-state">${recordCount}${
            deleted ? ` · Deleted ${escapeHtml(formatDateTime(section.deletedAt))}` : ""
          }</span>
        </div>
        <div class="section-actions">
          ${
            deleted
              ? `<button class="btn primary" type="button" data-action="restore-section" data-section-id="${escapeHtml(
                  section.id,
                )}">${ICONS.restore} Restore section</button>`
              : `<button class="btn ghost" type="button" data-action="add-column" data-section-id="${escapeHtml(
                  section.id,
                )}">${ICONS.add} Add column</button>
                 <button class="btn primary" type="button" data-action="new-record" data-section-id="${escapeHtml(
                   section.id,
                 )}">${ICONS.add} New</button>`
          }
        </div>
      </div>

      <div class="panel experiments-table-wrap">
        ${
          rows.length
            ? renderRecordsTable(section, rows)
            : `<div class="empty compact-empty">
                <div class="empty-icon">${ICONS.fileText}</div>
                <div>
                  <strong>${currentFilters.search ? "No matching records" : "No records yet"}</strong>
                  <span>${currentFilters.search ? "Try a different search." : "Create the first record in this section."}</span>
                </div>
                ${
                  currentFilters.search
                    ? ""
                    : deleted
                      ? ""
                      : `<button class="btn primary" type="button" data-action="new-record" data-section-id="${escapeHtml(
                          section.id,
                        )}">${ICONS.add} New</button>`
                }
              </div>`
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
          <th scope="col">${escapeHtml(section.name)}</th>
          ${section.columns.map((column) => renderColumnHeader(section, column)).join("")}
          <th scope="col">${escapeHtml(term("updated"))}</th>
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
    <th class="managed-th" scope="col">
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
    <tr class="experiment-row ${deleted ? "deleted-record" : ""}" data-record-href="#/record/${escapeHtml(
      experiment.id,
    )}">
      <td data-label="${escapeHtml(section.name)}">
        <a class="row-link" href="#/record/${escapeHtml(experiment.id)}">${escapeHtml(
          experiment.title,
        )}</a>
        ${deleted ? `<span class="deleted-badge">Deleted</span>` : ""}
        <span class="row-note">${escapeHtml(
          deleted
            ? `Deleted ${formatDateTime(experiment.deletedAt)}`
            : experiment.summary || stripHtml(experiment.content) || "No notes yet",
        )}</span>
      </td>
      ${section.columns
        .map(
          (column) =>
            `<td data-label="${escapeHtml(column.label)}">${renderColumnValue(column, experiment)}</td>`,
        )
        .join("")}
      <td data-label="${escapeHtml(term("updated"))}">${formatUpdated(experiment.updatedAt)}</td>
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

function surgeryRecords({ includeDeleted = false } = {}) {
  return experiments.filter(
    (record) => isSurgeryRecord(record) && (includeDeleted || !isDeletedRecord(record)),
  );
}

function surgeryStorageLocked() {
  return Boolean(driveSettings.configuredByHost && !driveState.connected);
}

function requireSurgeryStorage() {
  if (!surgeryStorageLocked()) return true;
  openDriveDialog();
  return false;
}

function surgeryStorageNoticeMarkup() {
  if (!surgeryStorageLocked()) return "";
  return `
    <section class="storage-notice">
      <div>
        <strong>Connect Drive before adding or editing surgery records</strong>
        <span>This keeps card photos and procedure details in the shared private storage rather than only on this device.</span>
      </div>
      <button class="btn primary" type="button" data-action="connect-surgery-storage">${ICONS.drive} Connect Drive</button>
    </section>
  `;
}

function bindSurgeryStorageNotice(root = app) {
  root.querySelector("[data-action='connect-surgery-storage']")?.addEventListener("click", openDriveDialog);
}

function surgeryMatchesSearch(record, query) {
  if (!query) return true;
  return [
    record.title,
    record.surgeryDate,
    record.plannedEndpointDays,
    calculatePlannedTerminationDate(record.surgeryDate, record.plannedEndpointDays),
    record.surgeryNotes,
    record.terminationDate,
    record.terminationNotes,
  ]
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function surgerySortDate(record, view, sortBy) {
  if (sortBy === "termination") {
    return view === "collected"
      ? record.terminationDate
      : calculatePlannedTerminationDate(record.surgeryDate, record.plannedEndpointDays);
  }
  return record.surgeryDate;
}

function compareSurgeryRecords(a, b, view, sortBy, direction) {
  const aDate = surgerySortDate(a, view, sortBy);
  const bDate = surgerySortDate(b, view, sortBy);
  if (aDate && !bDate) return -1;
  if (!aDate && bDate) return 1;

  const dateOrder =
    direction === "asc"
      ? (aDate || "").localeCompare(bDate || "")
      : (bDate || "").localeCompare(aDate || "");
  return (
    dateOrder ||
    (b.updatedAt || "").localeCompare(a.updatedAt || "") ||
    a.title.localeCompare(b.title)
  );
}

function renderSurgeryPhotoImage(photo, className = "") {
  const normalized = normalizeSurgeryPhoto(photo);
  if (!normalized) return "";
  const sourceAttribute = normalized.dataUrl
    ? `src="${escapeHtml(normalized.dataUrl)}"`
    : "";
  const driveAttributes = normalized.driveFileId
    ? `data-drive-file-id="${escapeHtml(normalized.driveFileId)}" data-drive-mime="${escapeHtml(
        normalized.mimeType,
      )}"`
    : "";
  return `<img class="${className}" ${sourceAttribute} ${driveAttributes} alt="${escapeHtml(
    normalized.name,
  )}" />`;
}

function renderSurgeryThumbnail(record) {
  const photo = record.surgeryPhotos[0] || record.terminationPhotos[0];
  if (!photo) return `<div class="surgery-thumbnail empty-thumbnail">${ICONS.camera}</div>`;
  return `<div class="surgery-thumbnail">${renderSurgeryPhotoImage(photo, "surgery-thumbnail-image")}</div>`;
}

function renderSurgeryRow(record, collected) {
  const deleted = isDeletedRecord(record);
  const surgeryPhotoCount = record.surgeryPhotos.length;
  const collectionPhotoCount = record.terminationPhotos.length;
  const elapsedDays = collected
    ? daysBetweenDates(record.surgeryDate, record.terminationDate)
    : null;
  const plannedTerminationDate = collected
    ? ""
    : calculatePlannedTerminationDate(record.surgeryDate, record.plannedEndpointDays);
  return `
    <a class="surgery-row ${deleted ? "deleted-surgery" : ""}" href="#/surgery/${escapeHtml(
      record.id,
    )}">
      ${renderSurgeryThumbnail(record)}
      <div class="surgery-row-main">
        <div class="surgery-row-heading">
          <strong>${escapeHtml(record.title)}</strong>
          <span class="pill ${
            deleted ? "surgery-deleted" : collected ? "sample-collected" : "surgery-active"
          }">${deleted ? "Deleted" : collected ? "Collected" : "Active"}</span>
        </div>
        <span class="surgery-row-note">${escapeHtml(
          deleted
            ? `Deleted ${formatDateTime(record.deletedAt)}`
            : record.surgeryNotes || (collected ? record.terminationNotes : "No surgical notes"),
        )}</span>
      </div>
      <dl class="surgery-row-meta">
        <div>
          <dt>Surgery</dt>
          <dd>${escapeHtml(formatDate(record.surgeryDate))}</dd>
        </div>
        ${
          collected
            ? `<div><dt>Collected</dt><dd>${escapeHtml(formatDate(record.terminationDate))}</dd></div>`
            : ""
        }
        ${
          collected
            ? `<div class="surgery-duration"><dt>Days from surgery</dt><dd>${escapeHtml(
                formatElapsedDays(elapsedDays),
              )}</dd></div>`
            : ""
        }
        ${
          !collected
            ? `<div class="surgery-endpoint ${
                normalizeEndpointDays(record.plannedEndpointDays) === null ? "is-unset" : ""
              }"><dt>Endpoint</dt><dd>${escapeHtml(
                formatEndpointDays(record.plannedEndpointDays),
              )}</dd></div>`
            : ""
        }
        ${
          !collected
            ? `<div class="surgery-planned-date ${
                plannedTerminationDate ? "" : "is-unset"
              }" data-planned-termination-date="${escapeHtml(
                plannedTerminationDate,
              )}"><dt>Termination date</dt><dd>${escapeHtml(
                plannedTerminationDate ? formatDate(plannedTerminationDate) : "Not set",
              )}</dd></div>`
            : ""
        }
        <div>
          <dt>Photos</dt>
          <dd>${surgeryPhotoCount + collectionPhotoCount}</dd>
        </div>
      </dl>
      <span class="surgery-row-arrow" aria-hidden="true">${ICONS.arrowRight}</span>
    </a>
  `;
}

function renderSurgeriesPage(view = "active") {
  activeExperiment = null;
  activeSurgery = null;
  const selectedView = view === "collected" ? "collected" : "active";
  const allSurgeries = surgeryRecords({ includeDeleted: true });
  const liveSurgeries = allSurgeries.filter((record) => !isDeletedRecord(record));
  const activeRecords = liveSurgeries.filter((record) => !record.terminationDate);
  const collectedRecords = liveSurgeries.filter((record) => Boolean(record.terminationDate));
  const deletedRecords = allSurgeries.filter(
    (record) =>
      isDeletedRecord(record) &&
      (selectedView === "collected" ? Boolean(record.terminationDate) : !record.terminationDate),
  );
  const liveRecords = selectedView === "collected" ? collectedRecords : activeRecords;
  const sourceRecords = surgeryFilters.showDeleted
    ? [...liveRecords, ...deletedRecords]
    : liveRecords;
  const query = surgeryFilters.search.trim().toLowerCase();
  const sortBy = surgeryFilters.sortBy[selectedView] === "termination" ? "termination" : "performed";
  const sortDirection = surgeryFilters.sortDirection[selectedView] === "asc" ? "asc" : "desc";
  const visibleRecords = sourceRecords
    .filter((record) => surgeryMatchesSearch(record, query))
    .sort((a, b) => compareSurgeryRecords(a, b, selectedView, sortBy, sortDirection));

  renderShell(`
    <main class="page surgeries-page">
      <section class="page-header">
        <div>
          <p class="eyebrow">Animal procedures</p>
          <h1>Surgeries</h1>
        </div>
        <div class="page-actions surgery-page-actions">
          <button class="btn ghost" type="button" data-action="new-surgery-manual">${ICONS.add} Add manually</button>
          <button class="btn primary" type="button" data-action="take-surgery-photo">${ICONS.camera} Take picture</button>
        </div>
      </section>

      ${surgeryStorageNoticeMarkup()}

      <input class="hidden" type="file" accept="image/*" capture="environment" data-surgery-page-camera />

      <section class="surgery-controls" aria-label="Surgery records">
        <nav class="view-tabs" aria-label="Surgery status">
          <a class="view-tab ${selectedView === "active" ? "active" : ""}" href="#/surgeries" ${
            selectedView === "active" ? 'aria-current="page"' : ""
          }>
            <span>Active surgeries</span><strong>${activeRecords.length}</strong>
          </a>
          <a class="view-tab ${selectedView === "collected" ? "active" : ""}" href="#/surgeries/collected" ${
            selectedView === "collected" ? 'aria-current="page"' : ""
          }>
            <span>Collected samples</span><strong>${collectedRecords.length}</strong>
          </a>
        </nav>
        <div class="surgery-list-tools">
          <div class="search-control surgery-search">
            ${ICONS.search}
            <input class="field" type="search" aria-label="Search surgeries" placeholder="Search surgeries" value="${escapeHtml(
              surgeryFilters.search,
            )}" data-surgery-search />
          </div>
          <div class="surgery-sort-control">
            <label class="surgery-sort-label" for="surgerySort">Sort by</label>
            <select id="surgerySort" class="select" data-surgery-sort>
              <option value="performed" ${sortBy === "performed" ? "selected" : ""}>Date performed</option>
              <option value="termination" ${sortBy === "termination" ? "selected" : ""}>Termination date</option>
            </select>
            <button class="icon-btn" type="button" title="${
              sortDirection === "desc" ? "Latest dates first" : "Earliest dates first"
            }" aria-label="${
              sortDirection === "desc" ? "Sort latest dates first" : "Sort earliest dates first"
            }" data-surgery-sort-direction>${
              sortDirection === "desc" ? ICONS.arrowDown : ICONS.arrowUp
            }</button>
          </div>
          ${
            deletedRecords.length
              ? `<label class="filter-toggle surgery-deleted-toggle">
                  <input type="checkbox" data-surgery-show-deleted ${
                    surgeryFilters.showDeleted ? "checked" : ""
                  } />
                  <span>Show deleted (${deletedRecords.length})</span>
                </label>`
              : ""
          }
        </div>
      </section>

      <div class="panel surgery-list">
        ${
          visibleRecords.length
            ? visibleRecords
                .map((record) => renderSurgeryRow(record, selectedView === "collected"))
                .join("")
            : `<div class="empty surgery-empty">
                <div class="empty-icon">${selectedView === "collected" ? ICONS.checkCircle : ICONS.clipboard}</div>
                <div>
                  <strong>${query ? "No matching procedures" : selectedView === "collected" ? "No collected samples yet" : "No active surgeries yet"}</strong>
                  <span>${query ? "Try a different search." : selectedView === "collected" ? "Terminated procedures will move here automatically." : "Take a picture of a surgery card to add the first procedure."}</span>
                </div>
                ${
                  !query && selectedView === "active"
                    ? `<button class="btn primary" type="button" data-action="take-surgery-photo">${ICONS.camera} Take picture</button>`
                    : ""
                }
              </div>`
        }
      </div>
    </main>
  `);

  const cameraInput = app.querySelector("[data-surgery-page-camera]");
  app.querySelectorAll("[data-action='take-surgery-photo']").forEach((button) => {
    button.addEventListener("click", () => {
      if (requireSurgeryStorage()) cameraInput.click();
    });
  });
  app.querySelector("[data-action='new-surgery-manual']").addEventListener("click", () => {
    if (requireSurgeryStorage()) openNewSurgeryDialog();
  });
  cameraInput.addEventListener("change", () => {
    const files = Array.from(cameraInput.files || []);
    cameraInput.value = "";
    if (files.length) openNewSurgeryDialog(files);
  });
  app.querySelector("[data-surgery-search]").addEventListener("input", (event) => {
    surgeryFilters.search = event.target.value;
    renderSurgeriesPage(selectedView);
    const search = app.querySelector("[data-surgery-search]");
    search.focus();
    search.setSelectionRange(search.value.length, search.value.length);
  });
  app.querySelector("[data-surgery-sort]").addEventListener("change", (event) => {
    surgeryFilters.sortBy[selectedView] =
      event.target.value === "termination" ? "termination" : "performed";
    renderSurgeriesPage(selectedView);
    app.querySelector("[data-surgery-sort]").focus();
  });
  app.querySelector("[data-surgery-sort-direction]").addEventListener("click", () => {
    surgeryFilters.sortDirection[selectedView] = sortDirection === "desc" ? "asc" : "desc";
    renderSurgeriesPage(selectedView);
    app.querySelector("[data-surgery-sort-direction]").focus();
  });
  app.querySelector("[data-surgery-show-deleted]")?.addEventListener("change", (event) => {
    surgeryFilters.showDeleted = event.target.checked;
    renderSurgeriesPage(selectedView);
    app.querySelector("[data-surgery-show-deleted]")?.focus();
  });
  bindSurgeryStorageNotice();
  hydrateDriveMedia(app.querySelector(".surgeries-page"));
}

function pendingPhotoControlsMarkup() {
  return `
    <div class="pending-photo-actions">
      <button class="btn" type="button" data-action="pending-camera">${ICONS.camera} Take picture</button>
      <button class="btn ghost" type="button" data-action="pending-gallery">${ICONS.image} Choose photos</button>
    </div>
    <input class="hidden" type="file" accept="image/*" capture="environment" data-pending-input="camera" />
    <input class="hidden" type="file" accept="image/*" multiple data-pending-input="gallery" />
    <div class="pending-photo-grid" data-pending-photos></div>
  `;
}

function createPendingPhotoManager(dialog, initialFiles = []) {
  let files = Array.from(initialFiles).filter(isImageFile);
  let previewUrls = [];
  const preview = dialog.querySelector("[data-pending-photos]");

  const render = () => {
    previewUrls.forEach((url) => URL.revokeObjectURL(url));
    previewUrls = files.map((file) => URL.createObjectURL(file));
    preview.innerHTML = files.length
      ? files
          .map(
            (file, index) => `
              <figure class="pending-photo">
                <img src="${previewUrls[index]}" alt="${escapeHtml(file.name || "Selected photo")}" />
                <figcaption title="${escapeHtml(file.name || "Selected photo")}">${escapeHtml(
                  file.name || `Photo ${index + 1}`,
                )}</figcaption>
                <button class="icon-btn compact danger-ghost" type="button" title="Remove photo" aria-label="Remove ${escapeHtml(
                  file.name || `photo ${index + 1}`,
                )}" data-pending-remove="${index}">${ICONS.close}</button>
              </figure>
            `,
          )
          .join("")
      : `<p class="pending-photo-empty">No photos selected yet.</p>`;
  };

  dialog.querySelector("[data-action='pending-camera']").addEventListener("click", () => {
    dialog.querySelector("[data-pending-input='camera']").click();
  });
  dialog.querySelector("[data-action='pending-gallery']").addEventListener("click", () => {
    dialog.querySelector("[data-pending-input='gallery']").click();
  });
  dialog.querySelectorAll("[data-pending-input]").forEach((input) => {
    input.addEventListener("change", () => {
      files.push(...Array.from(input.files || []).filter(isImageFile));
      input.value = "";
      render();
    });
  });
  preview.addEventListener("click", (event) => {
    const button = event.target.closest("[data-pending-remove]");
    if (!button) return;
    files.splice(Number(button.dataset.pendingRemove), 1);
    render();
  });

  render();
  return {
    files: () => [...files],
    cleanup: () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
      previewUrls = [];
    },
  };
}

function openNewSurgeryDialog(initialFiles = []) {
  if (!requireSurgeryStorage()) return;
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <form class="panel dialog surgery-dialog" data-new-surgery-form>
      <div class="dialog-heading">
        <div>
          <p class="eyebrow">New procedure</p>
          <h2>Add surgery</h2>
        </div>
        <button class="icon-btn" type="button" title="Close" aria-label="Close" data-dialog-close>${ICONS.close}</button>
      </div>
      <div class="field-group">
        <label class="field-label" for="surgeryName">Surgery name</label>
        <input id="surgeryName" class="field" name="title" required placeholder="Animal ID or procedure name" />
      </div>
      <div class="field-group">
        <label class="field-label" for="surgeryDate">Surgery date</label>
        <input id="surgeryDate" class="field" name="surgeryDate" type="date" required value="${today()}" data-surgery-date-input />
      </div>
      <div class="field-group">
        <label class="field-label" for="surgeryEndpointDays">Desired endpoint (days)</label>
        <input id="surgeryEndpointDays" class="field" name="plannedEndpointDays" type="number" min="0" step="1" inputmode="numeric" placeholder="14" data-endpoint-days-input />
        <output class="planned-termination-preview" for="surgeryDate surgeryEndpointDays">
          <span>Planned termination</span>
          <strong data-planned-termination-value>Not set</strong>
        </output>
      </div>
      <div class="field-group">
        <label class="field-label" for="surgeryNotes">Surgical notes</label>
        <textarea id="surgeryNotes" class="textarea surgery-notes-input" name="surgeryNotes" placeholder="Procedure, animal, implant, observations, or follow-up notes"></textarea>
      </div>
      <div class="field-group">
        <span class="field-label">Surgery card photos</span>
        ${pendingPhotoControlsMarkup()}
      </div>
      <p class="save-state dialog-save-state" role="status" aria-live="polite" data-surgery-dialog-status></p>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn primary" type="submit">Save surgery</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-new-surgery-form]");
  const status = dialog.querySelector("[data-surgery-dialog-status]");
  const submit = form.querySelector("[type='submit']");
  const photoManager = createPendingPhotoManager(dialog, initialFiles);
  wireDialogClose(dialog, photoManager.cleanup);
  bindPlannedTerminationPreview(form);
  dialog.querySelector("#surgeryName").focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const surgery = createSurgery({
      title: String(data.get("title") || "").trim(),
      surgeryDate: String(data.get("surgeryDate") || today()),
      plannedEndpointDays: data.get("plannedEndpointDays"),
      surgeryNotes: String(data.get("surgeryNotes") || "").trim(),
    });
    const files = photoManager.files();
    submit.disabled = true;
    status.textContent = "Saving surgery...";
    let savedLocally = false;

    try {
      await saveExperimentRecord(surgery);
      savedLocally = true;
      await appendSurgeryPhotos(surgery, "surgeryPhotos", files, (index, total) => {
        status.textContent = `Uploading photo ${index} of ${total}...`;
      });
      await loadExperiments();
      photoManager.cleanup();
      dialog.remove();
      location.hash = `#/surgery/${surgery.id}`;
    } catch (error) {
      console.error(error);
      submit.disabled = false;
      status.textContent = "Save failed";
      if (savedLocally) {
        await loadExperiments();
        photoManager.cleanup();
        dialog.remove();
        if (driveState.connected) handleDriveError(error);
        else window.alert(`The surgery was saved locally, but some photos could not be stored: ${error.message || String(error)}`);
        location.hash = `#/surgery/${surgery.id}`;
      } else {
        if (driveState.connected) {
          handleDriveError(error);
          status.textContent = "Reconnect Drive, then try saving again.";
          openDriveDialog();
        } else {
          window.alert(error.message || String(error));
        }
      }
    }
  });
}

function renderSurgeryGallery(photos, emptyMessage) {
  if (!photos.length) {
    return `
      <div class="surgery-gallery-empty">
        ${ICONS.camera}
        <strong>No photos yet</strong>
        <span>${escapeHtml(emptyMessage)}</span>
      </div>
    `;
  }

  return `
    <div class="surgery-gallery">
      ${photos
        .map(
          (photo, index) => `
            <figure class="surgery-photo-card">
              <button type="button" data-view-surgery-photo title="Open ${escapeHtml(
                photo.name,
              )}" aria-label="Open ${escapeHtml(photo.name)}">
                ${renderSurgeryPhotoImage(photo, "surgery-photo-image")}
              </button>
              <figcaption>${escapeHtml(photo.name || `Photo ${index + 1}`)}</figcaption>
            </figure>
          `,
        )
        .join("")}
    </div>
  `;
}

function bindSurgeryPhotoLightbox(root) {
  root.querySelectorAll("[data-view-surgery-photo]").forEach((button) => {
    button.addEventListener("click", () => {
      const source = button.querySelector("img")?.currentSrc || button.querySelector("img")?.src;
      if (!source) {
        window.alert("Connect Drive to view this photo.");
        return;
      }

      const dialog = document.createElement("div");
      dialog.className = "dialog-backdrop photo-lightbox-backdrop";
      dialog.innerHTML = `
        <div class="photo-lightbox" role="dialog" aria-modal="true" aria-label="Surgery photo">
          <button class="icon-btn photo-lightbox-close" type="button" title="Close" aria-label="Close" data-dialog-close>${ICONS.close}</button>
          <img src="${escapeHtml(source)}" alt="${escapeHtml(
            button.querySelector("img")?.alt || "Surgery photo",
          )}" />
        </div>
      `;
      document.body.appendChild(dialog);
      wireDialogClose(dialog);
      dialog.querySelector("[data-dialog-close]").focus();
    });
  });
}

async function renderSurgeryDetailPage(id) {
  const record = await getExperiment(id);
  if (!record || !isSurgeryRecord(record)) {
    location.hash = "#/surgeries";
    return;
  }

  activeExperiment = null;
  activeSurgery = normalizeSurgeryRecord(record);
  const collected = Boolean(activeSurgery.terminationDate);
  const deleted = isDeletedRecord(activeSurgery);
  const elapsedDays = collected
    ? daysBetweenDates(activeSurgery.surgeryDate, activeSurgery.terminationDate)
    : null;
  const plannedTerminationDate = collected
    ? ""
    : calculatePlannedTerminationDate(
        activeSurgery.surgeryDate,
        activeSurgery.plannedEndpointDays,
      );
  const storageLocked = surgeryStorageLocked();
  const recordLocked = storageLocked || deleted;
  renderShell(`
    <main class="page surgery-detail-page">
      <section class="page-header surgery-detail-header">
        <div>
          <p class="eyebrow">${
            deleted ? "Deleted surgery" : collected ? "Collected sample" : "Active surgery"
          }</p>
          <div class="detail-heading-line">
            <h1>${escapeHtml(activeSurgery.title)}</h1>
            <span class="pill ${
              deleted ? "surgery-deleted" : collected ? "sample-collected" : "surgery-active"
            }">${deleted ? "Deleted" : collected ? "Collected" : "Active"}</span>
          </div>
        </div>
        <div class="page-actions">
          <span class="save-state" data-surgery-save-state role="status" aria-live="polite">${
            deleted ? "Read only" : "Saved"
          }</span>
          <a class="btn ghost" href="${collected ? "#/surgeries/collected" : "#/surgeries"}">${ICONS.arrowLeft} Back</a>
          ${
            deleted
              ? ""
              : `<button class="btn danger" type="button" data-action="delete-surgery">${ICONS.trash} Delete surgery</button>`
          }
        </div>
      </section>

      ${surgeryStorageNoticeMarkup()}

      ${
        deleted
          ? `<section class="deleted-notice">
              <div>
                <strong>Deleted surgery</strong>
                <span>This surgery is hidden from normal lists but its details and photos remain in storage.</span>
              </div>
              <button class="btn primary" type="button" data-action="restore-surgery">${ICONS.restore} Restore surgery</button>
            </section>`
          : ""
      }

      <section class="surgery-detail-grid">
        <div class="surgery-photo-section">
          <div class="subsection-heading">
            <div>
              <p class="eyebrow">Procedure record</p>
              <h2>Surgery card</h2>
            </div>
            <div class="subsection-actions">
              <button class="btn ghost" type="button" data-action="choose-surgery-photo" ${
                recordLocked ? "disabled" : ""
              }>${ICONS.image} Add photos</button>
              <button class="btn" type="button" data-action="capture-surgery-photo" ${
                recordLocked ? "disabled" : ""
              }>${ICONS.camera} Take picture</button>
            </div>
          </div>
          ${renderSurgeryGallery(
            activeSurgery.surgeryPhotos,
            "Take a picture of the completed surgery card or choose one from this device.",
          )}
        </div>

        <form class="panel surgery-details-panel" data-surgery-details-form>
          <div class="field-group">
            <label class="field-label" for="detailSurgeryName">Surgery name</label>
            <input id="detailSurgeryName" class="field" name="title" required ${
              recordLocked ? "disabled" : ""
            } value="${escapeHtml(
              activeSurgery.title,
            )}" />
          </div>
          <div class="field-group">
            <label class="field-label" for="detailSurgeryDate">Surgery date</label>
            <input id="detailSurgeryDate" class="field" name="surgeryDate" type="date" required ${
              recordLocked ? "disabled" : ""
            } value="${escapeHtml(
              activeSurgery.surgeryDate,
            )}" data-surgery-date-input />
          </div>
          ${
            !collected
              ? `<div class="field-group">
                  <label class="field-label" for="detailEndpointDays">Desired endpoint (days)</label>
                  <input id="detailEndpointDays" class="field" name="plannedEndpointDays" type="number" min="0" step="1" inputmode="numeric" placeholder="14" ${
                    recordLocked ? "disabled" : ""
                  } value="${escapeHtml(activeSurgery.plannedEndpointDays ?? "")}" data-endpoint-days-input />
                  <output class="planned-termination-preview" for="detailSurgeryDate detailEndpointDays">
                    <span>Planned termination</span>
                    <strong data-planned-termination-value>${escapeHtml(
                      plannedTerminationDate ? formatDate(plannedTerminationDate) : "Not set",
                    )}</strong>
                  </output>
                </div>`
              : ""
          }
          <div class="field-group">
            <label class="field-label" for="detailSurgeryNotes">Surgical notes</label>
            <textarea id="detailSurgeryNotes" class="textarea surgery-notes-input" name="surgeryNotes" ${
              recordLocked ? "disabled" : ""
            } placeholder="Procedure, animal, implant, observations, or follow-up notes">${escapeHtml(
              activeSurgery.surgeryNotes,
            )}</textarea>
          </div>
          <div class="form-actions">
            <button class="btn primary" type="submit" ${recordLocked ? "disabled" : ""}>Save changes</button>
          </div>
        </form>
      </section>

      <input class="hidden" type="file" accept="image/*" capture="environment" data-detail-surgery-camera ${
        recordLocked ? "disabled" : ""
      } />
      <input class="hidden" type="file" accept="image/*" multiple data-detail-surgery-gallery ${
        recordLocked ? "disabled" : ""
      } />

      ${
        collected
          ? `<section class="collection-section">
              <div class="subsection-heading collection-heading">
                <div>
                  <p class="eyebrow">Tissue collection</p>
                  <h2>Collected sample</h2>
                </div>
                <button class="btn ghost" type="button" data-action="edit-termination" ${
                  recordLocked ? "disabled" : ""
                }>${ICONS.pencil} Edit collection details</button>
              </div>
              <div class="collection-summary">
                <div class="collection-date-block">
                  <span>Termination date</span>
                  <strong>${escapeHtml(formatDate(activeSurgery.terminationDate))}</strong>
                </div>
                <div class="collection-duration-block">
                  <span>Days from surgery</span>
                  <strong>${escapeHtml(formatElapsedDays(elapsedDays))}</strong>
                </div>
                <div class="collection-notes-block">
                  <span>Termination and collection notes</span>
                  <p>${escapeHtml(activeSurgery.terminationNotes || "No termination notes added.")}</p>
                </div>
              </div>
              ${renderSurgeryGallery(
                activeSurgery.terminationPhotos,
                "Add tissue, collection, or termination record photos.",
              )}
            </section>`
          : `<section class="collection-callout">
              <div class="collection-callout-icon">${ICONS.checkCircle}</div>
              <div>
                <strong>Ready to record tissue collection?</strong>
                <span>Enter the termination date, notes, and any collection photos. This procedure will move to Collected samples.</span>
              </div>
              <button class="btn primary" type="button" data-action="terminate-surgery" ${
                recordLocked ? "disabled" : ""
              }>Terminate &amp; collect</button>
            </section>`
      }
    </main>
  `);

  const detailsForm = app.querySelector("[data-surgery-details-form]");
  bindPlannedTerminationPreview(detailsForm);
  detailsForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (deleted || !requireSurgeryStorage()) return;
    const data = new FormData(detailsForm);
    const button = detailsForm.querySelector("[type='submit']");
    button.disabled = true;
    setSurgerySaveState("Saving...");
    activeSurgery.title = String(data.get("title") || "").trim();
    activeSurgery.surgeryDate = normalizedRecordDate(data.get("surgeryDate"));
    activeSurgery.startDate = activeSurgery.surgeryDate;
    if (!collected) {
      activeSurgery.plannedEndpointDays = normalizeEndpointDays(data.get("plannedEndpointDays"));
    }
    activeSurgery.surgeryNotes = String(data.get("surgeryNotes") || "").trim();
    activeSurgery.updatedAt = now();

    try {
      await saveExperimentRecord(activeSurgery);
      await loadExperiments();
      await renderSurgeryDetailPage(activeSurgery.id);
    } catch (error) {
      console.error(error);
      setSurgerySaveState("Save failed");
      if (driveState.connected) handleDriveError(error);
      else window.alert(error.message || String(error));
    } finally {
      button.disabled = false;
    }
  });

  const cameraInput = app.querySelector("[data-detail-surgery-camera]");
  const galleryInput = app.querySelector("[data-detail-surgery-gallery]");
  app.querySelector("[data-action='capture-surgery-photo']").addEventListener("click", () => cameraInput.click());
  app.querySelector("[data-action='choose-surgery-photo']").addEventListener("click", () => galleryInput.click());
  [cameraInput, galleryInput].forEach((input) => {
    input.addEventListener("change", async () => {
      const files = Array.from(input.files || []);
      input.value = "";
      if (files.length) await addPhotosToActiveSurgery("surgeryPhotos", files);
    });
  });

  app.querySelector("[data-action='terminate-surgery']")?.addEventListener("click", () => {
    openTerminationDialog(activeSurgery, false);
  });
  app.querySelector("[data-action='edit-termination']")?.addEventListener("click", () => {
    openTerminationDialog(activeSurgery, true);
  });
  app.querySelector("[data-action='delete-surgery']")?.addEventListener("click", async (event) => {
    if (!requireSurgeryStorage()) return;
    const confirmed = window.confirm(
      `Delete "${activeSurgery.title}"? It will disappear from surgery lists but remain in storage for recovery.`,
    );
    if (!confirmed) return;

    const button = event.currentTarget;
    button.disabled = true;
    setSurgerySaveState("Deleting...");
    try {
      activeSurgery = await markExperimentDeleted(activeSurgery);
      await loadExperiments();
      location.hash = collected ? "#/surgeries/collected" : "#/surgeries";
    } catch (error) {
      console.error(error);
      button.disabled = false;
      setSurgerySaveState("Delete failed");
      if (driveState.connected) handleDriveError(error);
      else window.alert(error.message || String(error));
    }
  });
  app.querySelector("[data-action='restore-surgery']")?.addEventListener("click", async (event) => {
    if (!requireSurgeryStorage()) return;
    const button = event.currentTarget;
    button.disabled = true;
    setSurgerySaveState("Restoring...");
    try {
      activeSurgery = await restoreExperimentRecord(activeSurgery);
      await loadExperiments();
      await renderSurgeryDetailPage(activeSurgery.id);
    } catch (error) {
      console.error(error);
      button.disabled = false;
      setSurgerySaveState("Restore failed");
      if (driveState.connected) handleDriveError(error);
      else window.alert(error.message || String(error));
    }
  });
  bindSurgeryStorageNotice();
  bindSurgeryPhotoLightbox(app.querySelector(".surgery-detail-page"));
  hydrateDriveMedia(app.querySelector(".surgery-detail-page"));
}

function setSurgerySaveState(label) {
  const state = app.querySelector("[data-surgery-save-state]");
  if (state) state.textContent = label;
}

async function addPhotosToActiveSurgery(field, files) {
  if (!activeSurgery || !requireSurgeryStorage()) return;
  try {
    await appendSurgeryPhotos(activeSurgery, field, files, (index, total) => {
      setSurgerySaveState(`Uploading photo ${index} of ${total}...`);
    });
    await loadExperiments();
    await renderSurgeryDetailPage(activeSurgery.id);
  } catch (error) {
    console.error(error);
    setSurgerySaveState("Upload failed");
    if (driveState.connected) handleDriveError(error);
    else window.alert(error.message || String(error));
  }
}

function openTerminationDialog(surgery, editing) {
  if (!requireSurgeryStorage()) return;
  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <form class="panel dialog surgery-dialog" data-termination-form>
      <div class="dialog-heading">
        <div>
          <p class="eyebrow">Tissue collection</p>
          <h2>${editing ? "Edit collection details" : "Terminate procedure"}</h2>
        </div>
        <button class="icon-btn" type="button" title="Close" aria-label="Close" data-dialog-close>${ICONS.close}</button>
      </div>
      <p class="dialog-copy">${
        editing
          ? "Update the termination record or attach more collection photos."
          : "This moves the procedure from Active surgeries to Collected samples."
      }</p>
      <div class="field-group">
        <label class="field-label" for="terminationDate">Termination date</label>
        <input id="terminationDate" class="field" name="terminationDate" type="date" min="${escapeHtml(
          surgery.surgeryDate,
        )}" required value="${escapeHtml(surgery.terminationDate || today())}" />
      </div>
      <div class="field-group">
        <label class="field-label" for="terminationNotes">Termination and collection notes</label>
        <textarea id="terminationNotes" class="textarea surgery-notes-input" name="terminationNotes" placeholder="Euthanasia, tissue collected, sample IDs, preservation, or observations">${escapeHtml(
          surgery.terminationNotes,
        )}</textarea>
      </div>
      <div class="field-group">
        <span class="field-label">Collection photos</span>
        ${pendingPhotoControlsMarkup()}
      </div>
      <p class="save-state dialog-save-state" role="status" aria-live="polite" data-termination-status></p>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn primary" type="submit">${editing ? "Save changes" : "Mark terminated"}</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-termination-form]");
  const status = dialog.querySelector("[data-termination-status]");
  const submit = form.querySelector("[type='submit']");
  const photoManager = createPendingPhotoManager(dialog);
  wireDialogClose(dialog, photoManager.cleanup);
  dialog.querySelector("#terminationDate").focus();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const files = photoManager.files();
    submit.disabled = true;
    status.textContent = "Saving collection record...";
    surgery.terminationDate = normalizedRecordDate(data.get("terminationDate"), today());
    surgery.terminationNotes = String(data.get("terminationNotes") || "").trim();
    surgery.terminatedAt = surgery.terminatedAt || now();
    surgery.updatedAt = now();

    try {
      await saveExperimentRecord(surgery);
      await appendSurgeryPhotos(surgery, "terminationPhotos", files, (index, total) => {
        status.textContent = `Uploading photo ${index} of ${total}...`;
      });
      await loadExperiments();
      photoManager.cleanup();
      dialog.remove();
      if (editing) await renderSurgeryDetailPage(surgery.id);
      else location.hash = "#/surgeries/collected";
    } catch (error) {
      console.error(error);
      submit.disabled = false;
      status.textContent = "Save failed";
      if (driveState.connected) handleDriveError(error);
      else window.alert(error.message || String(error));
    }
  });
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
                )}" aria-label="Remove ${escapeHtml(label)}" data-label-remove="${escapeHtml(
                  label,
                )}">${ICONS.close}</button>`
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

  if (isSurgeryRecord(activeExperiment)) {
    location.hash = `#/surgery/${activeExperiment.id}`;
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
        <div class="page-actions">
          <span class="save-state" data-save-state role="status" aria-live="polite">Saved</span>
          <button class="btn ghost" type="button" data-action="export-current">${ICONS.print} Export</button>
          <a class="btn ghost" href="#/" title="Back to sections">${ICONS.arrowLeft} Back</a>
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
          <input id="startDate" class="field" name="startDate" type="date" value="${escapeHtml(
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
            <select id="status" class="select" name="status" data-field="status">
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
            <select id="outcome" class="select" name="outcome" data-field="outcome">
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

function editorImageMaxWidth(editor, image) {
  const contentWidth = (element) => {
    const style = window.getComputedStyle(element);
    const horizontalPadding =
      (Number.parseFloat(style.paddingLeft) || 0) +
      (Number.parseFloat(style.paddingRight) || 0);
    return Math.max(0, element.clientWidth - horizontalPadding);
  };

  let maxWidth = contentWidth(editor);
  const parent = image.parentElement;
  if (parent && parent !== editor) {
    const parentWidth = contentWidth(parent);
    if (parentWidth) maxWidth = Math.min(maxWidth, parentWidth);
  }
  return Math.max(EDITOR_IMAGE_MIN_WIDTH, Math.floor(maxWidth));
}

function bindEditorImageResizing(editor) {
  const shell = editor.closest(".editor-shell");
  if (!shell) return;

  const overlay = document.createElement("div");
  overlay.className = "image-resize-overlay hidden";
  overlay.setAttribute("contenteditable", "false");
  overlay.innerHTML = `
    <div class="image-resize-controls" role="toolbar" aria-label="Image size">
      <output class="image-resize-size" data-image-resize-size aria-live="polite"></output>
      <button class="icon-btn compact" type="button" title="Use original image size" aria-label="Use original image size" data-image-original-size>${ICONS.restore}</button>
      <button class="icon-btn compact" type="button" title="Fit image to editor width" aria-label="Fit image to editor width" data-image-fit-width>${ICONS.expand}</button>
    </div>
    <button class="image-resize-handle" type="button" title="Drag to resize image" aria-label="Drag to resize image" data-image-resize-handle>${ICONS.moveDiagonal}</button>
  `;
  shell.appendChild(overlay);

  const controller = new AbortController();
  const { signal } = controller;
  const sizeOutput = overlay.querySelector("[data-image-resize-size]");
  const resizeHandle = overlay.querySelector("[data-image-resize-handle]");
  const resizeObserver = new ResizeObserver(() => positionOverlay());
  let selectedImage = null;
  let resizing = false;
  let resizeStartX = 0;
  let resizeStartWidth = 0;

  const renderedImageWidth = () =>
    Math.round(selectedImage?.getBoundingClientRect().width || 0);

  function positionOverlay() {
    if (!selectedImage || !selectedImage.isConnected) {
      clearSelection();
      return;
    }

    const imageRect = selectedImage.getBoundingClientRect();
    const shellRect = shell.getBoundingClientRect();
    if (!imageRect.width || !imageRect.height) {
      overlay.classList.add("hidden");
      return;
    }

    overlay.style.left = `${imageRect.left - shellRect.left}px`;
    overlay.style.top = `${imageRect.top - shellRect.top}px`;
    overlay.style.width = `${imageRect.width}px`;
    overlay.style.height = `${imageRect.height}px`;
    overlay.classList.remove("hidden");
    const width = renderedImageWidth();
    sizeOutput.textContent = `${width} px`;
    resizeHandle.setAttribute("aria-label", `Resize image, current width ${width} pixels`);
  }

  function clearSelection() {
    if (selectedImage) resizeObserver.unobserve(selectedImage);
    selectedImage = null;
    resizing = false;
    overlay.classList.add("hidden");
    overlay.classList.remove("is-resizing");
  }

  function selectImage(image) {
    if (selectedImage !== image) {
      if (selectedImage) resizeObserver.unobserve(selectedImage);
      selectedImage = image;
      resizeObserver.observe(selectedImage);
    }
    positionOverlay();
  }

  function commitImageSize() {
    if (!selectedImage) return;
    activeExperiment.content = editor.innerHTML;
    scheduleSave();
  }

  function setImageWidth(width) {
    if (!selectedImage) return;
    const maxWidth = editorImageMaxWidth(editor, selectedImage);
    const nextWidth = Math.round(
      Math.min(maxWidth, Math.max(EDITOR_IMAGE_MIN_WIDTH, width)),
    );
    selectedImage.style.removeProperty("width");
    selectedImage.style.removeProperty("height");
    selectedImage.removeAttribute("height");
    selectedImage.setAttribute("width", String(nextWidth));
    positionOverlay();
  }

  function finishResize(event) {
    if (!resizing) return;
    resizing = false;
    overlay.classList.remove("is-resizing");
    if (resizeHandle.hasPointerCapture?.(event.pointerId)) {
      resizeHandle.releasePointerCapture(event.pointerId);
    }
    commitImageSize();
  }

  editor.addEventListener(
    "click",
    (event) => {
      const image = event.target.closest?.("img");
      if (image && editor.contains(image)) {
        event.preventDefault();
        selectImage(image);
      } else {
        clearSelection();
      }
    },
    { signal },
  );
  editor.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") clearSelection();
    },
    { signal },
  );
  editor.addEventListener(
    "load",
    (event) => {
      if (event.target === selectedImage) positionOverlay();
    },
    { capture: true, signal },
  );
  editor.addEventListener("input", () => window.requestAnimationFrame(positionOverlay), { signal });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (!selectedImage || overlay.contains(event.target) || event.target === selectedImage) return;
      if (!editor.contains(event.target)) clearSelection();
    },
    { capture: true, signal },
  );
  window.addEventListener("resize", positionOverlay, { signal });

  resizeHandle.addEventListener(
    "pointerdown",
    (event) => {
      if (!selectedImage) return;
      event.preventDefault();
      event.stopPropagation();
      resizing = true;
      resizeStartX = event.clientX;
      resizeStartWidth = renderedImageWidth();
      overlay.classList.add("is-resizing");
      resizeHandle.setPointerCapture?.(event.pointerId);
    },
    { signal },
  );
  resizeHandle.addEventListener(
    "pointermove",
    (event) => {
      if (!resizing) return;
      event.preventDefault();
      setImageWidth(resizeStartWidth + event.clientX - resizeStartX);
    },
    { signal },
  );
  resizeHandle.addEventListener("pointerup", finishResize, { signal });
  resizeHandle.addEventListener("pointercancel", finishResize, { signal });
  resizeHandle.addEventListener(
    "keydown",
    (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      const step = event.shiftKey ? 1 : 16;
      setImageWidth(renderedImageWidth() + (event.key === "ArrowRight" ? step : -step));
      commitImageSize();
    },
    { signal },
  );

  overlay.querySelector("[data-image-original-size]").addEventListener(
    "click",
    () => {
      if (!selectedImage) return;
      selectedImage.removeAttribute("width");
      selectedImage.removeAttribute("height");
      selectedImage.style.removeProperty("width");
      selectedImage.style.removeProperty("height");
      window.requestAnimationFrame(positionOverlay);
      commitImageSize();
    },
    { signal },
  );
  overlay.querySelector("[data-image-fit-width]").addEventListener(
    "click",
    () => {
      if (!selectedImage) return;
      setImageWidth(editorImageMaxWidth(editor, selectedImage));
      commitImageSize();
    },
    { signal },
  );

  resizeObserver.observe(editor);
  editorImageResizeCleanup = () => {
    controller.abort();
    resizeObserver.disconnect();
    overlay.remove();
  };
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
  bindEditorImageResizing(editor);

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

function openRenameSectionDialog(sectionId) {
  const section = sections().find((item) => item.id === sectionId);
  if (!section || isDeletedSection(section)) return;

  const dialog = document.createElement("div");
  dialog.className = "dialog-backdrop";
  dialog.innerHTML = `
    <form class="panel dialog" data-rename-section-form>
      <h2>Rename section</h2>
      <div class="field-group">
        <label class="field-label" for="renameSectionName">Section name</label>
        <input id="renameSectionName" class="field" name="name" required value="${escapeHtml(
          section.name,
        )}" />
      </div>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn primary" type="submit">Save</button>
      </div>
    </form>
  `;

  document.body.appendChild(dialog);
  const form = dialog.querySelector("[data-rename-section-form]");
  const nameInput = dialog.querySelector("#renameSectionName");
  nameInput.focus();
  nameInput.select();
  nameInput.addEventListener("input", () => nameInput.setCustomValidity(""));
  wireDialogClose(dialog);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const name = String(new FormData(form).get("name") || "")
      .trim()
      .replace(/\s+/g, " ");
    if (!name) return;

    const duplicate = sections().some(
      (item) =>
        item.id !== section.id &&
        !isDeletedSection(item) &&
        item.name.toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      nameInput.setCustomValidity("An active section already uses this name.");
      nameInput.reportValidity();
      return;
    }

    nameInput.setCustomValidity("");
    section.name = name;
    saveTaxonomy();
    dialog.remove();
    await route();
  });
}

async function deleteSection(sectionId) {
  const section = sections().find((item) => item.id === sectionId);
  if (!section || isDeletedSection(section)) return;

  const count = experiments.filter((experiment) => experiment.sectionId === section.id).length;
  const recordsLabel = `${count} ${count === 1 ? "record" : "records"}`;
  const confirmed = window.confirm(
    `Delete the "${section.name}" section and hide its ${recordsLabel}? Nothing will be permanently deleted. You can recover it with "Show deleted sections".`,
  );
  if (!confirmed) return;

  section.deletedAt = now();
  saveTaxonomy();
  await route();
}

async function restoreSection(sectionId) {
  const section = sections().find((item) => item.id === sectionId);
  if (!section || !isDeletedSection(section)) return;

  delete section.deletedAt;
  if (!sections().some(isDeletedSection)) currentFilters.showDeletedSections = false;
  saveTaxonomy();
  await route();
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

function wireDialogClose(dialog, onClose = () => {}) {
  const close = () => {
    onClose();
    dialog.remove();
  };
  dialog.querySelectorAll("[data-dialog-close]").forEach((button) => {
    button.addEventListener("click", close);
  });
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) close();
  });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
}

function openDriveDialog() {
  if (document.querySelector("[data-drive-dialog]")) return;
  warmBackend();
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
      <section class="connection-feedback dialog-connection" data-connection-feedback role="status" aria-live="polite" aria-atomic="true"></section>
      <div class="dialog-actions">
        <button class="btn ghost" type="button" data-dialog-close>Cancel</button>
        <button class="btn ghost" type="button" data-action="save-drive-setup">Save setup</button>
        ${
          driveState.connected
            ? `<button class="btn ghost" type="button" data-action="drive-disconnect">Disconnect</button>`
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
  dialog.querySelector("[data-action='save-drive-setup']").addEventListener("click", async () => {
    const clientId = dialog.querySelector("#driveClientId")?.value.trim() || driveSettings.clientId;
    const backendUrl =
      dialog.querySelector("#driveBackendUrl")?.value.trim() || driveSettings.backendUrl;
    if (!clientId || !backendUrl) {
      window.alert("Add both the Google Client ID and Cloud Run backend URL.");
      return;
    }
    if (clientId !== driveSettings.clientId || backendUrl !== driveSettings.backendUrl) {
      if (!await waitForLocalSaves()) return;
      await refreshPendingDrafts();
      if (pendingDrafts.length || recordSaveQueues.size) {
        window.alert("Finish saving or recovering the pending drafts before changing the backend.");
        return;
      }
      rememberBackendCredential("");
      resetDriveState();
    }
    saveDriveSettings({ clientId, backendUrl });
    dialog.remove();
    openDriveDialog();
  });
  dialog.querySelector("[data-action='drive-disconnect']")?.addEventListener("click", async () => {
    rememberBackendCredential("");
    resetDriveState();
    dialog.remove();
    await route();
  });

  renderBackendSignIn(dialog.querySelector("[data-google-signin]"), dialog);
  updateConnectionUi();
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
    await waitForLocalSaves();
    await loadExperiments();
    const records = new Map(experiments.map((record) => [record.id, record]));
    failedLocalWrites.forEach(({ record }) => records.set(record.id, record));

    const backup = {
      app: "INFUS Notebook",
      version: 1,
      exportedAt: now(),
      taxonomy,
      records: [...records.values()],
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `infus-notebook-backup-${today()}.json`;
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
    if (!await waitForLocalSaves()) throw new Error("Retry the failed local save before importing.");
    await refreshPendingDrafts();
    if (pendingDrafts.length || recordSaveQueues.size || driveState.connecting || driveState.syncing) {
      throw new Error("Finish saving or recovering pending drafts before importing a backup.");
    }
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

    rememberBackendCredential("");
    importedLocalOnly = true;
    localStorage.setItem("labbook-import-local-only", "true");
    if (driveState.connected || driveState.connecting || driveState.syncing) resetDriveState();
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
      if (isSurgeryRecord(record)) return normalizeSurgeryRecord(record);
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
        recordType: "notebook",
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
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleIdentityPromise) return googleIdentityPromise;
  googleIdentityPromise = new Promise((resolve, reject) => {
    document.querySelector("script[data-google-identity]")?.remove();
    const script = document.createElement("script");
    const timer = window.setTimeout(() => fail(), 15000);
    const fail = () => {
      window.clearTimeout(timer);
      script.remove();
      reject(new Error("Google sign-in could not load. Check your connection and retry."));
    };
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.googleIdentity = "true";
    script.onload = () => {
      if (!window.google?.accounts?.id) { fail(); return; }
      window.clearTimeout(timer);
      resolve();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  }).catch((error) => {
    googleIdentityPromise = null;
    throw error;
  });
  return googleIdentityPromise;
}

function warmBackend() {
  if (!driveSettings.backendUrl) return;
  if (backendWarmup?.url === driveSettings.backendUrl && Date.now() - backendWarmup.startedAt < 60000) return;
  backendWarmup = { url: driveSettings.backendUrl, startedAt: Date.now() };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30000);
  // Overlap a possible service cold start with the Google account chooser.
  fetch(`${driveSettings.backendUrl}/health`, { signal: controller.signal, cache: "no-store" })
    .catch(() => {})
    .finally(() => window.clearTimeout(timer));
}

async function renderBackendSignIn(container, dialog) {
  if (!container) return;
  if (!driveSettings.clientId || !driveSettings.backendUrl) {
    container.innerHTML = `<p class="dialog-copy">Add the Google Client ID and Cloud Run backend URL first.</p>`;
    return;
  }

  try {
    container.textContent = "Loading Google sign-in…";
    await loadGoogleIdentityScript();
    if (!container.isConnected) return;
    container.textContent = "";
    google.accounts.id.initialize({
      client_id: driveSettings.clientId,
      callback: async (response) => {
        if (!response.credential) return;
        try {
          await connectDrive(response.credential);
          if (driveState.connected) dialog.remove();
        } catch (error) {
          console.warn("Could not connect to backend", error);
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
    container.innerHTML = `<p class="dialog-copy">Google sign-in could not load. Check your connection.</p><button class="btn" type="button">Retry sign-in</button>`;
    container.querySelector("button").addEventListener("click", () => renderBackendSignIn(container, dialog));
    console.error(error);
  }
}

function connectDrive(credential) {
  if (!driveSettings.clientId || !driveSettings.backendUrl) {
    return Promise.reject(new Error("Backend storage is not configured yet."));
  }
  if (connectionAttempt?.credential === credential) return connectionAttempt.promise;
  connectionAttempt?.controller.abort();
  const attempt = { credential, controller: new AbortController(), promise: null };
  connectionAttempt = attempt;
  rememberBackendCredential(credential);
  driveState.accessToken = credential;
  driveState.connecting = true;
  driveState.error = "";
  driveState.status = "Connecting to Drive…";
  updateConnectionUi();
  const slowTimer = window.setTimeout(() => {
    if (connectionAttempt !== attempt) return;
    driveState.status = "Still loading your notebook…";
    updateConnectionUi();
  }, 8000);
  attempt.promise = (async () => {
    try {
      if (!await waitForLocalSaves()) throw new Error("Save or download the local edits before reconnecting.");
      await Promise.allSettled([...recordSaveQueues.values()]);
      if (connectionAttempt !== attempt) return;
      await withWorkspaceLock(driveSettings.backendUrl, async () => {
        if (connectionAttempt !== attempt) return;
        const workspace = await backendConnectionRequest("/workspace", {
          signal: attempt.controller.signal,
          headers: { Authorization: `Bearer ${credential}` },
        });
        if (connectionAttempt !== attempt) return;
        driveState.status = "Opening your notebook…";
        updateConnectionUi();
        await applyWorkspaceSnapshot(workspace);
      });
      if (connectionAttempt !== attempt) return;
      driveState.connected = true;
      importedLocalOnly = false;
      localStorage.removeItem("labbook-import-local-only");
      driveState.status = "Drive connected";
      driveState.connecting = false;
      await route();
      await flushPendingWrites();
      document.querySelector("[data-drive-dialog]")?.closest(".dialog-backdrop")?.remove();
    } catch (error) {
      if (connectionAttempt !== attempt) return;
      handleDriveError(error, { notify: false });
      throw error;
    } finally {
      window.clearTimeout(slowTimer);
      if (connectionAttempt === attempt) {
        connectionAttempt = null;
        driveState.connecting = false;
        updateConnectionUi();
      }
    }
  })();
  return attempt.promise;
}

async function tryAutoConnectBackend() {
  if (importedLocalOnly) return;
  if (!driveSettings.backendUrl || !driveSettings.clientId) return;
  const credential = savedBackendCredential();
  if (!isJwtLikelyValid(credential)) return;

  try {
    await connectDrive(credential);
  } catch (error) {
    console.warn("Could not reconnect to backend", error);
    // connectDrive keeps valid credentials available for a one-click retry.
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
  const session = driveState;
  const credential = session.accessToken;
  session.readingWorkspace = true;
  try {
    await Promise.allSettled([...recordSaveQueues.values()]);
    return await withWorkspaceLock(driveSettings.backendUrl, async () => {
      const workspace = await backendConnectionRequest("/workspace", {
        headers: { Authorization: `Bearer ${credential}` },
      });
      if (driveState !== session || !session.connected || session.accessToken !== credential) return false;
      await applyWorkspaceSnapshot(workspace);
      return driveState === session && session.connected && session.accessToken === credential;
    });
  } finally {
    session.readingWorkspace = false;
  }
}

async function applyWorkspaceSnapshot(workspace) {
  if (!await waitForLocalSaves()) throw new Error("Local edits could not be saved. Keep this tab open and retry the save.");
  await NotebookPersistence.mergeSnapshot(db, {
    backendUrl: driveSettings.backendUrl,
    records: workspace?.records,
    recordMeta: workspace?.recordMeta,
  });
  if (workspace && workspace.taxonomy) {
    taxonomy = {
      statuses: Array.isArray(workspace.taxonomy.statuses) ? workspace.taxonomy.statuses : [],
      outcomes: Array.isArray(workspace.taxonomy.outcomes) ? workspace.taxonomy.outcomes : [],
      labels: normalizeSavedLabels(workspace.taxonomy.labels),
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

  await refreshPendingDrafts();
  await loadExperiments();
}

async function syncDriveNow() {
  if (!driveState.connected || driveState.connecting || driveState.syncing) return;
  const session = driveState;
  const credential = session.accessToken;
  driveState.syncing = true;
  driveState.error = "";
  driveState.status = "Syncing Drive…";
  updateConnectionUi();
  try {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
      const saved = await saveActiveExperiment();
      if (driveState !== session || session.accessToken !== credential) return;
      if (!saved || !driveState.connected) {
        driveState.status = "Sync paused — save your changes first";
        return;
      }
    }
    await Promise.all([...recordSaveQueues.values()]);
    if (driveState !== session || session.accessToken !== credential) return;
    if (!await loadDriveWorkspace()) return;
    await flushPendingWrites();
    if (driveState !== session || !session.connected || session.accessToken !== credential) return;
    driveState.status = `Synced ${new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    })}`;
    await route();
  } catch (error) {
    if (driveState === session && session.accessToken === credential) handleDriveError(error);
  } finally {
    if (driveState === session) {
      driveState.syncing = false;
      updateConnectionUi();
    }
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

async function driveSaveRecord(experiment, baseModifiedTime) {
  if (!driveState.connected) return;
  const payload = {
    record: experiment,
    lastKnownModifiedTime: baseModifiedTime || "",
    force: false,
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKEND_CONNECT_TIMEOUT_MS);
  try {
    return await backendRequest(`/records/${encodeURIComponent(experiment.id)}`, {
      method: "PUT",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } finally {
    clearTimeout(timer);
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

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

function isImageFile(file) {
  return Boolean(
    file &&
      (String(file.type || "").startsWith("image/") ||
        /\.(avif|heic|heif|jpe?g|png|webp)$/i.test(String(file.name || ""))),
  );
}

async function storeSurgeryPhoto(recordId, file) {
  if (!isImageFile(file)) throw new Error(`${file?.name || "The selected file"} is not an image.`);

  if (driveState.connected) {
    const uploaded = await driveUploadAsset(recordId, file);
    return normalizeSurgeryPhoto({
      id: uid(),
      name: file.name || uploaded.name || "Surgery photo",
      mimeType: uploaded.mimeType || file.type || "image/jpeg",
      driveFileId: uploaded.id,
      createdAt: now(),
    });
  }

  return normalizeSurgeryPhoto({
    id: uid(),
    name: file.name || "Surgery photo",
    mimeType: file.type || "image/jpeg",
    dataUrl: await fileToDataUrl(file),
    createdAt: now(),
  });
}

async function appendSurgeryPhotos(record, field, files, onProgress = () => {}) {
  const imageFiles = Array.from(files || []).filter(isImageFile);
  record[field] = Array.isArray(record[field]) ? record[field] : [];

  for (let index = 0; index < imageFiles.length; index += 1) {
    onProgress(index + 1, imageFiles.length);
    const photo = await storeSurgeryPhoto(record.id, imageFiles[index]);
    if (!photo) continue;
    record[field].push(photo);
    record.updatedAt = now();
    await saveExperimentRecord(record);
  }
  return record;
}

async function backendRequest(path, options = {}) {
  const response = await backendFetch(path, options);
  if (!response.ok) throw await backendError(response);
  if (response.status === 204) return null;
  return response.json();
}

function isBackendNetworkError(error) {
  return (
    error instanceof TypeError ||
    /failed to fetch|networkerror|load failed|network request failed/i.test(
      String(error?.message || ""),
    )
  );
}

function backendConnectionError(error) {
  const connectionError = new Error(
    "Could not reach the notebook service. Check your internet connection, then retry.",
  );
  connectionError.cause = error;
  return connectionError;
}

async function backendConnectionRequest(path, options = {}) {
  const session = driveState;
  const authorization = options.headers?.Authorization || `Bearer ${session.accessToken}`;
  // Retry only reads: a failed upload/save can already have reached Drive.
  const maxAttempts = !options.method || options.method === "GET" ? 2 : 1;
  for (let index = 0; index < maxAttempts; index += 1) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    let timedOut = false;
    if (options.signal?.aborted) throw new DOMException("Connection cancelled", "AbortError");
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, BACKEND_CONNECT_TIMEOUT_MS);
    try {
      return await backendRequest(path, { ...options, signal: controller.signal });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      if (driveState !== session || `Bearer ${session.accessToken}` !== authorization) throw error;
      const transient = timedOut || isBackendNetworkError(error) || [429, 502, 503, 504].includes(error.status);
      if (!transient || index === maxAttempts - 1) {
        if (timedOut) throw new Error("The notebook service took too long to respond. Retry connection; you do not need to sign in again.");
        if (isBackendNetworkError(error)) throw backendConnectionError(error);
        throw error;
      }
    } finally {
      window.clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
    if (driveState === session && `Bearer ${session.accessToken}` === authorization) {
      driveState.status = "Retrying connection…";
      updateConnectionUi();
    }
    await new Promise((resolve) => window.setTimeout(resolve, BACKEND_CONNECT_RETRY_DELAY_MS));
  }
}

async function backendFetch(path, options = {}) {
  if (!driveSettings.backendUrl) throw new Error("Cloud Run backend URL is not configured.");
  return fetch(`${driveSettings.backendUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${driveState.accessToken}`,
      ...(options.headers || {}),
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

function handleDriveError(error, { notify = true } = {}) {
  console.error(error);
  if (error.status === 401 || error.status === 403) {
    rememberBackendCredential("");
  }
  driveState.connected = false;
  driveState.connecting = false;
  driveState.accessToken = "";
  driveState.status = error.status === 401 ? "Sign-in expired" : error.status === 403 ? "Account not allowed" : "Connection interrupted";
  driveState.error = error.message || String(error);
  updateConnectionUi();
  if (notify) window.alert(driveState.error);
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
  if (!activeExperiment) return;
  activeExperiment.updatedAt = now();
  activeExperiment.content = prepareContentForSave(activeExperiment.content || "");
  stageRecordSave(activeExperiment).catch(reportLocalSaveError);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushPendingWrites().catch(reportLocalSaveError);
  }, 350);
}

async function saveActiveExperiment() {
  clearTimeout(saveTimer);
  saveTimer = null;
  return flushPendingWrites();
}

function reportLocalSaveError(error) {
  console.error("Could not persist notebook changes", error);
  updateSaveUi();
}

function openNewRecordDialog(sectionId) {
  const section = sectionById(sectionId);
  const draft = {
    status: DEFAULT_RECORD_STATUS,
    outcome: DEFAULT_RECORD_OUTCOME,
    customFields: {},
  };
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
      status: data.get("status") || DEFAULT_RECORD_STATUS,
      outcome: data.get("outcome") || DEFAULT_RECORD_OUTCOME,
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
  if (driveSettings.backendUrl && !importedLocalOnly) return;
  const existing = await getAllExperiments();
  if (existing.some((record) => !isSurgeryRecord(record))) return;

  const section = sectionById(DEFAULT_SECTION_ID);
  await putExperiment(
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
  if (!await waitForLocalSaves()) {
    if (renderedHash && location.hash !== renderedHash) location.hash = renderedHash;
    updateSaveUi();
    return;
  }
  renderedHash = location.hash || "#/";
  const hash = location.hash || "#/";
  if (hash.startsWith("#/surgery/")) {
    await renderSurgeryDetailPage(hash.replace("#/surgery/", ""));
    return;
  }
  if (hash === "#/surgeries/collected") {
    renderSurgeriesPage("collected");
    return;
  }
  if (hash === "#/surgeries") {
    renderSurgeriesPage("active");
    return;
  }
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
  if (driveSettings.clientId && driveSettings.backendUrl) {
    warmBackend();
    loadGoogleIdentityScript().catch(() => {});
    driveState.status = "Drive not connected";
  }
  db = await openDb();
  const cachedMeta = driveSettings.backendUrl ? await NotebookPersistence.getWorkspaceMeta(db, driveSettings.backendUrl) : {};
  driveState.recordModifiedTimes = Object.fromEntries(Object.entries(cachedMeta).map(([id, meta]) => [id, meta.modifiedTime || ""]));
  await refreshPendingDrafts();
  await seedIfEmpty();
  await loadExperiments();
  window.addEventListener("hashchange", route);
  window.addEventListener("beforeunload", (event) => {
    if (localSaveOperations.size || failedLocalWrites.size || pendingDrafts.length) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushPendingWrites().catch(reportLocalSaveError);
  });
  await route();
  await tryAutoConnectBackend();
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
