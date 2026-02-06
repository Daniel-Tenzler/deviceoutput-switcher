// Background service worker - handles cookie API operations
// Content scripts cannot access chrome.cookies API directly, so we proxy requests

// Message types
const GET_COOKIE = 'GET_COOKIE';
const SET_COOKIE = 'SET_COOKIE';
const GET_ALL_COOKIES = 'GET_ALL_COOKIES';

/**
 * Get a specific cookie for a URL
 */
async function getCookie(url, name) {
  return await chrome.cookies.get({ url, name });
}

/**
 * Set a cookie with proper attributes
 */
async function setCookie(url, name, value) {
  const urlObj = new URL(url);

  // Remove existing cookie first if it exists
  try {
    await chrome.cookies.remove({
      url: url,
      name: name,
    });
  } catch (e) {
    // Cookie might not exist, continue
  }

  // Set new cookie with standard attributes
  return await chrome.cookies.set({
    url: url,
    name: name,
    value: value,
    domain: urlObj.hostname,
    path: '/',
    secure: urlObj.protocol === 'https:',
    sameSite: 'lax',
  });
}

/**
 * Get all cookies for a URL
 */
async function getAllCookies(url) {
  return await chrome.cookies.getAll({ url });
}

/**
 * Notify all tabs with the same URL about cookie changes
 */
async function notifyTabsOfChange(url) {
  try {
    const urlObj = new URL(url);
    const tabs = await chrome.tabs.query({});

    // Filter tabs by matching origin and send notifications
    const notifications = tabs
      .filter(tab => {
        // Skip tabs without URLs
        if (!tab.url) return false;

        try {
          const tabUrl = new URL(tab.url);
          // Match by origin to include both http/https and all paths
          return tabUrl.origin === urlObj.origin;
        } catch {
          // Invalid URL in tab, skip it
          return false;
        }
      })
      .map(tab =>
        chrome.tabs.sendMessage(tab.id, { type: 'COOKIE_CHANGED', url })
          .catch(() => {
            // Tab might not be ready or closed, ignore error
          })
      );

    // Wait for all notifications to complete (or fail silently)
    await Promise.allSettled(notifications);
  } catch (error) {
    console.error('Failed to notify tabs of cookie change:', error);
  }
}

// Message handler from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
    try {
      // SECURITY: Validate sender and origin
      if (!sender.tab || !sender.tab.url) {
        sendResponse({ success: false, error: 'Invalid sender' });
        return;
      }

      // SECURITY: Validate that the URL in the request matches the sender's origin
      let senderUrl, requestUrl;
      try {
        senderUrl = new URL(sender.tab.url);
        requestUrl = new URL(request.url);
      } catch (e) {
        sendResponse({ success: false, error: 'Invalid URL format' });
        return;
      }

      // Ensure origins match - prevent cross-origin manipulation
      if (senderUrl.origin !== requestUrl.origin) {
        console.warn('Origin mismatch:', { senderOrigin: senderUrl.origin, requestOrigin: requestUrl.origin });
        sendResponse({ success: false, error: 'Origin mismatch' });
        return;
      }

      switch (request.type) {
        case GET_COOKIE:
          const cookie = await getCookie(request.url, request.name);
          sendResponse({ success: true, cookie });
          break;

        case SET_COOKIE:
          const result = await setCookie(request.url, request.name, request.value);
          notifyTabsOfChange(request.url);
          sendResponse({ success: true, result });
          break;

        case GET_ALL_COOKIES:
          const cookies = await getAllCookies(request.url);
          sendResponse({ success: true, cookies });
          break;

        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }
  })();

  // Return true to indicate async response
  return true;
});
