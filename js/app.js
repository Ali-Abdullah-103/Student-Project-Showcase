/* Student Project Showcase – vanilla JavaScript (no frameworks).
   Everything runs in the browser; data comes from js/data.js plus any
   projects the user adds (kept in localStorage when available). */
"use strict";

// ---------- Constants & state ----------
const MAX_TEAM = 4;
const MIN_TEAM = 1;
const MAX_TAGS = 6;
const STORAGE_KEYS = { added: "sps-added", likes: "sps-likes", saved: "sps-saved" };

const state = {
  projects: [],
  filters: { q: "", category: "all", semester: "all", sort: "newest", featured: false, tag: null },
  saved: new Set()
};

// ---------- Small helpers ----------
const $ = (sel) => document.querySelector(sel);

function storageGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback; // storage blocked or corrupt – fall back to in-memory only
  }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
}

/** Featured rule: needs BOTH a GitHub repo and a live demo link. */
function isFeatured(p) {
  return Boolean(p.repo) && Boolean(p.demo);
}

function splitList(value) {
  return value.split(",").map((s) => s.trim()).filter((s) => s.length > 0);
}

function normalise(str) {
  return str.trim().toLowerCase().replace(/\s+/g, " ");
}

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v; // textContent = safe output, no HTML injection
    else if (k.startsWith("data-")) node.setAttribute(k, v);
    else if (k in node) node[k] = v;
    else node.setAttribute(k, v);
  }
  children.flat().forEach((c) => c != null && node.append(c));
  return node;
}

function formatDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

// ---------- Init ----------
function init() {
  const added = storageGet(STORAGE_KEYS.added, []);
  const likes = storageGet(STORAGE_KEYS.likes, {});
  state.projects = [...SAMPLE_PROJECTS, ...added].map((p) => ({
    ...p,
    likes: likes[p.id] != null ? likes[p.id] : p.likes
  }));
  state.saved = new Set(storageGet(STORAGE_KEYS.saved, []));

  fillSelect($("#categoryFilter"), CATEGORIES);
  fillSelect($("#semesterFilter"), SEMESTERS);
  fillSelect($("#pCategory"), CATEGORIES);
  fillSelect($("#pSemester"), SEMESTERS);

  bindNav();
  bindFilters();
  bindForm();
  bindDialog();

  renderAll();
}

function fillSelect(select, values) {
  values.forEach((v) => select.append(el("option", { value: v, text: v })));
}

function renderAll() {
  renderTagCloud();
  renderProjects();
  renderStats();
  renderShortlist();
  renderHero();
}

// ---------- Navigation ----------
function bindNav() {
  const toggle = $("#navToggle");
  const nav = $("#siteNav");
  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("open", !open);
  });
  nav.addEventListener("click", (e) => {
    if (e.target.closest("a")) {
      toggle.setAttribute("aria-expanded", "false");
      nav.classList.remove("open");
    }
  });
}

// ---------- Filtering ----------
function bindFilters() {
  const form = $("#filterForm");
  form.addEventListener("submit", (e) => e.preventDefault());

  $("#searchInput").addEventListener("input", (e) => {
    state.filters.q = e.target.value;
    renderProjects();
  });
  $("#categoryFilter").addEventListener("change", (e) => {
    state.filters.category = e.target.value;
    renderProjects();
  });
  $("#semesterFilter").addEventListener("change", (e) => {
    state.filters.semester = e.target.value;
    renderProjects();
  });
  $("#sortSelect").addEventListener("change", (e) => {
    state.filters.sort = e.target.value;
    renderProjects();
  });
  $("#featuredOnly").addEventListener("change", (e) => {
    state.filters.featured = e.target.checked;
    renderProjects();
  });

  form.addEventListener("reset", () => {
    // let the browser reset the controls first, then reset state
    setTimeout(resetFilters, 0);
  });
  $("#emptyReset").addEventListener("click", () => form.reset());

  // Event delegation for all buttons on project cards
  $("#projectGrid").addEventListener("click", handleCardClick);
  $("#tagCloud").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-tag]");
    if (!btn) return;
    const tag = btn.dataset.tag;
    state.filters.tag = state.filters.tag === tag ? null : tag;
    renderTagCloud();
    renderProjects();
  });
}

function resetFilters() {
  state.filters = { q: "", category: "all", semester: "all", sort: "newest", featured: false, tag: null };
  renderTagCloud();
  renderProjects();
}

function getFilteredProjects() {
  const { q, category, semester, sort, featured, tag } = state.filters;
  const query = normalise(q);

  let list = state.projects.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (semester !== "all" && p.semester !== semester) return false;
    if (featured && !isFeatured(p)) return false;
    if (tag && !p.tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return false;
    if (query) {
      const haystack = [p.title, p.summary, p.course, ...p.tags, ...p.members].join(" ").toLowerCase();
      // every word in the query must appear somewhere
      return query.split(" ").every((word) => haystack.includes(word));
    }
    return true;
  });

  const sorters = {
    newest: (a, b) => b.added.localeCompare(a.added),
    likes: (a, b) => b.likes - a.likes,
    title: (a, b) => a.title.localeCompare(b.title)
  };
  return list.sort(sorters[sort] || sorters.newest);
}

// ---------- Rendering: cards ----------
function renderProjects() {
  const grid = $("#projectGrid");
  const list = getFilteredProjects();
  grid.replaceChildren(...list.map(projectCard));

  const total = state.projects.length;
  $("#resultCount").textContent =
    list.length === total ? `Showing all ${total} projects` : `Showing ${list.length} of ${total} projects`;
  $("#emptyState").hidden = list.length > 0;
}

function projectCard(p) {
  const saved = state.saved.has(p.id);
  const featured = isFeatured(p);

  return el("li", { class: "project-card" + (featured ? " is-featured" : "") },
    el("article", {},
      el("div", { class: "card-top" },
        el("span", { class: "chip chip-cat", text: p.category }),
        featured ? el("span", { class: "chip chip-featured", text: "★ Featured" }) : null
      ),
      el("h3", { class: "card-title" },
        el("button", { type: "button", class: "link-btn", "data-action": "open", "data-id": p.id, text: p.title })
      ),
      el("p", { class: "card-meta", text: `${p.course} · ${p.semester} · ${p.members.length} member${p.members.length > 1 ? "s" : ""}` }),
      el("p", { class: "card-summary", text: p.summary }),
      el("ul", { class: "tag-list", "aria-label": "Technologies" },
        p.tags.map((t) => el("li", { class: "tag", text: t }))
      ),
      el("div", { class: "card-actions" },
        el("button", {
          type: "button", class: "btn btn-small btn-ghost", "data-action": "like", "data-id": p.id,
          "aria-label": `Like ${p.title}, ${p.likes} likes`
        }, "♥ ", el("span", { text: String(p.likes) })),
        el("button", {
          type: "button", class: "btn btn-small " + (saved ? "btn-primary" : "btn-ghost"),
          "data-action": "save", "data-id": p.id, "aria-pressed": String(saved),
          text: saved ? "★ Saved" : "☆ Save"
        }),
        el("button", { type: "button", class: "btn btn-small btn-ghost", "data-action": "open", "data-id": p.id, text: "Details" })
      )
    )
  );
}

function handleCardClick(e) {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const id = Number(btn.dataset.id);
  const project = state.projects.find((p) => p.id === id);
  if (!project) return;

  switch (btn.dataset.action) {
    case "like":
      project.likes += 1;
      persistLikes();
      renderProjects();
      renderStats();
      break;
    case "save":
      toggleSaved(id);
      break;
    case "open":
      openDetail(project);
      break;
  }
}

function persistLikes() {
  const likes = {};
  state.projects.forEach((p) => { likes[p.id] = p.likes; });
  storageSet(STORAGE_KEYS.likes, likes);
}

function toggleSaved(id) {
  if (state.saved.has(id)) state.saved.delete(id);
  else state.saved.add(id);
  storageSet(STORAGE_KEYS.saved, [...state.saved]);
  renderProjects();
  renderShortlist();
}

// ---------- Tag cloud ----------
function tagCounts() {
  const counts = {};
  state.projects.forEach((p) => p.tags.forEach((t) => { counts[t] = (counts[t] || 0) + 1; }));
  return Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function renderTagCloud() {
  const cloud = $("#tagCloud");
  const top = tagCounts().slice(0, 12);
  cloud.replaceChildren(
    el("span", { class: "tag-cloud-label", text: "Quick tags:" }),
    ...top.map(([tag, n]) =>
      el("button", {
        type: "button", class: "tag-btn" + (state.filters.tag === tag ? " active" : ""),
        "data-tag": tag, "aria-pressed": String(state.filters.tag === tag),
        text: `${tag} (${n})`
      })
    )
  );
}

// ---------- Detail dialog ----------
function bindDialog() {
  const dlg = $("#detailDialog");
  $("#dlgClose").addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); }); // click backdrop
}

function linkOrNote(url, label) {
  return url
    ? el("a", { href: url, target: "_blank", rel: "noopener noreferrer", text: label })
    : el("span", { class: "muted", text: `No ${label.toLowerCase()} provided` });
}

function openDetail(p) {
  $("#dlgTitle").textContent = p.title;
  $("#dlgBody").replaceChildren(
    el("p", { class: "card-meta", text: `${p.category} · ${p.course} · ${p.semester} · added ${formatDate(p.added)}` }),
    el("p", { text: p.summary }),
    el("h3", { text: "Team" }),
    el("ul", { class: "member-list" }, p.members.map((m) => el("li", { text: m }))),
    el("h3", { text: "Technologies" }),
    el("ul", { class: "tag-list" }, p.tags.map((t) => el("li", { class: "tag", text: t }))),
    el("h3", { text: "Links" }),
    el("p", { class: "dlg-links" }, linkOrNote(p.repo, "Repository"), " ", linkOrNote(p.demo, "Live demo")),
    el("p", { class: "muted" }, "Contact: ", el("a", { href: `mailto:${p.email}`, text: p.email })),
    el("p", { class: isFeatured(p) ? "status ok" : "status", text: isFeatured(p)
      ? "★ Featured – has a repository and a live demo."
      : "Not featured – needs both a repository and a live demo link." })
  );
  $("#detailDialog").showModal();
}

// ---------- Stats ----------
function renderBars(listEl, entries) {
  const max = Math.max(1, ...entries.map(([, n]) => n));
  listEl.replaceChildren(...entries.map(([label, n]) =>
    el("li", {},
      el("span", { class: "bar-label", text: label }),
      el("span", { class: "bar-track", "aria-hidden": "true" },
        el("span", { class: "bar-fill", style: `width:${(n / max) * 100}%` })
      ),
      el("span", { class: "bar-value", text: String(n) })
    )
  ));
}

function renderStats() {
  const byCat = CATEGORIES.map((c) => [c, state.projects.filter((p) => p.category === c).length]);
  renderBars($("#categoryBars"), byCat);
  renderBars($("#tagBars"), tagCounts().slice(0, 6));

  const total = state.projects.length;
  const featuredCount = state.projects.filter(isFeatured).length;
  const avgTeam = total ? state.projects.reduce((s, p) => s + p.members.length, 0) / total : 0;
  const top = [...state.projects].sort((a, b) => b.likes - a.likes)[0];

  const rows = [
    ["Featured projects", `${featuredCount} of ${total}`],
    ["Average team size", avgTeam.toFixed(1)],
    ["Most liked", top ? `${top.title} (${top.likes})` : "—"],
    ["Total likes", String(state.projects.reduce((s, p) => s + p.likes, 0))]
  ];
  $("#highlights").replaceChildren(...rows.flatMap(([k, v]) => [el("dt", { text: k }), el("dd", { text: v })]));
}

function renderHero() {
  const students = new Set();
  state.projects.forEach((p) => p.members.forEach((m) => students.add(normalise(m))));
  $("#heroProjects").textContent = state.projects.length;
  $("#heroStudents").textContent = students.size;
  $("#heroCourses").textContent = new Set(state.projects.map((p) => p.course.toUpperCase())).size;
}

// ---------- Shortlist ----------
function renderShortlist() {
  const list = $("#shortlistList");
  const items = state.projects.filter((p) => state.saved.has(p.id));
  list.replaceChildren(...items.map((p) =>
    el("li", {},
      el("button", { type: "button", class: "link-btn", text: p.title, onclick: () => openDetail(p) }),
      el("span", { class: "muted", text: ` – ${p.category}, ${p.semester}` }),
      el("button", { type: "button", class: "btn btn-small btn-ghost", text: "Remove",
        "aria-label": `Remove ${p.title} from shortlist`, onclick: () => toggleSaved(p.id) })
    )
  ));
  $("#shortlistEmpty").hidden = items.length > 0;
  $("#shortlistCount").textContent = items.length;
}

// ---------- Submit form ----------
function bindForm() {
  const form = $("#submitForm");
  const summary = $("#pSummary");

  summary.addEventListener("input", () => {
    $("#summaryCounter").textContent = summary.value.length;
  });

  // live "Featured" preview as the user types links
  ["#pRepo", "#pDemo"].forEach((sel) =>
    $(sel).addEventListener("input", updateFeaturedPreview)
  );

  // validate a field when the user leaves it
  form.querySelectorAll("input, select, textarea").forEach((field) => {
    field.addEventListener("blur", () => validateField(field));
  });

  // duplicate-title rule depends on the semester, so re-check the title when it changes
  $("#pSemester").addEventListener("change", () => {
    if ($("#pTitle").value.trim()) validateField($("#pTitle"));
  });

  form.addEventListener("submit", handleSubmit);
  form.addEventListener("reset", () => {
    setTimeout(() => {
      form.querySelectorAll(".error").forEach((e) => { e.textContent = ""; });
      form.querySelectorAll("[aria-invalid]").forEach((f) => f.removeAttribute("aria-invalid"));
      $("#summaryCounter").textContent = "0";
      $("#formStatus").textContent = "";
      $("#formStatus").className = "form-status";
      updateFeaturedPreview();
    }, 0);
  });
}

function updateFeaturedPreview() {
  const repo = $("#pRepo").value.trim();
  const demo = $("#pDemo").value.trim();
  const preview = $("#featuredPreview");
  if (repo && demo) {
    preview.innerHTML = "✔ This project will be <strong>Featured</strong>.";
    preview.classList.add("ok");
  } else {
    preview.innerHTML = "Add both links to qualify as <strong>Featured</strong>.";
    preview.classList.remove("ok");
  }
}

/** Custom rules beyond what HTML attributes can express. Returns "" if OK. */
function customError(field) {
  const value = field.value.trim();
  switch (field.name) {
    case "title": {
      if (!value) return "";
      const semester = $("#pSemester").value;
      const dup = state.projects.some((p) =>
        normalise(p.title) === normalise(value) && (!semester || p.semester === semester));
      if (dup) return semester
        ? `"${value}" already exists in ${semester}. Choose another title.`
        : `"${value}" already exists. Pick a semester or change the title.`;
      return "";
    }
    case "members": {
      const names = splitList(value);
      if (!value) return "";
      if (names.length < MIN_TEAM || names.length > MAX_TEAM)
        return `Teams must have ${MIN_TEAM}–${MAX_TEAM} members (you entered ${names.length}).`;
      if (names.some((n) => n.length < 3 || !/^[A-Za-z][A-Za-z .'-]*$/.test(n)))
        return "Use full names with letters only, separated by commas.";
      const unique = new Set(names.map(normalise));
      if (unique.size !== names.length) return "The same member is listed twice.";
      return "";
    }
    case "tags": {
      const tags = splitList(value);
      if (!value) return "";
      if (tags.length > MAX_TAGS) return `Use at most ${MAX_TAGS} tags (you entered ${tags.length}).`;
      if (tags.some((t) => t.length > 20)) return "Each tag must be 20 characters or fewer.";
      return "";
    }
    case "summary":
      if (value && value.length < 20) return "Summary must be at least 20 characters (spaces at the ends don't count).";
      return "";
    default:
      return "";
  }
}

function friendlyMessage(field) {
  const v = field.validity;
  const label = field.labels[0] ? field.labels[0].textContent.replace("*", "").trim() : field.name;
  if (v.valueMissing) return `${label} is required.`;
  if (v.typeMismatch && field.type === "email") return "Enter a valid email address, e.g. name@example.edu.";
  if (v.typeMismatch && field.type === "url") return "Enter a full URL starting with https://";
  if (v.patternMismatch && field.name === "repo") return "Use a GitHub link like https://github.com/user/repo";
  if (v.patternMismatch && field.name === "course") return "Course code must look like CS344 or SE-312.";
  if (v.tooShort) return `${label} must be at least ${field.minLength} characters.`;
  if (v.tooLong) return `${label} must be at most ${field.maxLength} characters.`;
  return field.validationMessage;
}

function validateField(field) {
  if (!field.name) return true;
  field.setCustomValidity(customError(field));
  const errEl = document.getElementById(field.id + "Err");
  const ok = field.checkValidity();
  if (errEl) errEl.textContent = ok ? "" : friendlyMessage(field);
  if (ok) field.removeAttribute("aria-invalid");
  else field.setAttribute("aria-invalid", "true");
  return ok;
}

function handleSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const fields = [...form.querySelectorAll("input, select, textarea")];
  const results = fields.map(validateField);
  const status = $("#formStatus");

  if (results.includes(false)) {
    const firstBad = fields[results.indexOf(false)];
    firstBad.focus();
    status.textContent = `Please fix ${results.filter((r) => !r).length} highlighted field(s).`;
    status.className = "form-status error-status";
    return;
  }

  const data = new FormData(form);
  const project = {
    id: Date.now(),
    title: data.get("title").trim(),
    category: data.get("category"),
    semester: data.get("semester"),
    course: data.get("course").trim().toUpperCase(),
    summary: data.get("summary").trim(),
    tags: [...new Set(splitList(data.get("tags")))],
    members: splitList(data.get("members")),
    email: data.get("email").trim(),
    repo: data.get("repo").trim(),
    demo: data.get("demo").trim(),
    likes: 0,
    added: new Date().toISOString().slice(0, 10)
  };

  state.projects.push(project);
  const added = storageGet(STORAGE_KEYS.added, []);
  added.push(project);
  storageSet(STORAGE_KEYS.added, added);

  form.reset();
  // reset handler clears status asynchronously, so set it afterwards
  setTimeout(() => {
    status.textContent = `"${project.title}" was added${isFeatured(project) ? " as a Featured project" : ""}.`;
    status.className = "form-status ok-status";
  }, 10);

  resetFilters();
  $("#filterForm").reset();
  renderStats();
  renderShortlist();
  renderHero();
}

document.addEventListener("DOMContentLoaded", init);
