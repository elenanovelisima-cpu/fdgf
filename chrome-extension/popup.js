// autopubli24 - Extension Popup Controller
// Communicates with background service worker to display live status and send commands.

// DOM Elements
const serverUrlInput = document.getElementById('serverUrl');
const btnAutoDetect = document.getElementById('btnAutoDetect');
const btnSync = document.getElementById('btnSync');
const btnStart = document.getElementById('btnStart');
const btnStop = document.getElementById('btnStop');
const delaySelect = document.getElementById('delaySelect');
const jitterSelect = document.getElementById('jitterSelect');
const syncScopeSelect = document.getElementById('syncScopeSelect');
const statusBadge = document.getElementById('statusBadge');
const counterText = document.getElementById('counterText');
const progressFill = document.getElementById('progressFill');
const statusLog = document.getElementById('statusLog');
const contactList = document.getElementById('contactList');

let currentState = {
  isRunning: false,
  queue: [],
  currentIndex: 0,
  countdown: 0,
  statusText: 'Cargando estado...',
  serverUrl: '',
};

// Auto-detect server URL from currently open tabs
async function autoDetectServerUrl() {
  try {
    const tabs = await chrome.tabs.query({});
    for (const tab of tabs) {
      if (tab.url && !tab.url.includes('web.whatsapp.com') && !tab.url.startsWith('chrome://')) {
        try {
          const u = new URL(tab.url);
          // Check if this tab is likely the autopubli24 dashboard
          if (u.hostname.includes('run.app') || u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
            serverUrlInput.value = u.origin;
            updateSettings({ serverUrl: u.origin });
            return u.origin;
          }
        } catch {}
      }
    }
  } catch {}
  return null;
}

// Render queue list & progress from background state
function renderState(state) {
  currentState = state;
  const queue = state.queue || [];
  const isRunning = !!state.isRunning;

  if (state.serverUrl && !serverUrlInput.value) {
    serverUrlInput.value = state.serverUrl;
  }
  if (state.delaySeconds) {
    delaySelect.value = String(state.delaySeconds);
  }
  if (typeof state.jitter === 'boolean') {
    jitterSelect.value = state.jitter ? 'yes' : 'no';
  }
  if (state.syncScope) {
    syncScopeSelect.value = state.syncScope;
  }

  // Badges & log
  if (isRunning) {
    if (state.countdown > 0) {
      statusBadge.textContent = `Pausa ${state.countdown}s`;
      statusBadge.style.color = '#38bdf8';
    } else {
      statusBadge.textContent = 'Enviando...';
      statusBadge.style.color = '#f59e0b';
    }
  } else if (queue.length > 0 && queue.every((q) => q.status === 'sent')) {
    statusBadge.textContent = 'Completado';
    statusBadge.style.color = '#10b981';
  } else {
    statusBadge.textContent = 'Listo';
    statusBadge.style.color = '#34d399';
  }

  statusLog.textContent = state.statusText || 'Listo.';

  // Counts and progress bar
  const sentCount = queue.filter((q) => q.status === 'sent').length;
  counterText.textContent = `${sentCount} / ${queue.length}`;
  const pct = queue.length > 0 ? Math.round((sentCount / queue.length) * 100) : 0;
  progressFill.style.width = `${pct}%`;

  // Buttons state
  btnStart.disabled = isRunning || queue.length === 0 || queue.every((q) => q.status === 'sent');
  btnStop.disabled = !isRunning;

  // Contact rows
  if (queue.length === 0) {
    contactList.innerHTML = '<div style="padding: 10px; text-align: center; color: #64748b; font-size: 11px;">Sin contactos cargados. Pulsa "Sincronizar".</div>';
    return;
  }

  let html = '';
  queue.forEach((item, idx) => {
    let icon = '⏳';
    let cls = '';
    if (item.status === 'sent') {
      icon = '✓';
      cls = 'sent';
    } else if (item.status === 'sending') {
      icon = '▶';
      cls = 'sending';
    } else if (item.status === 'invalid_number') {
      icon = '⚠️ Sin WA';
      cls = 'failed';
    } else if (item.status === 'failed') {
      icon = '✕';
      cls = 'failed';
    }

    html += `
      <div class="contact-row ${cls}">
        <div>
          <strong>${idx + 1}. ${item.displayName}</strong>
          <span style="color: #64748b; margin-left: 4px;">(${item.location})</span>
        </div>
        <div style="font-family: monospace;">${item.phone} ${icon}</div>
      </div>
    `;
  });
  contactList.innerHTML = html;
}

// Send settings update to background script
function updateSettings(extra = {}) {
  const payload = {
    action: 'UPDATE_SETTINGS',
    serverUrl: serverUrlInput.value.trim().replace(/\/$/, ''),
    delaySeconds: parseInt(delaySelect.value, 10) || 90,
    jitter: jitterSelect.value === 'yes',
    syncScope: syncScopeSelect.value,
    ...extra,
  };
  chrome.runtime.sendMessage(payload, (res) => {
    if (res && res.state) renderState(res.state);
  });
}

// Request fresh state from background
function fetchState() {
  chrome.runtime.sendMessage({ action: 'GET_STATE' }, (res) => {
    if (res && res.state) {
      renderState(res.state);
    }
  });
}

// Listen for broadcast updates from background
chrome.runtime.onMessage.addListener((request) => {
  if (request.action === 'STATE_UPDATED' && request.state) {
    renderState(request.state);
  }
});

// Sync from server button
btnSync.addEventListener('click', () => {
  const host = serverUrlInput.value.trim().replace(/\/$/, '');
  if (!host) {
    statusLog.textContent = '⚠️ Introduce primero la URL de tu panel autopubli24.';
    return;
  }

  btnSync.disabled = true;
  statusLog.textContent = 'Sincronizando con panel web...';

  updateSettings({ serverUrl: host });

  chrome.runtime.sendMessage(
    {
      action: 'SYNC_FROM_SERVER',
      serverUrl: host,
    },
    (res) => {
      btnSync.disabled = false;
      if (res && res.success) {
        if (res.state) renderState(res.state);
      } else {
        statusLog.textContent = `Error: ${res?.error || 'No se pudo conectar'}`;
      }
    }
  );
});

// Auto-detect button
if (btnAutoDetect) {
  btnAutoDetect.addEventListener('click', async () => {
    statusLog.textContent = 'Buscando pestaña del panel...';
    const detected = await autoDetectServerUrl();
    if (detected) {
      statusLog.textContent = `✓ Detectada: ${detected}`;
    } else {
      statusLog.textContent = 'Pega la URL de tu panel (ej. https://ais-dev-...run.app)';
    }
  });
}

// Start campaign
btnStart.addEventListener('click', () => {
  updateSettings();
  chrome.runtime.sendMessage({ action: 'START_CAMPAIGN' }, (res) => {
    if (res && res.success) {
      fetchState();
    }
  });
});

// Stop campaign
btnStop.addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'STOP_CAMPAIGN' }, (res) => {
    if (res && res.success) {
      fetchState();
    }
  });
});

// Input change listeners
serverUrlInput.addEventListener('change', () => updateSettings());
delaySelect.addEventListener('change', () => updateSettings());
jitterSelect.addEventListener('change', () => updateSettings());
syncScopeSelect.addEventListener('change', () => updateSettings());

// On load: initialize and auto-detect if serverUrl is blank
document.addEventListener('DOMContentLoaded', async () => {
  fetchState();
  if (!serverUrlInput.value) {
    await autoDetectServerUrl();
  }
});
