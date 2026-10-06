// autopubli24 - Content Script for web.whatsapp.com
console.log('autopubli24 Auto-Sender Content Script activo en WhatsApp Web.');

// Helper: Check for "Use here" / "Usar aquí" dialog and auto-click it
function checkForUseHereModal() {
  const buttons = document.querySelectorAll('button, div[role="button"]');
  for (const btn of buttons) {
    const text = (btn.innerText || '').toUpperCase();
    if (text.includes('USAR AQUÍ') || text.includes('USE HERE')) {
      console.log('autopubli24: Detectado aviso "Usar aquí". Clic automático...');
      btn.click();
      return true;
    }
  }
  return false;
}

// Helper: Check for invalid number dialog
function checkForInvalidNumberModal() {
  const dialogs = document.querySelectorAll('div[role="dialog"], div[data-animate-modal-popup="true"], div.modal');
  for (const dialog of dialogs) {
    const text = dialog.innerText || '';
    if (
      text.includes('no es válido') ||
      text.includes('invalid') ||
      text.includes('no está en WhatsApp') ||
      text.includes('not on WhatsApp') ||
      text.includes('no se ha podido iniciar') ||
      text.includes('could not start')
    ) {
      console.warn('autopubli24: Detectado modal de número no válido en WhatsApp.');
      const okBtn = dialog.querySelector('button, div[role="button"]');
      if (okBtn) okBtn.click();
      return true;
    }
  }
  return false;
}

// Helper: Dismiss link preview card if present
function dismissLinkPreviewIfPresent() {
  const closePreviewBtn =
    document.querySelector('button[data-testid="close-link-preview"]') ||
    document.querySelector('div[data-testid="link-preview"] button') ||
    document.querySelector('div[data-testid="link-preview"] span[data-icon="x"]')?.closest('button') ||
    document.querySelector('span[data-icon="x"]')?.closest('button');
  if (closePreviewBtn) {
    console.log('autopubli24: Cerrando vista previa de enlace para enviar mensaje limpio.');
    closePreviewBtn.click();
  }
}

// Find WhatsApp send button
function findSendButton() {
  return (
    document.querySelector('button[aria-label="Enviar"]') ||
    document.querySelector('button[aria-label="Send"]') ||
    document.querySelector('button[data-testid="send"]') ||
    document.querySelector('span[data-icon="send"]')?.closest('button') ||
    document.querySelector('span[data-testid="send"]')?.closest('button') ||
    document.querySelector('footer button:has(span[data-icon="send"])') ||
    document.querySelector('button[data-tab="11"]')
  );
}

// Find main chat message input
function findMessageInput() {
  return (
    document.querySelector('footer div[contenteditable="true"]') ||
    document.querySelector('div[contenteditable="true"][data-tab="10"]') ||
    document.querySelector('div[contenteditable="true"][role="textbox"]') ||
    document.querySelector('div[contenteditable="true"]')
  );
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'PING') {
    sendResponse({ pong: true });
    return true;
  }

  if (request.action === 'CHECK_READY') {
    const appEl = document.querySelector('#app') || document.querySelector('#main');
    const qrEl = document.querySelector('canvas') || document.querySelector('div[data-ref]');
    const isLogged = !!appEl && !qrEl;
    sendResponse({ ready: isLogged });
    return true;
  }

  if (request.action === 'CLICK_SEND') {
    (async () => {
      try {
        console.log('autopubli24: Intentando enviar mensaje a:', request.phone);

        // 1. Initial stabilization wait
        await new Promise((r) => setTimeout(r, 1200));
        checkForUseHereModal();

        // 2. Check for invalid number modal immediately
        if (checkForInvalidNumberModal()) {
          sendResponse({ success: false, reason: 'INVALID_NUMBER' });
          return;
        }

        // 3. Retry loop to find send button or input
        let sendBtn = findSendButton();
        let retries = 0;
        const maxRetries = 25;

        while (!sendBtn && retries < maxRetries) {
          checkForUseHereModal();
          if (checkForInvalidNumberModal()) {
            sendResponse({ success: false, reason: 'INVALID_NUMBER' });
            return;
          }
          await new Promise((r) => setTimeout(r, 500));
          sendBtn = findSendButton();
          retries++;
        }

        const inputEl = findMessageInput();

        // 4. Dismiss link preview card
        dismissLinkPreviewIfPresent();

        let dispatched = false;

        if (sendBtn) {
          sendBtn.click();
          console.log('autopubli24: Clic en botón de enviar realizado.');
          dispatched = true;
        } else if (inputEl) {
          console.log('autopubli24: Botón enviar no encontrado directamente. Probando Enter...');
          inputEl.focus();
          const enterDown = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
          });
          inputEl.dispatchEvent(enterDown);
          dispatched = true;
        }

        if (!dispatched) {
          sendResponse({ success: false, reason: 'SEND_BUTTON_NOT_FOUND' });
          return;
        }

        // 5. Wait a moment to ensure WhatsApp processed the send action
        await new Promise((r) => setTimeout(r, 1500));
        sendResponse({ success: true, phone: request.phone });
      } catch (err) {
        console.error('autopubli24 error en content script:', err);
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true; // Keep async response channel open
  }
});
