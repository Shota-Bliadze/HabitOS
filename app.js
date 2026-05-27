// ── CONFIG ──
const API = "";  // empty = same origin

// ── DATA ──
const DAYS = ["Mo","Tu","We","Th","Fr","Sa","Su"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKS = ["Week 1","Week 2","Week 3","Week 4"];
const EMOJI_OPTIONS = ["⏰","💪","💼","📋","💰","❤️","🚫","🌿","📓","🏃","🧘","📚","💧","🍎","🎯","✨","🔥","⚡","🌅","🧠"];
const CATEGORIES = ["Health","Fitness","Work","Productivity","Finance","Mindset","Other"];
const COLORS = ["#7777ee","#55cc88","#ffaa44","#44aaff","#ffdd44","#ff5577","#aa55ff","#44ddaa","#ff8844","#ff44aa"];
const BG_COLORS = ["#080814","#0a0a0a","#080f0a","#0a080e","#080e10"];

const INITIAL_HABITS = [
  { id:1, name:"Wake up at 05:00",   emoji:"⏰", category:"Health",       color:"#7777ee" },
  { id:2, name:"Gym",                emoji:"💪", category:"Fitness",      color:"#55cc88" },
  { id:3, name:"Work on Side Hustle",emoji:"💼", category:"Work",         color:"#ffaa44" },
  { id:4, name:"Day Planning",       emoji:"📋", category:"Productivity", color:"#44aaff" },
  { id:5, name:"Budget Tracking",    emoji:"💰", category:"Finance",      color:"#ffdd44" },
  { id:6, name:"Project Work",       emoji:"❤️", category:"Work",         color:"#ff5577" },
  { id:7, name:"No Alcohol",         emoji:"🚫", category:"Health",       color:"#aa55ff" },
  { id:8, name:"Social Media Detox", emoji:"🌿", category:"Mindset",      color:"#44ddaa" },
  { id:9, name:"Goal Journaling",    emoji:"📓", category:"Mindset",      color:"#ff8844" },
];

// ── STATE ──
const now = new Date();
let token = localStorage.getItem("habitos_token") || null;
let username = localStorage.getItem("habitos_username") || null;
let saveTimer = null;

let state = {
  view: "tracker",
  adminTab: "overview",
  currentMonth: now.getMonth(),
  currentYear: now.getFullYear(),
  selectedWeek: 0,
  habits: JSON.parse(JSON.stringify(INITIAL_HABITS)),
  checked: {},
  accent: "#5555cc",
  bg: "#080814",
  newHabit: { name:"", emoji:"✨", category:"Health", color:"#7777ee" },
  editHabit: null,
};

// ── AUTH ──
function showAuthTab(tab) {
  document.querySelectorAll(".auth-tab").forEach((t,i) => t.classList.toggle("active", (i===0&&tab==="login")||(i===1&&tab==="register")));
  document.getElementById("login-form").style.display    = tab === "login"    ? "block" : "none";
  document.getElementById("register-form").style.display = tab === "register" ? "block" : "none";
  document.getElementById("login-error").textContent = "";
  document.getElementById("reg-error").textContent   = "";
}

async function login() {
  const email    = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;
  const errEl    = document.getElementById("login-error");
  errEl.textContent = "";
  try {
    const res  = await fetch(`${API}/api/login`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email, password }) });
    const data = await res.json();
    if (!res.ok) return errEl.textContent = data.error;
    setAuth(data.token, data.username);
    await loadData();
    showApp();
  } catch { errEl.textContent = "Connection error"; }
}

async function register() {
  const username = document.getElementById("reg-username").value.trim();
  const email    = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const errEl    = document.getElementById("reg-error");
  errEl.textContent = "";
  try {
    const res  = await fetch(`${API}/api/register`, { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ username, email, password }) });
    const data = await res.json();
    if (!res.ok) return errEl.textContent = data.error;
    setAuth(data.token, data.username);
    await loadData();
    showApp();
  } catch { errEl.textContent = "Connection error"; }
}

function setAuth(t, u) {
  token = t; username = u;
  localStorage.setItem("habitos_token", t);
  localStorage.setItem("habitos_username", u);
}

function logout() {
  token = null; username = null;
  localStorage.removeItem("habitos_token");
  localStorage.removeItem("habitos_username");
  document.getElementById("app").style.display = "none";
  document.getElementById("auth-screen").style.display = "flex";
}

function showApp() {
  document.getElementById("auth-screen").style.display = "none";
  document.getElementById("app").style.display = "block";
  document.getElementById("nav-username").textContent = username ? `👤 ${username}` : "";
  document.documentElement.style.setProperty("--accent", state.accent);
  document.body.style.background = state.bg;
  render();
}

// ── DATA SYNC ──
async function loadData() {
  try {
    const res  = await fetch(`${API}/api/data`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.habits && data.habits.length > 0) state.habits  = data.habits;
    if (data.checked)                           state.checked = data.checked;
    if (data.theme) {
      state.accent = data.theme.accent || state.accent;
      state.bg     = data.theme.bg     || state.bg;
    }
  } catch { console.error("Failed to load data"); }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  showSaving("Saving...");
  saveTimer = setTimeout(saveData, 1200);
}

async function saveData() {
  if (!token) return;
  try {
    await fetch(`${API}/api/data`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ habits: state.habits, checked: state.checked, theme: { accent: state.accent, bg: state.bg } })
    });
    showSaving("Saved ✓", 1500);
  } catch { showSaving("Save failed", 2000); }
}

function showSaving(msg, hideAfter = null) {
  let el = document.getElementById("saving-indicator");
  if (!el) {
    el = document.createElement("div");
    el.id = "saving-indicator";
    el.className = "saving-indicator";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.add("show");
  if (hideAfter) setTimeout(() => el.classList.remove("show"), hideAfter);
}

// ── INIT ──
async function init() {
  if (token) {
    await loadData();
    showApp();
  } else {
    document.getElementById("auth-screen").style.display = "flex";
    document.getElementById("app").style.display = "none";
  }
}

// ── HELPERS ──
function getWeekDays(w) { const s = w*7+1; return Array.from({length:7},(_,i)=>s+i); }
function isChecked(habitId, day) { return !!state.checked[`${state.currentYear}-${state.currentMonth}-${habitId}-${day}`]; }

function toggleCheck(habitId, day) {
  const k = `${state.currentYear}-${state.currentMonth}-${habitId}-${day}`;
  state.checked[k] = !state.checked[k];
  scheduleSave();
  render();
}

function habitWeekProgress(habitId) {
  const days = getWeekDays(state.selectedWeek);
  return Math.round((days.filter(d => isChecked(habitId, d)).length / 7) * 100);
}

function weekStats() {
  const days = getWeekDays(state.selectedWeek);
  const total = state.habits.length * 7;
  const done  = days.reduce((a,d) => a + state.habits.filter(h => isChecked(h.id, d)).length, 0);
  return { total, done, notDone: total-done, pct: total > 0 ? Math.round((done/total)*100) : 0 };
}

function monthStats() {
  const allDays = Array.from({length:28},(_,i)=>i+1);
  const done  = allDays.reduce((a,d) => a + state.habits.filter(h => isChecked(h.id,d)).length, 0);
  const total = state.habits.length * 28;
  return { done, pct: total > 0 ? Math.round((done/total)*100) : 0 };
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`;
}

function setAccent(color) { state.accent = color; document.documentElement.style.setProperty("--accent", color); scheduleSave(); render(); }
function setBg(color)     { state.bg = color; document.body.style.background = color; scheduleSave(); render(); }

// ── VIEW SWITCHING ──
function switchView(v) {
  state.view = v;
  document.querySelectorAll(".page, .admin-page").forEach(el => el.classList.remove("active"));
  document.getElementById(v === "tracker" ? "page-tracker" : "page-admin").classList.add("active");
  document.querySelectorAll(".nav-link").forEach((el,i) => el.classList.toggle("active", (i===0&&v==="tracker")||(i===1&&v==="admin")));
  render();
}

function switchAdminTab(tab, btn) {
  state.adminTab = tab;
  document.querySelectorAll(".admin-tab").forEach(el => el.classList.add("hidden"));
  document.getElementById("tab-" + tab).classList.remove("hidden");
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  render();
}

// ── RENDER TRACKER ──
function renderTracker() {
  const days  = getWeekDays(state.selectedWeek);
  const stats = weekStats();
  document.getElementById("month-title").textContent = MONTHS[state.currentMonth];
  document.getElementById("year-title").textContent  = state.currentYear;
  document.getElementById("week-pills").innerHTML = WEEKS.map((w,i) =>
    `<button class="week-pill ${state.selectedWeek===i?"active":""}" onclick="selectWeek(${i})">${w}</button>`).join("");
  document.getElementById("day-headers").innerHTML  = DAYS.map(d => `<div class="day-cell">${d}</div>`).join("");
  document.getElementById("day-numbers").innerHTML  = days.map(d => `<div class="day-num-cell">${d<=31?d:""}</div>`).join("");
  document.getElementById("habit-list").innerHTML   = state.habits.map(h => {
    const pct    = habitWeekProgress(h.id);
    const checks = days.map(d => {
      const on = isChecked(h.id, d);
      return `<div class="chk ${on?"on":""}" style="${on?`background:${h.color};border-color:${h.color};`:""}" onclick="toggleCheck(${h.id},${d})">${on?"✓":""}</div>`;
    }).join("");
    return `<div class="habit-row">
      <div class="habit-info">
        <div class="habit-top">
          <span class="habit-emoji">${h.emoji}</span>
          <span class="habit-name">${h.name}</span>
          <span class="habit-cat" style="color:${h.color};background:${h.color}22">${h.category}</span>
        </div>
        <div class="habit-bar-row">
          <div class="pbar-bg"><div class="pbar-fill" style="width:${pct}%;background:linear-gradient(90deg,${h.color}88,${h.color})"></div></div>
          <span class="pbar-pct">${pct}%</span>
        </div>
      </div>
      <div class="chk-row">${checks}</div>
    </div>`;
  }).join("") || `<div style="text-align:center;padding:24px;color:#333366;font-size:12px;">No habits yet. Add them in Admin → Habits.</div>`;
  document.getElementById("stat-pct").textContent  = stats.pct + "%";
  document.getElementById("stat-done").textContent = stats.done;
  document.getElementById("stat-not").textContent  = stats.notDone;
  document.getElementById("prog-lbl").textContent  = stats.pct + "%";
  document.getElementById("prog-bar").style.width  = stats.pct + "%";
}

// ── RENDER ADMIN OVERVIEW ──
function renderOverview() {
  const ms = monthStats(), ws2 = weekStats();
  document.getElementById("overview-stats").innerHTML = [
    { label:"Total Habits",     value: state.habits.length, color: state.accent, icon:"📝" },
    { label:"Monthly Progress", value: ms.pct+"%",          color:"#55cc88",     icon:"📅" },
    { label:"This Week",        value: ws2.pct+"%",         color:"#ffaa44",     icon:"📆" },
    { label:"Completions",      value: ms.done,             color:"#aa55ff",     icon:"✅" },
  ].map(s => `<div class="overview-card"><div class="overview-icon">${s.icon}</div><div><div class="overview-val" style="color:${s.color}">${s.value}</div><div class="overview-lbl">${s.label}</div></div></div>`).join("");

  const best  = state.habits.length > 0 ? state.habits.reduce((b,h) => habitWeekProgress(h.id) >= habitWeekProgress(b.id) ? h : b, state.habits[0]) : null;
  const worst = state.habits.length > 0 ? state.habits.reduce((w,h) => habitWeekProgress(h.id) <= habitWeekProgress(w.id) ? h : w, state.habits[0]) : null;
  document.getElementById("highlights").innerHTML = `
    <div class="highlight-card best"><div class="highlight-tag">🏆 Best Habit</div>${best?`<div class="highlight-name">${best.emoji} ${best.name}</div><div class="highlight-pct">${habitWeekProgress(best.id)}%</div>`:"—"}</div>
    <div class="highlight-card worst"><div class="highlight-tag">⚠️ Needs Work</div>${worst?`<div class="highlight-name">${worst.emoji} ${worst.name}</div><div class="highlight-pct">${habitWeekProgress(worst.id)}%</div>`:"—"}</div>`;
  const cats = CATEGORIES.filter(c => state.habits.some(h => h.category === c));
  document.getElementById("cat-breakdown").innerHTML = cats.map(cat => {
    const ch = state.habits.filter(h => h.category === cat);
    const col = ch[0]?.color || "#5555cc";
    const pct = state.habits.length > 0 ? (ch.length/state.habits.length)*100 : 0;
    return `<div class="cat-row"><div class="cat-name">${cat}</div><div class="cat-count" style="color:${col}">${ch.length}</div><div class="pbar-bg"><div class="pbar-fill" style="width:${pct}%;background:${col}"></div></div></div>`;
  }).join("");
}

// ── RENDER ADMIN HABITS ──
function renderAdminHabits() {
  ["new-cat","edit-cat"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join("");
  });
  buildEmojiPicker("new");
  buildColorSwatches("new-color-swatches", state.newHabit.color, c => { state.newHabit.color = c; renderAdminHabits(); });
  document.getElementById("new-name").value       = state.newHabit.name;
  document.getElementById("new-cat").value        = state.newHabit.category;
  document.getElementById("new-emoji-btn").textContent = state.newHabit.emoji;
  document.getElementById("habit-count-lbl").textContent = `All Habits (${state.habits.length})`;
  document.getElementById("admin-habit-list").innerHTML = state.habits.map(h => `
    <div class="admin-habit-row">
      <div class="color-bar" style="background:${h.color}"></div>
      <span style="font-size:20px">${h.emoji}</span>
      <div class="admin-habit-info"><div class="admin-habit-name">${h.name}</div><div class="admin-habit-cat" style="color:${h.color}">${h.category}</div></div>
      <div class="admin-habit-pct">${habitWeekProgress(h.id)}%</div>
      <div class="admin-habit-actions">
        <button class="btn btn-ghost btn-sm" onclick="openEdit(${h.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteHabit(${h.id})">Delete</button>
      </div>
    </div>`).join("") || `<div style="text-align:center;padding:40px;color:#333366;font-size:12px;">No habits yet.</div>`;
}

// ── RENDER ANALYTICS ──
function renderAnalytics() {
  const days = getWeekDays(state.selectedWeek);
  document.getElementById("analytics-habits").innerHTML = state.habits.map(h => {
    const pct     = habitWeekProgress(h.id);
    const dayBars = days.map((d,i) => { const on = isChecked(h.id,d); return `<div class="analytics-day" style="${on?`background:${h.color};border-color:${h.color};color:#fff`:""}">${DAYS[i]}</div>`; }).join("");
    return `<div class="analytics-habit"><div class="analytics-row-header"><span class="analytics-habit-name">${h.emoji} ${h.name}</span><span class="analytics-pct" style="color:${h.color}">${pct}%</span></div><div class="analytics-day-row">${dayBars}</div></div>`;
  }).join("");
  const rgb = hexToRgb(state.accent);
  const allDays = Array.from({length:28},(_,i)=>i+1);
  document.getElementById("heatmap").innerHTML =
    DAYS.map(d => `<div class="heatmap-day-label">${d}</div>`).join("") +
    allDays.map(d => {
      const done = state.habits.filter(h => isChecked(h.id,d)).length;
      const intensity = state.habits.length > 0 ? done/state.habits.length : 0;
      const bg  = intensity === 0 ? "#0d0d25" : `rgba(${rgb},${0.15+intensity*0.85})`;
      const col = intensity > 0.5 ? "#fff" : "#333366";
      return `<div class="heatmap-cell" style="background:${bg};color:${col}">${d}</div>`;
    }).join("");
  document.getElementById("heatmap-legend-swatches").innerHTML = [0.1,0.3,0.5,0.7,1].map(v =>
    `<div class="legend-swatch" style="background:rgba(${rgb},${v})"></div>`).join("");
}

// ── RENDER SETTINGS ──
function renderSettings() {
  buildColorSwatches("accent-swatches", state.accent, c => setAccent(c), true);
  buildColorSwatches("bg-swatches", state.bg, c => setBg(c), true, BG_COLORS, true);
}

// ── EMOJI / COLOR ──
function buildEmojiPicker(prefix) {
  const el = document.getElementById(`emoji-picker-${prefix}`);
  if (el) el.innerHTML = EMOJI_OPTIONS.map(e => `<div class="emoji-opt" onclick="selectEmoji('${prefix}','${e}')">${e}</div>`).join("");
}

function toggleEmojiPicker(prefix) { document.getElementById(`emoji-picker-${prefix}`).classList.toggle("open"); }

function selectEmoji(prefix, emoji) {
  if (prefix === "new") { state.newHabit.emoji = emoji; document.getElementById("new-emoji-btn").textContent = emoji; }
  else { if (state.editHabit) state.editHabit.emoji = emoji; document.getElementById("edit-emoji-btn").textContent = emoji; renderEditColorSwatches(); }
  document.getElementById(`emoji-picker-${prefix}`).classList.remove("open");
}

function buildColorSwatches(containerId, selected, onClick, isLg=false, colorSet=COLORS, hasBorder=false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = colorSet.map(c =>
    `<div class="color-swatch ${isLg?"lg":""} ${c===selected?"selected":""}" style="background:${c};${hasBorder?"border:1px solid #333;":""}" onclick="(${onClick.toString()})('${c}')"></div>`).join("");
}

// ── HABIT CRUD ──
function addHabit() {
  const name = document.getElementById("new-name").value.trim();
  if (!name) return;
  state.newHabit.name     = name;
  state.newHabit.category = document.getElementById("new-cat").value;
  state.habits.push({ ...state.newHabit, id: Date.now(), name });
  state.newHabit = { name:"", emoji:"✨", category:"Health", color:"#7777ee" };
  scheduleSave();
  render();
}

function deleteHabit(id) { state.habits = state.habits.filter(h => h.id !== id); scheduleSave(); render(); }

function openEdit(id) {
  state.editHabit = { ...state.habits.find(h => h.id === id) };
  document.getElementById("edit-modal").classList.add("open");
  document.getElementById("edit-name").value              = state.editHabit.name;
  document.getElementById("edit-cat").value               = state.editHabit.category;
  document.getElementById("edit-emoji-btn").textContent   = state.editHabit.emoji;
  buildEmojiPicker("edit");
  renderEditColorSwatches();
}

function renderEditColorSwatches() {
  if (!state.editHabit) return;
  buildColorSwatches("edit-color-swatches", state.editHabit.color, c => { state.editHabit.color = c; renderEditColorSwatches(); });
}

function saveEdit() {
  if (!state.editHabit) return;
  state.editHabit.name     = document.getElementById("edit-name").value.trim() || state.editHabit.name;
  state.editHabit.category = document.getElementById("edit-cat").value;
  state.habits = state.habits.map(h => h.id === state.editHabit.id ? state.editHabit : h);
  closeModal();
  scheduleSave();
  render();
}

function closeModal() { state.editHabit = null; document.getElementById("edit-modal").classList.remove("open"); }

// ── SETTINGS ACTIONS ──
function showConfirmReset() {
  document.getElementById("reset-area").innerHTML = `<div class="confirm-reset"><span class="confirm-text">Are you sure?</span><button class="btn btn-danger" onclick="resetAll()">Yes, Reset</button><button class="btn btn-ghost" onclick="cancelReset()">Cancel</button></div>`;
}
function cancelReset() {
  document.getElementById("reset-area").innerHTML = `<button class="btn btn-danger" onclick="showConfirmReset()">🗑 Reset All Progress</button>`;
}
function resetAll()        { state.checked = {}; cancelReset(); scheduleSave(); render(); }
function restoreDefaults() { state.habits = JSON.parse(JSON.stringify(INITIAL_HABITS)); scheduleSave(); render(); }

// ── NAVIGATION ──
function prevMonth()   { if (state.currentMonth===0){state.currentMonth=11;state.currentYear--;}else state.currentMonth--; render(); }
function nextMonth()   { if (state.currentMonth===11){state.currentMonth=0;state.currentYear++;}else state.currentMonth++; render(); }
function selectWeek(i) { state.selectedWeek = i; render(); }

// ── MAIN RENDER ──
function render() {
  if (state.view === "tracker") renderTracker();
  if (state.view === "admin") {
    if (state.adminTab === "overview")  renderOverview();
    if (state.adminTab === "habits")    renderAdminHabits();
    if (state.adminTab === "analytics") renderAnalytics();
    if (state.adminTab === "settings")  renderSettings();
  }
}

document.addEventListener("click", e => {
  if (!e.target.closest(".emoji-wrap")) document.querySelectorAll(".emoji-grid").forEach(el => el.classList.remove("open"));
});

init();