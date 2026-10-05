/**
 * Flood Monitoring System - Web Application JavaScript
 * Developed by Team Pirates
 * Timezone: Asia/Kolkata (+5:30)
 */

// Global State
let currentUser = null;
let currentTab = 'tab1';
let currentPage = 1;
let currentSearch = '';
let isAudioMuted = false;
let audioCtx = null;
let isBuzzerActive = false;
let buzzerInterval = null;
let waterLevelChart = null;
let correlationChart = null;
let floodMap = null;
let mapMarkers = [];

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuthSession();
  initLucide();
  initClock();
  setupPolling();
  requestGeolocation();
});

function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// ==========================================
// THEME SWITCHER (Light / Dark Mode)
// ==========================================
function initTheme() {
  const savedTheme = localStorage.getItem('fms_theme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.toggle('dark');
  localStorage.setItem('fms_theme', isDark ? 'dark' : 'light');
  if (waterLevelChart) updateChartThemes();
  if (correlationChart) updateChartThemes();
}

function updateChartThemes() {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  [waterLevelChart, correlationChart].forEach(chart => {
    if (chart && chart.options) {
      if (chart.options.scales.x) {
        chart.options.scales.x.ticks.color = textColor;
        chart.options.scales.x.grid.color = gridColor;
      }
      if (chart.options.scales.y) {
        chart.options.scales.y.ticks.color = textColor;
        chart.options.scales.y.grid.color = gridColor;
      }
      chart.update();
    }
  });
}

// ==========================================
// ASIA/KOLKATA LIVE CLOCK
// ==========================================
function initClock() {
  function updateTime() {
    try {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }).format(now);
      const el = document.getElementById('currentTimeDisplay');
      if (el) el.innerText = `${timeStr} (IST)`;
    } catch (e) {
      // ignore
    }
  }
  updateTime();
  setInterval(updateTime, 1000);
}

// ==========================================
// AUTHENTICATION & SESSION MANAGEMENT
// ==========================================
function checkAuthSession() {
  const saved = localStorage.getItem('fms_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      showDashboard();
    } catch (e) {
      showAuthPage();
    }
  } else {
    showAuthPage();
  }
}

function switchAuthMode(mode) {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const tabBtnLogin = document.getElementById('tabBtnLogin');
  const tabBtnRegister = document.getElementById('tabBtnRegister');
  const authAlert = document.getElementById('authAlert');
  if (authAlert) authAlert.classList.add('hidden');

  if (mode === 'login') {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    tabBtnLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition bg-white dark:bg-slate-700 shadow text-sky-600 dark:text-sky-300';
    tabBtnRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-500 dark:text-slate-400 hover:text-sky-500';
  } else {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    tabBtnRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition bg-white dark:bg-slate-700 shadow text-sky-600 dark:text-sky-300';
    tabBtnLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg transition text-slate-500 dark:text-slate-400 hover:text-sky-500';
  }
}

function showAuthAlert(message, isError = true) {
  const alertEl = document.getElementById('authAlert');
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = isError
    ? 'mb-4 p-3 rounded-xl text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
    : 'mb-4 p-3 rounded-xl text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
  alertEl.classList.remove('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (data.success) {
      currentUser = data.user;
      localStorage.setItem('fms_user', JSON.stringify(currentUser));
      showDashboard();
    } else {
      showAuthAlert(data.message || 'Login failed. Invalid credentials.');
    }
  } catch (err) {
    showAuthAlert('Unable to reach server. Please check connection.');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;

  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (data.success) {
      showAuthAlert('Registration successful! Please sign in.', false);
      switchAuthMode('login');
      document.getElementById('loginEmail').value = email;
      document.getElementById('loginPassword').value = '';
    } else {
      showAuthAlert(data.message || 'Registration failed.');
    }
  } catch (err) {
    showAuthAlert('Server error during registration.');
  }
}

function quickFillDemoLogin() {
  document.getElementById('loginEmail').value = 'dharini@floodmonitor.org';
  document.getElementById('loginPassword').value = 'password123';
  document.getElementById('loginForm').dispatchEvent(new Event('submit'));
}

function handleLogout() {
  localStorage.removeItem('fms_user');
  currentUser = null;
  stopBuzzer();
  showAuthPage();
}

function showAuthPage() {
  document.getElementById('authPage').classList.remove('hidden');
  document.getElementById('dashboardPage').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('authPage').classList.add('hidden');
  document.getElementById('dashboardPage').classList.remove('hidden');

  // Update header greeting to "Welcome Dharini" (or logged in user name)
  const userName = currentUser ? currentUser.name : 'Dharini';
  const greetingEl = document.getElementById('userGreeting');
  if (greetingEl) {
    greetingEl.innerHTML = `<span>Welcome ${userName}</span><span class="inline-block w-1.5 h-1.5 rounded-full bg-sky-500"></span><span class="text-slate-400 font-normal">Asia/Kolkata (+5:30)</span>`;
  }

  initCharts();
  loadRecords(1);
  fetchDeviceStatus();
  initLucide();
}

// ==========================================
// TAB NAVIGATION
// ==========================================
function switchTab(tabId) {
  currentTab = tabId;

  const tabs = ['tab1', 'tab2', 'tab3'];
  tabs.forEach(t => {
    const content = document.getElementById(t + 'Content');
    const navBtn = document.getElementById('tabNav' + t.slice(3));

    if (t === tabId) {
      if (content) content.classList.remove('hidden');
      if (navBtn) {
        navBtn.className = 'tab-nav-btn py-2 px-3 border-b-2 font-bold text-xs sm:text-sm border-sky-500 text-sky-600 dark:text-sky-400 flex items-center gap-2 whitespace-nowrap';
      }
    } else {
      if (content) content.classList.add('hidden');
      if (navBtn) {
        navBtn.className = 'tab-nav-btn py-2 px-3 border-b-2 font-semibold text-xs sm:text-sm border-transparent text-slate-500 hover:text-sky-500 dark:text-slate-400 flex items-center gap-2 whitespace-nowrap';
      }
    }
  });

  if (tabId === 'tab3') {
    setTimeout(initOrRefreshMap, 200);
  }

  initLucide();
}

// ==========================================
// GEOLOCATION PERMISSION & SENSING
// ==========================================
function requestGeolocation() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(4);
        const lon = position.coords.longitude.toFixed(4);
        const coordsEl = document.getElementById('currentCoordinates');
        if (coordsEl) coordsEl.innerText = `(${lat}° N, ${lon}° E)`;

        const notice = document.getElementById('locationNotice');
        if (notice) notice.classList.remove('hidden');
      },
      (error) => {
        console.log('Location permission denied or unavailable, defaulting to station coordinates (Nagpur).');
      },
      { timeout: 8000 }
    );
  }
}

// ==========================================
// TELEMETRY & ESP8266 POLLING
// ==========================================
function setupPolling() {
  setInterval(() => {
    if (currentUser && !document.getElementById('dashboardPage').classList.contains('hidden')) {
      fetchDeviceStatus();
    }
  }, 3000);
}

async function fetchDeviceStatus() {
  try {
    const res = await fetch('/api/device/status');
    const data = await res.json();
    if (data.success) {
      renderDeviceState(data.deviceState);
    }
  } catch (err) {
    console.error('Error fetching device status:', err);
  }
}

function renderDeviceState(state) {
  // Update ESP8266 Online/Offline badge
  const badge = document.getElementById('deviceStatusBadge');
  const text = document.getElementById('deviceStatusText');
  const ring = document.getElementById('devicePulseRing');
  const dot = document.getElementById('devicePulseDot');
  const lastSeenText = document.getElementById('lastSeenText');

  if (state.online) {
    badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold transition';
    text.innerText = 'ESP8266 ONLINE';
    ring.className = 'animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75';
    dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500';
    if (lastSeenText) lastSeenText.innerText = 'Signal Active';
  } else {
    badge.className = 'flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-bold transition';
    text.innerText = 'ESP8266 OFFLINE';
    ring.className = 'hidden';
    dot.className = 'relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500';
    if (lastSeenText) lastSeenText.innerText = 'Awaiting Heartbeat';
  }

  // Update Water Level Large Font Card
  const waterLevel = state.waterLevel !== undefined ? state.waterLevel : 5;
  document.getElementById('displayWaterLevel').innerText = waterLevel;

  // Water Seek Bar (0 to 40 cm range)
  const barPercent = Math.min(100, Math.max(5, (waterLevel / 40) * 100));
  const waterBar = document.getElementById('waterLevelBar');
  if (waterBar) waterBar.style.width = `${barPercent}%`;

  // Status Pill & Danger Alerts
  const status = state.status || 'Safe';
  const statusPill = document.getElementById('waterStatusPill');
  const dangerSign = document.getElementById('dangerIndicatorSign');
  const dangerBanner = document.getElementById('dangerBanner');

  if (status === 'Danger') {
    statusPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-red-500/20 text-red-600 dark:text-red-400 animate-pulse';
    statusPill.innerText = 'CRITICAL DANGER';
    dangerSign.classList.remove('hidden');
    dangerBanner.classList.remove('hidden');
    document.getElementById('dangerBannerText').innerText = `Danger spotted: Water level has reached ${waterLevel} cm in ${state.district || 'Nagpur'}! Buzzer active.`;

    startBuzzer();
  } else if (status === 'Warning') {
    statusPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/20 text-amber-600 dark:text-amber-400';
    statusPill.innerText = 'WARNING';
    dangerSign.classList.add('hidden');
    dangerBanner.classList.add('hidden');
    stopBuzzer();
  } else {
    statusPill.className = 'px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    statusPill.innerText = 'SAFE';
    dangerSign.classList.add('hidden');
    dangerBanner.classList.add('hidden');
    stopBuzzer();
  }

  // Rainfall Detection Card
  const rainfall = state.rainfall || 'Yes';
  document.getElementById('displayRainfall').innerText = rainfall;
  const rainBadge = document.getElementById('rainBadge');
  const rainDesc = document.getElementById('rainDescription');

  if (rainfall === 'Yes') {
    rainBadge.innerText = 'Precipitation Active';
    rainBadge.className = 'px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300';
    rainDesc.innerText = 'Continuous precipitation detected by MH-RD module at Pin D7.';
  } else {
    rainBadge.innerText = 'Dry / Clear';
    rainBadge.className = 'px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300';
    rainDesc.innerText = 'No rainfall detected at sensor probe. Embankment dry.';
  }

  // LED & Hardware State
  const ledState = state.led || 'OFF';
  document.getElementById('displayLedState').innerText = ledState;

  // Virtual 16x2 LCD display mirror
  const line1 = state.line1 || 'Flood Monitoring';
  const line2 = state.line2 || 'System';
  document.getElementById('lcdRow1').innerText = line1.padEnd(16, ' ').slice(0, 16);
  document.getElementById('lcdRow2').innerText = `${line2} ${waterLevel}cm`.padEnd(16, ' ').slice(0, 16);
}

// ==========================================
// WEB AUDIO BUZZER SOUND SYNTHESIS
// ==========================================
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playBeep(freq = 2800, durationMs = 180) {
  if (isAudioMuted) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'square'; // Buzzer square wave sound
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + durationMs / 1000);
  } catch (e) {
    console.error('Audio play error:', e);
  }
}

function triggerWebBuzzerBeep(beeps = 3) {
  let count = 0;
  const interval = setInterval(() => {
    playBeep(2800, 150);
    count++;
    if (count >= beeps) clearInterval(interval);
  }, 250);
}

function startBuzzer() {
  if (isBuzzerActive || isAudioMuted) return;
  isBuzzerActive = true;
  buzzerInterval = setInterval(() => {
    if (!isAudioMuted) {
      playBeep(2900, 180);
    }
  }, 800);
}

function stopBuzzer() {
  isBuzzerActive = false;
  if (buzzerInterval) {
    clearInterval(buzzerInterval);
    buzzerInterval = null;
  }
}

function toggleAudioMute() {
  isAudioMuted = !isAudioMuted;
  const headerIcon = document.getElementById('headerBuzzerIcon');
  const buzzerIcon = document.getElementById('buzzerIcon');
  const buzzerText = document.getElementById('buzzerText');

  if (isAudioMuted) {
    stopBuzzer();
    if (headerIcon) headerIcon.setAttribute('data-lucide', 'volume-x');
    if (buzzerIcon) buzzerIcon.setAttribute('data-lucide', 'volume-x');
    if (buzzerText) buzzerText.innerText = 'Buzzer Muted';
  } else {
    if (headerIcon) headerIcon.setAttribute('data-lucide', 'volume-2');
    if (buzzerIcon) buzzerIcon.setAttribute('data-lucide', 'volume-2');
    if (buzzerText) buzzerText.innerText = 'Buzzer Active';
  }
  initLucide();
}

function dismissDangerAlert() {
  document.getElementById('dangerBanner').classList.add('hidden');
  stopBuzzer();
}

// ==========================================
// SAVED RECORDS & PAGINATION (Section 2)
// Table Columns:
// # | Water Level | RainFall(Yes or No) | District | Time | Date | Action (Delete)
// ==========================================
async function loadRecords(page = 1, search = currentSearch) {
  currentPage = page;
  try {
    const url = `/api/records?page=${page}&limit=7&search=${encodeURIComponent(search)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (data.success) {
      renderRecordsTable(data.records, data.pagination);
      refreshAnalyticsGraphs();
    }
  } catch (err) {
    console.error('Failed to load records:', err);
  }
}

function renderRecordsTable(records, pagination) {
  const tbody = document.getElementById('recordsTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!records || records.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400">
          <div class="flex flex-col items-center justify-center gap-2">
            <i data-lucide="inbox" class="w-8 h-8 text-slate-300"></i>
            <span>No telemetry records found.</span>
          </div>
        </td>
      </tr>
    `;
    initLucide();
    return;
  }

  const startIndex = (pagination.page - 1) * pagination.limit;

  records.forEach((rec, idx) => {
    const rowNum = startIndex + idx + 1;
    const isDanger = rec.status === 'Danger';
    const isWarning = rec.status === 'Warning';

    let statusPillClass = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300';
    if (isDanger) statusPillClass = 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-extrabold';
    else if (isWarning) statusPillClass = 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300';

    const tr = document.createElement('tr');
    tr.className = 'hover:bg-sky-50/50 dark:hover:bg-slate-800/50 transition-colors';

    tr.innerHTML = `
      <td class="py-3 px-4 font-bold text-slate-500">${rowNum}</td>
      <td class="py-3 px-4 font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
        <span>${rec.waterLevel}</span>
        <span class="px-2 py-0.5 rounded text-[10px] ${statusPillClass}">${rec.status || 'Safe'}</span>
      </td>
      <td class="py-3 px-4 font-medium">
        <span class="inline-flex items-center gap-1.5 ${rec.rainfall === 'Yes' ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-400'}">
          <i data-lucide="${rec.rainfall === 'Yes' ? 'cloud-rain' : 'sun'}" class="w-4 h-4"></i>
          ${rec.rainfall}
        </span>
      </td>
      <td class="py-3 px-4 font-semibold text-slate-700 dark:text-slate-300">${rec.district}</td>
      <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">${rec.time}</td>
      <td class="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">${rec.date}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="deleteRecord('${rec.id}')" title="Delete Record"
          class="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg border border-red-200 dark:border-red-800 transition flex items-center gap-1 mx-auto">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
          <span>Delete</span>
        </button>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Update pagination controls
  const total = pagination.total;
  const startItem = total > 0 ? startIndex + 1 : 0;
  const endItem = Math.min(startIndex + pagination.limit, total);

  document.getElementById('paginationInfo').innerText = `Showing ${startItem} to ${endItem} of ${total} records`;

  document.getElementById('btnPrevPage').disabled = !pagination.hasPrev;
  document.getElementById('btnNextPage').disabled = !pagination.hasNext;

  renderPageButtons(pagination);
  initLucide();
}

function renderPageButtons(pagination) {
  const container = document.getElementById('pageNumbersContainer');
  container.innerHTML = '';

  const totalPages = pagination.totalPages;
  const cur = pagination.page;

  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= cur - 1 && i <= cur + 1)) {
      const btn = document.createElement('button');
      btn.innerText = i;
      btn.className = i === cur
        ? 'w-7 h-7 rounded-lg bg-sky-500 text-white font-bold text-xs shadow'
        : 'w-7 h-7 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold';
      btn.onclick = () => loadRecords(i);
      container.appendChild(btn);
    }
  }
}

function changePage(delta) {
  loadRecords(currentPage + delta);
}

async function deleteRecord(id) {
  if (!confirm('Are you sure you want to delete this telemetry record?')) return;
  try {
    const res = await fetch(`/api/records/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      loadRecords(currentPage);
    }
  } catch (err) {
    alert('Failed to delete record.');
  }
}

// ==========================================
// CITY SEARCH & COORDINATES MATCHING (Section 2)
// "Give a search bar here to search the city and if the city coordinated matches the coordinates of the hardware then show"
// ==========================================
let searchDebounce = null;
function handleCitySearch(e) {
  const q = e.target.value;
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    currentSearch = q;
    loadRecords(1, q);

    if (!q.trim()) {
      document.getElementById('matchedCityResult').classList.add('hidden');
      return;
    }

    try {
      const res = await fetch(`/api/search-city?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      const matchBox = document.getElementById('matchedCityResult');
      const details = document.getElementById('matchedCityDetails');

      if (data.matchesHardware && data.matchedHardwareStation) {
        matchBox.classList.remove('hidden');
        const st = data.matchedHardwareStation;
        details.innerHTML = `
          Searched city <strong>${st.city}</strong> coordinates (${st.lat}° N, ${st.lon}° E) match NodeMCU hardware location!<br>
          River Basin: <strong>${st.river}</strong> | Current Water Level: <strong>${st.currentWaterLevel} cm</strong> | Rain: <strong>${st.rainfall}</strong> | Status: <strong>${st.status}</strong>
        `;
        initLucide();
      } else {
        matchBox.classList.add('hidden');
      }
    } catch (e) {
      console.error('Search error:', e);
    }
  }, 300);
}

function clearCitySearch() {
  document.getElementById('citySearchInput').value = '';
  document.getElementById('matchedCityResult').classList.add('hidden');
  currentSearch = '';
  loadRecords(1, '');
}

// ==========================================
// CHARTS (Chart.js)
// 1. Water Level Telemetry Graph (Section 1)
// 2. Correlation Trend Graph (Section 2)
// ==========================================
function initCharts() {
  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // Chart 1: Real-time Water Level Trend
  const ctx1 = document.getElementById('waterLevelChart');
  if (ctx1) {
    if (waterLevelChart) waterLevelChart.destroy();
    waterLevelChart = new Chart(ctx1, {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Water Level (cm)',
            data: [],
            borderColor: '#0284c7',
            backgroundColor: 'rgba(14, 165, 233, 0.15)',
            borderWidth: 3,
            pointBackgroundColor: '#0284c7',
            pointRadius: 4,
            fill: true,
            tension: 0.35
          },
          {
            label: 'Warning Threshold (15cm)',
            data: [],
            borderColor: '#f59e0b',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          },
          {
            label: 'Danger Threshold (25cm)',
            data: [],
            borderColor: '#ef4444',
            borderWidth: 2,
            borderDash: [5, 5],
            pointRadius: 0,
            fill: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: {
            beginAtZero: true,
            max: 40,
            title: { display: true, text: 'Water Level in cm', color: textColor },
            ticks: { color: textColor },
            grid: { color: gridColor }
          }
        },
        plugins: {
          legend: { labels: { color: textColor } }
        }
      }
    });
  }

  // Chart 2: Rainfall vs Water Level Correlation Trend (Section 2)
  const ctx2 = document.getElementById('correlationChart');
  if (ctx2) {
    if (correlationChart) correlationChart.destroy();
    correlationChart = new Chart(ctx2, {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          {
            type: 'bar',
            label: 'Water Level (cm)',
            data: [],
            backgroundColor: 'rgba(14, 165, 233, 0.7)',
            borderColor: '#0284c7',
            borderWidth: 1,
            borderRadius: 6
          },
          {
            type: 'line',
            label: 'Rainfall Event (1=Rain, 0=Dry)',
            data: [],
            borderColor: '#818cf8',
            backgroundColor: '#818cf8',
            borderWidth: 2,
            pointRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { ticks: { color: textColor }, grid: { color: gridColor } },
          y: {
            beginAtZero: true,
            title: { display: true, text: 'Water Depth (cm)', color: textColor },
            ticks: { color: textColor },
            grid: { color: gridColor }
          },
          y1: {
            position: 'right',
            min: 0,
            max: 2,
            ticks: {
              stepSize: 1,
              color: textColor,
              callback: (val) => (val === 1 ? 'Rain' : val === 0 ? 'Dry' : '')
            },
            grid: { drawOnChartArea: false }
          }
        },
        plugins: {
          legend: { labels: { color: textColor } }
        }
      }
    });
  }

  refreshAnalyticsGraphs();
}

async function refreshAnalyticsGraphs() {
  try {
    const res = await fetch('/api/analytics');
    const data = await res.json();
    if (!data.success) return;

    if (waterLevelChart) {
      waterLevelChart.data.labels = data.labels;
      waterLevelChart.data.datasets[0].data = data.waterLevels;
      waterLevelChart.data.datasets[1].data = data.labels.map(() => 15);
      waterLevelChart.data.datasets[2].data = data.labels.map(() => 25);
      waterLevelChart.update();
    }

    if (correlationChart) {
      correlationChart.data.labels = data.labels;
      correlationChart.data.datasets[0].data = data.waterLevels;
      correlationChart.data.datasets[1].data = data.rainfalls;
      correlationChart.update();
    }
  } catch (e) {
    console.error('Analytics load error:', e);
  }
}

// ==========================================
// TAB 2: ACTUATORS & MANUAL SIMULATION
// ==========================================
async function handleSaveLcd(e) {
  e.preventDefault();
  const line1 = document.getElementById('inputLcdLine1').value.trim();
  const line2 = document.getElementById('inputLcdLine2').value.trim();

  try {
    const res = await fetch('/api/device/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line1, line2 })
    });
    const data = await res.json();
    if (data.success) {
      alert('Custom LCD display lines transmitted to ESP8266 server state!');
      fetchDeviceStatus();
    }
  } catch (e) {
    alert('Failed to transmit LCD text.');
  }
}

async function setLedState(state) {
  try {
    const res = await fetch('/api/device/control', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ led: state })
    });
    const data = await res.json();
    if (data.success) {
      fetchDeviceStatus();
    }
  } catch (e) {
    alert('Failed to update LED.');
  }
}

function updateSimSliderVal(val) {
  document.getElementById('sliderValDisplay').innerText = `${val} cm`;
}

async function injectSimulatedTelemetry() {
  const waterLevel = parseFloat(document.getElementById('simWaterSlider').value);
  const rainfall = document.getElementById('simRainSelect').value;

  try {
    const res = await fetch('/api/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ waterLevel, rainfall, district: 'Nagpur' })
    });
    const data = await res.json();
    if (data.success) {
      renderDeviceState(data.deviceState);
      loadRecords(1);
      refreshAnalyticsGraphs();
      if (data.deviceState.status === 'Danger') {
        triggerWebBuzzerBeep(4);
      }
    }
  } catch (e) {
    alert('Simulation injection failed.');
  }
}

// ==========================================
// TAB 3: LEAFLET FLOOD MAP
// ==========================================
async function initOrRefreshMap() {
  if (!floodMap) {
    const mapEl = document.getElementById('floodMap');
    if (!mapEl) return;

    // Centered around Nagpur / Vidarbha river basins
    floodMap = L.map('floodMap').setView([21.1458, 79.0882], 8);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Team Pirates'
    }).addTo(floodMap);
  } else {
    floodMap.invalidateSize();
  }

  fetchAndRenderMapStations();
}

async function fetchAndRenderMapStations() {
  try {
    const res = await fetch('/api/stations');
    const data = await res.json();
    if (!data.success) return;

    // Clear existing markers
    mapMarkers.forEach(m => floodMap.removeLayer(m));
    mapMarkers = [];

    const stations = data.stations || [];
    const container = document.getElementById('mapStationCardsGrid');
    if (container) container.innerHTML = '';

    stations.forEach(station => {
      const isDanger = station.status === 'Danger';
      const isWarning = station.status === 'Warning';
      const markerColor = isDanger ? '#ef4444' : isWarning ? '#f59e0b' : '#10b981';

      // Custom Circle Marker
      const circle = L.circleMarker([station.lat, station.lon], {
        radius: isDanger ? 14 : 10,
        fillColor: markerColor,
        color: '#ffffff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      }).addTo(floodMap);

      circle.bindPopup(`
        <div style="font-family: 'Outfit', sans-serif; min-width: 180px;">
          <h4 style="font-weight: 800; margin: 0 0 4px 0; color: #0f172a;">${station.name}</h4>
          <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748b;">River Basin: <strong>${station.riverBasin}</strong></p>
          <div style="padding: 4px 8px; border-radius: 6px; background: ${markerColor}20; color: ${markerColor}; font-weight: 800; font-size: 12px; margin-bottom: 6px;">
            Status: ${station.status} (${station.waterLevel} cm)
          </div>
          <p style="margin: 0; font-size: 11px;">Rainfall: <strong>${station.rainfall}</strong></p>
        </div>
      `);

      mapMarkers.push(circle);

      // Render Station Card
      if (container) {
        const card = document.createElement('div');
        card.className = 'p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between';
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-xs text-slate-800 dark:text-slate-100">${station.district}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-extrabold" style="background: ${markerColor}20; color: ${markerColor};">
                ${station.status}
              </span>
            </div>
            <p class="text-[11px] text-slate-400 mb-2">${station.riverBasin}</p>
          </div>
          <div class="flex items-baseline justify-between pt-2 border-t border-slate-100 dark:border-slate-700/60 text-xs">
            <span class="text-slate-500">Water: <strong class="text-slate-800 dark:text-white">${station.waterLevel} cm</strong></span>
            <span class="text-slate-500">Rain: <strong class="text-slate-800 dark:text-white">${station.rainfall}</strong></span>
          </div>
        `;
        container.appendChild(card);
      }
    });
  } catch (e) {
    console.error('Map stations fetch error:', e);
  }
}
