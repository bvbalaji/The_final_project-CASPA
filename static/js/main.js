'use strict';

// ── MODE ──────────────────────────────────────────────────────────────────────
let currentMode = 'ml'; // 'ml' | 'ai'

function setMode(mode) {
  currentMode = mode;
  const toggle = document.getElementById('mode-toggle');
  toggle.checked = (mode === 'ai');
  document.getElementById('mode-opt-ml').classList.toggle('active', mode === 'ml');
  document.getElementById('mode-opt-ai').classList.toggle('active', mode === 'ai');
  const apiSection = document.getElementById('api-key-section');
  apiSection.style.display = mode === 'ai' ? 'block' : 'none';
  const btn = document.getElementById('predict-btn');
  if (mode === 'ai') {
    btn.innerHTML = '<span class="btn-icon">✨</span> LAUNCH AI ANALYSIS';
  } else {
    btn.innerHTML = '<span class="btn-icon">🚀</span> LAUNCH CAREER PREDICTION';
  }
}

function handleModeToggle(cb) {
  setMode(cb.checked ? 'ai' : 'ml');
}

const SKILL_LABELS = ['NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED', 'EXPERT'];
// Each level maps to a neon colour for the badge glow
const SKILL_COLORS = ['rgba(255,255,255,0.2)', '#00F5FF', '#BF5FFF', '#FF2D78', '#FFE100'];

let isReady      = false;
let radarChart   = null;
let lastAiResult = null;
let lastAiPayload= null;
let savedFieldValue = null;
let lastMlPayload   = null;  // base payload from last ML prediction (what-if baseline)
let whatIfTimer     = null;

// Skill metadata for gap analysis + what-if
const SKILL_META = {
  coding:          { name: '💻 Coding & Technology',  advice: 'Try beginner coding games, Scratch projects, or a free intro-to-Python course.' },
  communication:   { name: '🗣️ Communication',        advice: 'Join a debate club, volunteer for class presentations, or keep a daily journal.' },
  problem_solving: { name: '🧩 Problem Solving',       advice: 'Tackle logic puzzles, strategy games, or math-olympiad style challenges.' },
  teamwork:        { name: '🤝 Teamwork',              advice: 'Join a team sport, a group project, or a collaborative community club.' },
  analytical:      { name: '📈 Analytical Thinking',   advice: 'Explore science experiments, chess, or simple data/spreadsheet puzzles.' },
  presentation:    { name: '📢 Presentation',          advice: 'Practice show-and-tell, build slide decks, or record short explainer videos.' },
  networking:      { name: '🌐 Networking & Social',   advice: 'Attend workshops, join clubs, or volunteer to meet new people regularly.' },
};

// ── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initDarkMode();
  initSliders();
  initToggles();
  initRadios();
  initLocalStorage();
  populateFields();
  pollStatus();
  document.getElementById('predict-form').addEventListener('submit', handleSubmit);
  document.getElementById('reset-btn').addEventListener('click', resetForm);
  // Mode toggle wiring
  document.getElementById('mode-toggle').addEventListener('change', function() { handleModeToggle(this); });
  document.getElementById('mode-opt-ml').addEventListener('click', () => setMode('ml'));
  document.getElementById('mode-opt-ai').addEventListener('click', () => setMode('ai'));
  setMode('ml'); // default
  initFollowUp();
  document.getElementById('download-btn').addEventListener('click', downloadPDF);
  document.getElementById('whatif-reset').addEventListener('click', resetWhatIf);
});

// ── POPULATE FIELDS DROPDOWN ───────────────────────────────────────────────────
async function populateFields() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    if (data.fields && data.fields.length) {
      const sel = document.getElementById('field-select');
      sel.innerHTML = '';
      data.fields.forEach(f => {
        const opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        sel.appendChild(opt);
      });
      // Restore saved field selection
      if (savedFieldValue) { sel.value = savedFieldValue; savedFieldValue = null; }
    }
  } catch (_) {}
}

// ── POLL TRAINING STATUS ───────────────────────────────────────────────────────
async function pollStatus() {
  const banner = document.getElementById('training-banner');
  const bannerText = document.getElementById('banner-text');
  const spinner = document.getElementById('banner-spinner');
  const btn = document.getElementById('predict-btn');

  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    if (data.fields && data.fields.length) {
      const sel = document.getElementById('field-select');
      if (sel.options.length === 0) {
        data.fields.forEach(f => {
          const opt = document.createElement('option');
          opt.value = f; opt.textContent = f;
          sel.appendChild(opt);
        });
      }
    }

    if (data.trained) {
      isReady = true;
      banner.className = 'ready';
      spinner.style.display = 'none';
      bannerText.textContent = '✅  All 6 models trained and ready — fill in the form below!';
      btn.disabled = false;
      displayAccuracies(data.accuracies);
    } else if (data.error) {
      banner.className = 'error';
      spinner.style.display = 'none';
      bannerText.textContent = '❌  Training error: ' + data.error;
    } else {
      setTimeout(pollStatus, 2500);
    }
  } catch (_) {
    setTimeout(pollStatus, 3000);
  }
}

// ── SLIDERS ───────────────────────────────────────────────────────────────────
function initSliders() {
  document.querySelectorAll('input[type="range"]').forEach(range => {
    updateSlider(range);
    range.addEventListener('input', () => updateSlider(range));
  });
}

function updateSlider(range) {
  const min = +range.min || 0;
  const max = +range.max || 4;
  const val = +range.value;
  const pct = ((val - min) / (max - min)) * 100;

  // Retro neon fill — pink for skill sliders, cyan for activity sliders
  const fillColor = range.classList.contains('cyan-range') ? '#00F5FF' : '#FF2D78';
  range.style.background =
    `linear-gradient(to right, ${fillColor} 0%, ${fillColor} ${pct}%, rgba(255,255,255,0.07) ${pct}%, rgba(255,255,255,0.07) 100%)`;

  // Badge update
  const badge = range.closest('.skill-row')?.querySelector('.skill-value-badge');
  if (!badge) return;

  if (range.dataset.type === 'skill') {
    badge.textContent = SKILL_LABELS[val] || val;
    // Neon colour per level
    const col = SKILL_COLORS[val] || '#FF2D78';
    badge.style.borderColor = col;
    badge.style.color = col;
    badge.style.textShadow = `0 0 6px ${col}, 0 0 14px ${col}`;
  } else {
    badge.textContent = val;
  }
}

// ── TOGGLE SWITCHES ────────────────────────────────────────────────────────────
function initToggles() {
  document.querySelectorAll('.toggle input').forEach(cb => {
    // thumb element is a sibling
    cb.addEventListener('change', () => {});
  });
}

// ── RADIO BUTTONS (Internships) ────────────────────────────────────────────────
function initRadios() {
  document.querySelectorAll('.radio-group').forEach(group => {
    group.querySelectorAll('.radio-opt').forEach(opt => {
      opt.addEventListener('click', () => {
        group.querySelectorAll('.radio-opt').forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
        opt.querySelector('input').checked = true;
      });
    });
    // Mark first as selected by default
    const first = group.querySelector('.radio-opt');
    if (first) first.classList.add('selected');
  });
}

// ── COLLECT FORM DATA ──────────────────────────────────────────────────────────
function collectFormData() {
  const get = id => document.getElementById(id);
  const getVal = id => get(id)?.value ?? '';
  const getInt = id => parseInt(getVal(id)) || 0;
  const getFloat = id => parseFloat(getVal(id)) || 0;
  const getCheck = id => get(id)?.checked ? 1 : 0;

  const internshipsChecked = document.querySelector('.radio-group input:checked');
  const internships = internshipsChecked ? parseInt(internshipsChecked.value) : 0;

  return {
    child_name: getVal('child-name'),
    field: getVal('field-select'),
    gpa: getFloat('gpa'),
    extracurricular: getInt('extracurricular'),
    internships,
    projects: getInt('projects'),
    leadership: getCheck('leadership'),
    field_courses: getInt('field-courses'),
    research: getCheck('research'),
    coding: getInt('coding'),
    communication: getInt('communication'),
    problem_solving: getInt('problem-solving'),
    teamwork: getInt('teamwork'),
    analytical: getInt('analytical'),
    presentation: getInt('presentation'),
    networking: getInt('networking'),
    certifications: getCheck('certifications'),
  };
}

// ── SUBMIT ─────────────────────────────────────────────────────────────────────
async function handleSubmit(e) {
  e.preventDefault();
  if (currentMode === 'ml' && !isReady) return;

  const btn = document.getElementById('predict-btn');
  btn.disabled = true;
  btn.innerHTML = currentMode === 'ai'
    ? '<span class="spinner"></span> Asking AI...'
    : '<span class="spinner"></span> Predicting...';

  const payload = collectFormData();

  try {
    if (currentMode === 'ai') {
      await handleAiPredict(payload);
    } else {
      await handleMlPredict(payload);
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = currentMode === 'ai'
      ? '<span class="btn-icon">✨</span> LAUNCH AI ANALYSIS'
      : '<span class="btn-icon">🚀</span> LAUNCH CAREER PREDICTION';
  }
}

async function handleMlPredict(payload) {
  try {
    const res = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      lastMlPayload = Object.assign({}, payload);
      renderResults(data, payload.child_name);
      renderRadarChart(payload);
      renderSkillGap(data.skill_targets, payload, data.ensemble.top_3[0]);
      buildWhatIf(payload);
      document.getElementById('ai-results-block').style.display = 'none';
      document.getElementById('followup-section').style.display = 'none';
      document.getElementById('ml-results-block').style.display = '';
      showResults();
    } else {
      alert('Prediction failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}

async function handleAiPredict(payload) {
  const apiKey = (document.getElementById('api-key-input')?.value || '').trim();
  const body = Object.assign({}, payload);
  if (apiKey) body.api_key = apiKey;

  try {
    const res = await fetch('/api/ai-predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.success) {
      lastAiResult  = data;
      lastAiPayload = payload;
      renderAiTopPick(data, payload.child_name);
      renderAiResults(data);
      renderRadarChart(body);
      document.getElementById('skillgap-card').style.display = 'none';
      document.getElementById('ai-results-block').style.display = '';
      document.getElementById('ml-results-block').style.display = 'none';
      document.getElementById('followup-section').style.display = '';
      document.getElementById('followup-chat').innerHTML = '';
      showResults();
    } else {
      alert('AI prediction failed: ' + (data.error || 'Unknown error'));
    }
  } catch (err) {
    alert('Network error: ' + err.message);
  }
}

function showResults() {
  document.getElementById('results').classList.add('visible');
  setTimeout(() => {
    document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function renderAiTopPick(data, childName) {
  const top = data.top_3[0];

  const nameEl = document.getElementById('result-child-name');
  nameEl.textContent = childName ? `Career Path for ${childName}` : 'Career Path Prediction';

  document.getElementById('top-icon').textContent = top.icon;
  document.getElementById('top-title').textContent = top.career;
  document.getElementById('top-desc').textContent = top.reason || '';
  document.getElementById('top-conf').textContent = top.confidence + '%';

  const msgs = [
    `QUEST UNLOCKED! ${top.icon} The AI sees <strong>${top.career}</strong> in your future. Every legend starts at level 1 — keep grinding!`,
    `HIGH SCORE DETECTED! ${top.icon} AI analysis says <strong>${top.career}</strong>. The world is your open-world map — go explore it!`,
    `ACHIEVEMENT: FUTURE FOUND! ${top.icon} <strong>${top.career}</strong> awaits. Nurture these talents and watch the XP bar fill up!`,
  ];
  document.getElementById('motivation-msg').innerHTML = msgs[Math.floor(Math.random() * msgs.length)];
}

function renderAiResults(data) {
  // Analysis paragraphs
  const analysisEl = document.getElementById('ai-analysis-text');
  analysisEl.innerHTML = '';
  if (data.analysis) {
    data.analysis.split('\n\n').forEach(para => {
      if (!para.trim()) return;
      const p = document.createElement('p');
      p.textContent = para.trim();
      analysisEl.appendChild(p);
    });
  }

  // Strengths tags
  const strengthsEl = document.getElementById('ai-strengths');
  strengthsEl.innerHTML = '';
  (data.strengths || []).forEach(s => {
    const tag = document.createElement('span');
    tag.className = 'ai-strength-tag';
    tag.textContent = s;
    strengthsEl.appendChild(tag);
  });

  // Advice
  document.getElementById('ai-advice-text').textContent = data.advice || '';

  // Top 3 cards
  const top3El = document.getElementById('ai-top3');
  top3El.innerHTML = '';
  const rankClasses = ['r1', 'r2', 'r3'];
  (data.top_3 || []).forEach((c, i) => {
    const card = document.createElement('div');
    card.className = 'ai-career-card';
    card.innerHTML = `
      <div class="rank-badge ${rankClasses[i]}">${i + 1}</div>
      <div class="ai-career-icon">${c.icon}</div>
      <div class="ai-career-info">
        <div class="ai-career-name">${c.career}</div>
        <div class="ai-career-reason">${c.reason || ''}</div>
      </div>
      <div class="ai-career-conf">${c.confidence}%</div>
    `;
    top3El.appendChild(card);
  });
}

// ── RENDER RESULTS ─────────────────────────────────────────────────────────────
function renderTopPick(topCareer, childName) {
  const nameEl = document.getElementById('result-child-name');
  nameEl.textContent = childName ? `Career Path for ${childName}` : 'Career Path Prediction';

  document.getElementById('top-icon').textContent = topCareer.icon;
  document.getElementById('top-title').textContent = topCareer.career;
  document.getElementById('top-desc').textContent = topCareer.description || '';
  document.getElementById('top-conf').textContent = topCareer.confidence + '%';

  const msgs = [
    `QUEST UNLOCKED! ${topCareer.icon} Your skills point to <strong>${topCareer.career}</strong>. Every legend starts at level 1 — keep grinding!`,
    `HIGH SCORE DETECTED! ${topCareer.icon} The data says <strong>${topCareer.career}</strong>. The world is your open-world map — go explore it!`,
    `ACHIEVEMENT: FUTURE FOUND! ${topCareer.icon} <strong>${topCareer.career}</strong> awaits. Nurture these talents and watch the XP bar fill up!`,
  ];
  document.getElementById('motivation-msg').innerHTML = msgs[Math.floor(Math.random() * msgs.length)];
}

function renderCareerBars(top3) {
  const barsContainer = document.getElementById('career-bars');
  barsContainer.innerHTML = '';
  top3.forEach((c, i) => {
    const rankClass = ['r1', 'r2', 'r3'][i];
    const div = document.createElement('div');
    div.className = 'career-bar-item';
    div.innerHTML = `
      <div class="career-bar-header">
        <div class="career-rank ${rankClass}">${i + 1}</div>
        <span class="career-bar-icon">${c.icon}</span>
        <span class="career-bar-name">${c.career}</span>
        <span class="career-bar-pct">${c.confidence}%</span>
      </div>
      <div class="bar-track"><div class="bar-fill ${rankClass}" data-pct="${c.confidence}"></div></div>
    `;
    barsContainer.appendChild(div);
  });
  setTimeout(() => {
    document.querySelectorAll('#career-bars .bar-fill').forEach(b => {
      b.style.width = b.dataset.pct + '%';
    });
  }, 80);
}

function renderResults(data, childName) {
  const top3 = data.ensemble.top_3;

  renderTopPick(top3[0], childName);
  renderCareerBars(top3);

  // Per-model predictions
  const modelGrid = document.getElementById('model-grid');
  modelGrid.innerHTML = '';
  Object.entries(data.per_model).forEach(([name, pred]) => {
    const card = document.createElement('div');
    card.className = 'model-card';
    card.innerHTML = `
      <div class="model-name">${name}</div>
      <div class="model-prediction">${pred.icon} ${pred.mapped_career}</div>
      <div class="model-conf">${pred.confidence}%</div>
    `;
    modelGrid.appendChild(card);
  });

  // Accuracy chart
  displayAccuracies(data.model_accuracies);

  // All 31 categories
  const allCats = document.getElementById('all-categories');
  allCats.innerHTML = '';
  const topNames = top3.map(c => c.career);
  data.ensemble.all_categories.forEach(cat => {
    if (cat.confidence === 0) return;
    const chip = document.createElement('div');
    chip.className = 'cat-chip' + (topNames.includes(cat.career) ? ' highlighted' : '');
    chip.innerHTML = `
      <span class="cat-icon">${cat.icon}</span>
      <span class="cat-name">${cat.career}</span>
      <span class="cat-pct">${cat.confidence}%</span>
    `;
    allCats.appendChild(chip);
  });
}

// ── ACCURACY BARS ──────────────────────────────────────────────────────────────
function displayAccuracies(accuracies) {
  if (!accuracies || !Object.keys(accuracies).length) return;
  const container = document.getElementById('accuracy-chart');
  container.innerHTML = '';
  Object.entries(accuracies).forEach(([name, acc]) => {
    const row = document.createElement('div');
    row.className = 'acc-row';
    row.innerHTML = `
      <span class="acc-model-name">${name}</span>
      <div class="acc-bar-track"><div class="acc-bar-fill" data-acc="${acc}"></div></div>
      <span class="acc-value">${acc}%</span>
    `;
    container.appendChild(row);
  });
  setTimeout(() => {
    document.querySelectorAll('.acc-bar-fill').forEach(b => {
      b.style.width = b.dataset.acc + '%';
    });
  }, 80);
}

// ── RESET ──────────────────────────────────────────────────────────────────────
function resetForm() {
  document.getElementById('predict-form').reset();
  document.getElementById('results').classList.remove('visible');
  document.getElementById('ai-results-block').style.display = 'none';
  document.getElementById('ml-results-block').style.display = '';
  document.getElementById('radar-card').style.display = 'none';
  document.getElementById('skillgap-card').style.display = 'none';
  document.getElementById('followup-section').style.display = 'none';
  document.getElementById('followup-chat').innerHTML = '';
  lastAiResult = null; lastAiPayload = null; lastMlPayload = null;
  if (radarChart) { radarChart.destroy(); radarChart = null; }
  initSliders();
  initRadios();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── DARK MODE ─────────────────────────────────────────────────────────────────
function initDarkMode() {
  const saved = localStorage.getItem('caspa_theme');
  applyTheme(saved === 'dark' ? 'dark' : 'light');
  document.getElementById('dark-toggle').addEventListener('click', toggleDarkMode);
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'light');
  const btn = document.getElementById('dark-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀' : '🌙';
  updateRadarColors();
}

function toggleDarkMode() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  localStorage.setItem('caspa_theme', next);
  applyTheme(next);
}

// ── RADAR CHART ───────────────────────────────────────────────────────────────
function renderRadarChart(skills) {
  if (typeof Chart === 'undefined') return;
  const canvas = document.getElementById('radar-canvas');
  if (!canvas) return;
  if (radarChart) { radarChart.destroy(); radarChart = null; }

  const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? 'rgba(232,220,255,0.85)' : '#5B1F87';
  const gridColor = isDark ? 'rgba(191,95,255,0.22)'  : 'rgba(106,27,154,0.15)';
  const fillColor = isDark ? 'rgba(191,95,255,0.14)'  : 'rgba(106,27,154,0.1)';
  const lineColor = isDark ? '#BF5FFF' : '#6A1B9A';

  radarChart = new Chart(canvas, {
    type: 'radar',
    data: {
      labels: ['Coding', 'Communication', 'Problem\nSolving', 'Teamwork', 'Analytical', 'Presentation', 'Networking'],
      datasets: [{
        data: [
          skills.coding, skills.communication, skills.problem_solving,
          skills.teamwork, skills.analytical, skills.presentation, skills.networking
        ].map(v => Math.round((+v / 4) * 100)),
        backgroundColor: fillColor,
        borderColor: lineColor,
        borderWidth: 2,
        pointBackgroundColor: '#FF2D78',
        pointBorderColor: isDark ? '#150C34' : '#fff',
        pointBorderWidth: 2,
        pointRadius: 5,
        pointHoverRadius: 7,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        r: {
          min: 0, max: 100,
          ticks: { stepSize: 25, display: false, backdropColor: 'transparent' },
          grid:       { color: gridColor },
          angleLines: { color: gridColor },
          pointLabels: {
            font:  { family: "'Orbitron', sans-serif", size: 9, weight: '700' },
            color: textColor,
          }
        }
      },
      plugins: {
        legend:  { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw}%` } }
      },
      animation: { duration: 900, easing: 'easeInOutQuart' }
    }
  });

  document.getElementById('radar-card').style.display = '';
}

function updateRadarColors() {
  if (!radarChart) return;
  const isDark    = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? 'rgba(232,220,255,0.85)' : '#5B1F87';
  const gridColor = isDark ? 'rgba(191,95,255,0.22)'  : 'rgba(106,27,154,0.15)';
  radarChart.options.scales.r.pointLabels.color   = textColor;
  radarChart.options.scales.r.grid.color          = gridColor;
  radarChart.options.scales.r.angleLines.color    = gridColor;
  radarChart.data.datasets[0].borderColor         = isDark ? '#BF5FFF' : '#6A1B9A';
  radarChart.data.datasets[0].backgroundColor     = isDark ? 'rgba(191,95,255,0.14)' : 'rgba(106,27,154,0.1)';
  radarChart.data.datasets[0].pointBorderColor    = isDark ? '#150C34' : '#fff';
  radarChart.update();
}

// ── LOCAL STORAGE ─────────────────────────────────────────────────────────────
const PROFILE_KEY = 'caspa_profile';

function initLocalStorage() {
  loadProfile();
  const form = document.getElementById('predict-form');
  const debouncedSave = debounce(saveProfile, 700);
  form.addEventListener('change', debouncedSave);
  form.addEventListener('input',  debouncedSave);
}

function debounce(fn, delay) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), delay); };
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(collectFormData()));
    showSavedBadge('✓ PROFILE AUTO-SAVED');
  } catch (_) {}
}

function loadProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);

    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = v; };
    const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = !!+v; };

    setVal('child-name',      d.child_name);
    setVal('gpa',             d.gpa);
    setVal('extracurricular', d.extracurricular);
    setVal('projects',        d.projects);
    setVal('field-courses',   d.field_courses);
    setVal('coding',          d.coding);
    setVal('communication',   d.communication);
    setVal('problem-solving', d.problem_solving);
    setVal('teamwork',        d.teamwork);
    setVal('analytical',      d.analytical);
    setVal('presentation',    d.presentation);
    setVal('networking',      d.networking);
    setChk('leadership',      d.leadership);
    setChk('research',        d.research);
    setChk('certifications',  d.certifications);

    // Internships radio
    if (d.internships !== undefined) {
      document.querySelectorAll('.radio-group .radio-opt').forEach(opt => {
        const inp = opt.querySelector('input');
        const match = inp && parseInt(inp.value) === parseInt(d.internships);
        opt.classList.toggle('selected', match);
        if (inp) inp.checked = match;
      });
    }

    savedFieldValue = d.field || null; // restored after dropdown populates
    initSliders();
    showSavedBadge('✓ PROFILE LOADED');
  } catch (_) {}
}

function showSavedBadge(text) {
  const badge = document.getElementById('profile-saved-badge');
  if (!badge) return;
  badge.textContent = text;
  badge.classList.add('show');
  clearTimeout(badge._timer);
  badge._timer = setTimeout(() => badge.classList.remove('show'), 2200);
}

// ── AI FOLLOW-UP Q&A ──────────────────────────────────────────────────────────
function initFollowUp() {
  document.getElementById('followup-btn').addEventListener('click', handleFollowUp);
  document.getElementById('followup-input').addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) handleFollowUp();
  });
}

async function handleFollowUp() {
  const input    = document.getElementById('followup-input');
  const question = input.value.trim();
  if (!question || !lastAiResult) return;

  const btn = document.getElementById('followup-btn');
  btn.disabled    = true;
  btn.textContent = '...';
  input.value     = '';

  addFollowUpMessage('user', question);

  const apiKey = (document.getElementById('api-key-input')?.value || '').trim();
  const body   = Object.assign({}, lastAiPayload, {
    question,
    previous_analysis: lastAiResult.analysis || '',
    top_career:        lastAiResult.top_3?.[0]?.career || '',
  });
  if (apiKey) body.api_key = apiKey;

  try {
    const res  = await fetch('/api/ai-followup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    addFollowUpMessage('ai', data.success ? data.answer : ('⚠ ' + (data.error || 'Error')));
  } catch (err) {
    addFollowUpMessage('ai', '⚠ Network error: ' + err.message);
  } finally {
    btn.disabled    = false;
    btn.textContent = '▶ SEND';
    input.focus();
  }
}

function addFollowUpMessage(role, text) {
  const chat = document.getElementById('followup-chat');
  const msg  = document.createElement('div');
  msg.className   = `followup-msg followup-msg-${role}`;
  msg.textContent = text;
  chat.appendChild(msg);
  requestAnimationFrame(() => { chat.scrollTop = chat.scrollHeight; });
}

// ── SKILL GAP ANALYSIS ────────────────────────────────────────────────────────
function renderSkillGap(targets, payload, topCareer) {
  const card = document.getElementById('skillgap-card');
  if (!targets || !Object.keys(targets).length) { card.style.display = 'none'; return; }

  document.getElementById('skillgap-target').textContent =
    `vs. typical ${topCareer.career} profile`;

  // Build rows: gaps first (largest gap), then met skills
  const rows = Object.keys(SKILL_META).map(key => {
    const current = Math.round(+payload[key] || 0);
    const target  = Math.round(+targets[key] || 0);
    return { key, current, target, gap: target - current };
  });
  rows.sort((a, b) => b.gap - a.gap);

  const gaps = rows.filter(r => r.gap > 0);
  const intro = document.getElementById('skillgap-intro');
  if (gaps.length === 0) {
    intro.innerHTML = `🌟 Amazing! Across the board, this profile already meets or exceeds the typical skill levels for <strong>${topCareer.career}</strong>. Keep nurturing these strengths!`;
  } else {
    intro.innerHTML = `To grow toward <strong>${topCareer.career}</strong>, here are the skills with the most room to develop — with simple ideas to help.`;
  }

  const list = document.getElementById('skillgap-list');
  list.innerHTML = '';
  rows.forEach((r, i) => {
    const meta = SKILL_META[r.key];
    const met  = r.gap <= 0;
    const item = document.createElement('div');
    item.className = 'skillgap-item' + (met ? ' met' : '');
    item.style.animationDelay = (i * 0.05) + 's';
    item.innerHTML = `
      <span class="skillgap-icon">${met ? '✅' : '⬆️'}</span>
      <div class="skillgap-info">
        <div class="skillgap-name">${meta.name}</div>
        <div class="skillgap-advice">${met ? 'Already at or above the typical level — great work!' : meta.advice}</div>
      </div>
      ${met
        ? `<span class="skillgap-badge-met">ON TARGET</span>`
        : `<div class="skillgap-levels"><span class="cur">${r.current}</span><span class="arrow">→</span><span class="tgt">${r.target}</span><br><span style="font-size:0.6rem;color:var(--text-dim)">NOW / TARGET</span></div>`
      }
    `;
    list.appendChild(item);
  });

  card.style.display = '';
}

// ── WHAT-IF SIMULATOR ─────────────────────────────────────────────────────────
function buildWhatIf(payload) {
  const grid = document.getElementById('whatif-grid');
  grid.innerHTML = '';
  const labels = ['NONE', 'BASIC', 'MID', 'ADV', 'EXPERT'];

  Object.keys(SKILL_META).forEach(key => {
    const val = Math.round(+payload[key] || 0);
    const row = document.createElement('div');
    row.className = 'whatif-row';
    row.innerHTML = `
      <div class="whatif-row-head">
        <span class="whatif-row-name">${SKILL_META[key].name}</span>
        <span class="whatif-row-val" id="wi-val-${key}">${labels[val]}</span>
      </div>
      <input type="range" min="0" max="4" value="${val}" data-skill="${key}" id="wi-${key}"/>
    `;
    grid.appendChild(row);
  });

  grid.querySelectorAll('input[type="range"]').forEach(range => {
    updateSlider(range);
    range.addEventListener('input', () => {
      const key = range.dataset.skill;
      const v   = +range.value;
      const valEl = document.getElementById(`wi-val-${key}`);
      valEl.textContent = labels[v];
      const baseline = Math.round(+lastMlPayload[key] || 0);
      valEl.classList.toggle('changed', v !== baseline);
      updateSlider(range);
      scheduleWhatIf();
    });
  });
}

function scheduleWhatIf() {
  document.getElementById('whatif-hint').classList.add('active');
  document.getElementById('whatif-hint').textContent = 'Updating…';
  clearTimeout(whatIfTimer);
  whatIfTimer = setTimeout(runWhatIf, 380);
}

async function runWhatIf() {
  if (!lastMlPayload) return;
  const payload = Object.assign({}, lastMlPayload);
  document.querySelectorAll('#whatif-grid input[type="range"]').forEach(r => {
    payload[r.dataset.skill] = +r.value;
  });

  try {
    const res  = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (data.success) {
      const top3 = data.ensemble.top_3;
      renderTopPick(top3[0], payload.child_name);
      renderCareerBars(top3);
      renderRadarChart(payload);
      const hint = document.getElementById('whatif-hint');
      hint.textContent = '✓ Ranking updated live';
      setTimeout(() => {
        hint.classList.remove('active');
        hint.textContent = 'Drag a skill to see the ranking shift live';
      }, 1400);
    }
  } catch (_) {
    document.getElementById('whatif-hint').textContent = '⚠ Update failed';
  }
}

function resetWhatIf() {
  if (!lastMlPayload) return;
  const labels = ['NONE', 'BASIC', 'MID', 'ADV', 'EXPERT'];
  document.querySelectorAll('#whatif-grid input[type="range"]').forEach(range => {
    const key = range.dataset.skill;
    const v   = Math.round(+lastMlPayload[key] || 0);
    range.value = v;
    const valEl = document.getElementById(`wi-val-${key}`);
    valEl.textContent = labels[v];
    valEl.classList.remove('changed');
    updateSlider(range);
  });
  runWhatIf();
}

// ── PDF REPORT EXPORT ─────────────────────────────────────────────────────────
async function downloadPDF() {
  if (typeof html2canvas === 'undefined' || !window.jspdf) {
    alert('PDF libraries are still loading — please try again in a moment.');
    return;
  }
  const btn     = document.getElementById('download-btn');
  const results = document.getElementById('results');
  const orig    = btn.textContent;
  btn.disabled    = true;
  btn.textContent = '⏳ GENERATING…';
  results.classList.add('pdf-capturing');

  try {
    const bg = getComputedStyle(document.body).backgroundColor || '#ffffff';
    const canvas = await html2canvas(results, { scale: 2, useCORS: true, backgroundColor: bg });
    const imgData = canvas.toDataURL('image/png');

    const { jsPDF } = window.jspdf;
    const pdf   = new jsPDF('p', 'mm', 'a4');
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW  = pageW;
    const imgH  = canvas.height * imgW / canvas.width;

    let heightLeft = imgH;
    let position   = 0;
    pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, imgW, imgH);
      heightLeft -= pageH;
    }

    const rawName = (document.getElementById('child-name').value || 'child').trim();
    const safe    = rawName.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '') || 'child';
    pdf.save(`CASPA_Report_${safe}.pdf`);
  } catch (e) {
    alert('PDF generation failed: ' + e.message);
  } finally {
    results.classList.remove('pdf-capturing');
    btn.disabled    = false;
    btn.textContent = orig;
  }
}
