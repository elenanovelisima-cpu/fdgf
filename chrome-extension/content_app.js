// autopubli24 - Content Script for autopubli24 web panel
console.log('autopubli24: Conector de extensión activo en el panel web.');

// Listen for window messages from the web dashboard
window.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'AUTOPUBLI24_SYNC_SELECTION') {
    const { serverUrl, count } = event.data;
    console.log('autopubli24: Recibida señal de sincronización desde el panel:', event.data);

    chrome.runtime.sendMessage(
      {
        action: 'DIRECT_SYNC_FROM_PAGE',
        serverUrl: serverUrl || window.location.origin,
      },
      (response) => {
        if (response && response.success) {
          window.postMessage(
            {
              type: 'AUTOPUBLI24_EXTENSION_SYNC_ACK',
              success: true,
              count: response.count,
            },
            '*'
          );
        }
      }
    );
  }
});
