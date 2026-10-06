// autopubli24 - Background Service Worker (Manifest V3)
// Master queue controller that keeps running even when popup is closed!

console.log('autopubli24: Background Service Worker iniciado.');

// In-memory runtime state
let state = {
  isRunning: false,
  queue: [],
  currentIndex: 0,
  countdown: 0,
  statusText: 'Listo para sincronizar',
  serverUrl: '',
  delaySeconds: 90,
  jitter: true,
  syncScope: 'selection',
  totalSent: 0,
  totalFailed: 0,
};

let countdownInterval = null;
let watchdogTimeout = null;

// Initialize state from storage on startup
chrome.storage.local.get(
  ['serverUrl', 'delaySeconds', 'jitter', 'syncScope', 'queue', 'currentIndex', 'contactedPhones'],
  (res) => {
    if (res.serverUrl) state.serverUrl = res.serverUrl;
    if (res.delaySeconds) state.delaySeconds = Number(res.delaySeconds);
    if (typeof res.jitter === 'boolean') state.jitter = res.jitter;
    if (res.syncScope) state.syncScope = res.syncScope;
    if (Array.isArray(res.queue) && res.queue.length > 0) {
      state.queue = res.queue;
      state.currentIndex = res.currentIndex || 0;
      state.statusText = `${state.queue.length} contactos cargados en memoria.`;
    }
  }
);

function persistState() {
  chrome.storage.local.set({
    serverUrl: state.serverUrl,
    delaySeconds: state.delaySeconds,
    jitter: state.jitter,
    syncScope: state.syncScope,
    queue: state.queue,
    currentIndex: state.currentIndex,
  });
}

function broadcastState() {
  chrome.runtime.sendMessage({
    action: 'STATE_UPDATED',
    state: {
      ...state,
      queueSummary: {
        total: state.queue.length,
        sent: state.queue.filter((q) => q.status === 'sent').length,
        pending: state.queue.filter((q) => q.status === 'pending').length,
        failed: state.queue.filter((q) => q.status === 'failed' || q.status === 'invalid_number').length,
      },
    },
  }).catch(() => {});
}

// Find or create single WhatsApp Web tab
async function getOrCreateWhatsAppTab(targetUrl) {
  const tabs = await chrome.tabs.query({ url: '*://web.whatsapp.com/*' });
  if (tabs.length > 0) {
    const mainTab = tabs[0];
    // Close any accidental duplicate WhatsApp tabs
    for (let i = 1; i < tabs.length; i++) {
      chrome.tabs.remove(tabs[i].id).catch(() => {});
    }
    if (targetUrl) {
      await chrome.tabs.update(mainTab.id, { url: targetUrl });
    }
    return mainTab;
  }
  return await chrome.tabs.create({
    url: targetUrl || 'https://web.whatsapp.com',
    active: true,
  });
}

// Helper: Format message text with dynamic tags
function formatMessage(tplText, name, city, portal) {
  let text = tplText || '';
  const rawName = (name || '').trim();
  const cleanCity = (city || '').split('(')[0].trim() || 'tu zona';

  let cleanPortal = (portal || 'el portal')
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\.(com|es|net|org|co|eu|info|cat|club|online).*$/i, '')
    .trim();

  const lowerPortal = cleanPortal.toLowerCase();
  if (lowerPortal.includes('mundosexanuncio')) cleanPortal = 'Mundosexanuncio';
  else if (lowerPortal.includes('milanuncios')) cleanPortal = 'Milanuncios';
  else if (lowerPortal.includes('pasion')) cleanPortal = 'Pasión';
  else if (lowerPortal.includes('loquo')) cleanPortal = 'Loquo';
  else if (lowerPortal.includes('slumi')) cleanPortal = 'Slumi';
  else if (cleanPortal && cleanPortal !== 'el portal') {
    cleanPortal = cleanPortal.charAt(0).toUpperCase() + cleanPortal.slice(1);
  }

  if (rawName) {
    text = text.replace(/{nombre}/gi, rawName);
  } else {
    text = text
      .replace(/\b(hola|buenas)\s*\{nombre\}\s*,/gi, '$1,')
      .replace(/\b(hola|buenas)\s*\{nombre\}\s*/gi, '$1 ')
      .replace(/\s*\{nombre\}\s*/gi, ' ')
      .replace(/{nombre}/gi, '');
  }

  text = text
    .replace(/{ciudad}/gi, cleanCity)
    .replace(/{portal}/gi, cleanPortal);

  return text
    .split('\n')
    .map((l) => l.trim())
    .join('\n')
    .trim();
}

// Sincronizar cola desde el servidor autopubli24
async function syncQueueFromServer(customUrl) {
  const host = (customUrl || state.serverUrl || '').trim().replace(/\/$/, '');
  if (!host) throw new Error('Introduce la URL de tu panel autopubli24.');

  state.serverUrl = host;
  state.statusText = 'Sincronizando con panel autopubli24...';
  broadcastState();

  // 1. Fetch templates
  let templates = [];
  let rotationMode = 'round_robin';
  try {
    const cfgRes = await fetch(`${host}/api/whatsapp/config`);
    const cfgData = await cfgRes.json();
    if (cfgData.success && cfgData.config) {
      templates = cfgData.config.templates || [];
      rotationMode = cfgData.config.rotationMode || 'round_robin';
    }
  } catch {}

  // 2. Fetch contacted phone blacklist from storage
  const storageData = await chrome.storage.local.get(['contactedPhones']);
  const contactedPhonesSet = new Set(storageData.contactedPhones || []);

  let rawAds = [];
  if (state.syncScope === 'selection') {
    const selRes = await fetch(`${host}/api/whatsapp/active-selection`);
    const selData = await selRes.json();
    if (selData.success && Array.isArray(selData.ads) && selData.ads.length > 0) {
      rawAds = selData.ads;
    } else {
      // Fallback: directory uncontacted
      const dirRes = await fetch(`${host}/api/directory`);
      const dirData = await dirRes.json();
      rawAds = (dirData.ads || []).filter((a) => a.status === 'nuevo' && a.phone);
    }
  } else {
    const dirRes = await fetch(`${host}/api/directory`);
    const dirData = await dirRes.json();
    rawAds = (dirData.ads || []).filter((a) => a.status === 'nuevo' && a.phone);
  }

  // 3. Strict filter: EXCLUDE ALREADY CONTACTED & DEDUPLICATE BY PHONE
  const seenPhones = new Set();
  const filteredAds = [];

  for (const ad of rawAds) {
    if (ad.status === 'contactado') continue; // NEVER include already contacted
    const cleanPhone = (ad.normalizedPhone || ad.phone || '').replace(/[^0-9]/g, '');
    if (!cleanPhone) continue;
    if (seenPhones.has(cleanPhone)) continue; // avoid duplicate in same batch
    if (contactedPhonesSet.has(cleanPhone)) continue; // avoid phone contacted in previous sessions
    seenPhones.add(cleanPhone);
    filteredAds.push(ad);
  }

  state.queue = filteredAds.map((ad, i) => {
    let chosenTpl = templates[0];
    if (templates.length > 0) {
      if (rotationMode === 'round_robin') {
        chosenTpl = templates[i % templates.length];
      } else {
        chosenTpl = templates[Math.floor(Math.random() * templates.length)];
      }
    }

    const msgText = formatMessage(
      chosenTpl?.text || 'Hola {nombre} vi tu anuncio en {portal}',
      ad.detectedName,
      ad.location,
      ad.sourceSite
    );

    const cleanPhone = (ad.normalizedPhone || ad.phone).replace(/[^0-9]/g, '');
    const encoded = encodeURIComponent(msgText);
    const whatsappUrl = `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;

    return {
      id: ad.id,
      displayName: ad.detectedName || ad.title?.slice(0, 25) || ad.phone,
      phone: cleanPhone,
      location: (ad.location || 'Madrid').split('(')[0].trim(),
      sourceSite: ad.sourceSite || 'portal',
      messageText: msgText,
      whatsappUrl,
      status: 'pending',
    };
  });

  state.currentIndex = 0;
  state.statusText = `✓ ${state.queue.length} contactos pendientes preparados (excluidos ya contactados).`;
  persistState();
  broadcastState();
  return state.queue.length;
}

// Master dispatch function for a single item
async function processCurrentItem() {
  if (!state.isRunning) return;

  const nextPendingIdx = state.queue.findIndex(
    (q, idx) => idx >= state.currentIndex && q.status === 'pending'
  );

  if (nextPendingIdx === -1) {
    // All done!
    state.isRunning = false;
    state.statusText = '🎉 ¡Todos los contactos han sido enviados!';
    persistState();
    broadcastState();
    return;
  }

  state.currentIndex = nextPendingIdx;
  const item = state.queue[state.currentIndex];
  item.status = 'sending';
  state.statusText = `Enviando ${state.currentIndex + 1}/${state.queue.length} a ${item.displayName} (${item.phone})...`;
  persistState();
  broadcastState();

  let sendResult = { success: false, reason: 'UNKNOWN' };

  try {
    // 1. Navigate WhatsApp tab
    const tab = await getOrCreateWhatsAppTab(item.whatsappUrl);

    // 2. Wait for tab update or timeout
    await new Promise((resolve) => {
      let resolved = false;
      const listener = (tabId, changeInfo) => {
        if (tabId === tab.id && changeInfo.status === 'complete') {
          if (!resolved) {
            resolved = true;
            chrome.tabs.onUpdated.removeListener(listener);
            resolve(true);
          }
        }
      };
      chrome.tabs.onUpdated.addListener(listener);
      // Fallback: 10 seconds max for SPA navigation
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          chrome.tabs.onUpdated.removeListener(listener);
          resolve(true);
        }
      }, 10000);
    });

    // 3. Give WhatsApp Web 3.5 seconds to mount chat and text box
    await new Promise((r) => setTimeout(r, 3500));

    // 4. Send command to content script with 20s watchdog
    sendResult = await new Promise((resolve) => {
      let responded = false;
      const watchdog = setTimeout(() => {
        if (!responded) {
          responded = true;
          resolve({ success: false, reason: 'TIMEOUT_CONTENT_SCRIPT' });
        }
      }, 20000);

      chrome.tabs.sendMessage(
        tab.id,
        { action: 'CLICK_SEND', phone: item.phone, text: item.messageText },
        (res) => {
          clearTimeout(watchdog);
          if (!responded) {
            responded = true;
            if (chrome.runtime.lastError) {
              resolve({ success: false, reason: chrome.runtime.lastError.message });
            } else {
              resolve(res || { success: false, reason: 'NO_RESPONSE' });
            }
          }
        }
      );
    });
  } catch (err) {
    sendResult = { success: false, reason: err.message };
  }

  // 5. Update item status
  if (sendResult && sendResult.success) {
    item.status = 'sent';
    state.totalSent++;
    state.statusText = `✓ Enviado con éxito a ${item.phone}.`;

    // Persist to blacklist in storage
    const cur = await chrome.storage.local.get(['contactedPhones']);
    const list = cur.contactedPhones || [];
    if (!list.includes(item.phone)) {
      list.push(item.phone);
      chrome.storage.local.set({ contactedPhones: list });
    }

    // Mark contacted on server
    if (state.serverUrl) {
      fetch(`${state.serverUrl}/api/whatsapp/mark-contacted`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId: item.id, phone: item.phone }),
      }).catch(() => {});
    }
  } else if (sendResult && sendResult.reason === 'INVALID_NUMBER') {
    item.status = 'invalid_number';
    state.totalFailed++;
    state.statusText = `⚠️ Número ${item.phone} no tiene WhatsApp. Saltando...`;
  } else {
    item.status = 'failed';
    state.totalFailed++;
    state.statusText = `✕ Error en ${item.phone} (${sendResult?.reason || 'Fallo'}). Pasando al siguiente...`;
  }

  persistState();
  broadcastState();

  if (!state.isRunning) return;

  // 6. Schedule NEXT item with countdown anti-ban pause
  let delay = Number(state.delaySeconds) || 90;
  if (state.jitter) {
    const jitterOffset = Math.floor(Math.random() * 25) - 12; // ±12s
    delay = Math.max(25, delay + jitterOffset);
  }

  state.countdown = delay;
  state.statusText = `Pausa anti-bloqueo: siguiente envío (${state.currentIndex + 2}/${state.queue.length}) en ${state.countdown}s...`;
  broadcastState();

  if (countdownInterval) clearInterval(countdownInterval);

  countdownInterval = setInterval(() => {
    if (!state.isRunning) {
      clearInterval(countdownInterval);
      state.countdown = 0;
      broadcastState();
      return;
    }

    state.countdown--;
    if (state.countdown <= 0) {
      clearInterval(countdownInterval);
      state.countdown = 0;
      state.currentIndex++;
      processCurrentItem();
    } else {
      state.statusText = `Pausa anti-bloqueo: siguiente envío (${state.currentIndex + 2}/${state.queue.length}) en ${state.countdown}s...`;
      broadcastState();
    }
  }, 1000);
}

function startCampaign() {
  if (state.queue.length === 0) return;
  state.isRunning = true;
  state.statusText = 'Iniciando campaña desatendida...';
  persistState();
  broadcastState();
  processCurrentItem();
}

function stopCampaign() {
  state.isRunning = false;
  if (countdownInterval) clearInterval(countdownInterval);
  state.countdown = 0;
  state.statusText = 'Campaña pausada por el usuario.';
  persistState();
  broadcastState();
}

// Listen for messages from popup or web page
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'GET_STATE') {
    sendResponse({ success: true, state });
    return true;
  }

  if (request.action === 'START_CAMPAIGN') {
    startCampaign();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'STOP_CAMPAIGN') {
    stopCampaign();
    sendResponse({ success: true });
    return true;
  }

  if (request.action === 'UPDATE_SETTINGS') {
    if (request.serverUrl) state.serverUrl = request.serverUrl;
    if (request.delaySeconds) state.delaySeconds = Number(request.delaySeconds);
    if (typeof request.jitter === 'boolean') state.jitter = request.jitter;
    if (request.syncScope) state.syncScope = request.syncScope;
    persistState();
    broadcastState();
    sendResponse({ success: true, state });
    return true;
  }

  if (request.action === 'SYNC_FROM_SERVER' || request.action === 'DIRECT_SYNC_FROM_PAGE') {
    (async () => {
      try {
        const count = await syncQueueFromServer(request.serverUrl);
        sendResponse({ success: true, count, state });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'SKIP_CURRENT') {
    if (countdownInterval) clearInterval(countdownInterval);
    state.currentIndex++;
    processCurrentItem();
    sendResponse({ success: true });
    return true;
  }
});
