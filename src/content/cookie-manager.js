// Cookie Manager - handles device output cookies
// Communicates with background script to access chrome.cookies API

const GET_COOKIE = 'GET_COOKIE';
const SET_COOKIE = 'SET_COOKIE';
const GET_ALL_COOKIES = 'GET_ALL_COOKIES';

// Device type constants
const DEVICE_TYPES = {
  DESKTOP: 'desktop',
  MOBILE: 'mobile',
  APP: 'app',
};

// Message timeout constant
const MESSAGE_TIMEOUT_MS = 5000;
const MESSAGE_RETRY_DELAY_MS = 150;
const MAX_SEND_RETRIES = 2;

function isReceivingEndError(error) {
  return (
    error
    && typeof error.message === 'string'
    && error.message.includes('Could not establish connection. Receiving end does not exist.')
  );
}

function getDocumentCookieValue(name) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escapedName}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Send a message to the background script and wait for response
 * @param {Object} message - Message to send
 * @param {number} timeout - Timeout in milliseconds (default: 5000)
 * @returns {Promise} Resolves with response or rejects on error/timeout
 */
async function sendMessageToBackground(message, timeout = MESSAGE_TIMEOUT_MS) {
  let attempts = 0;

  while (attempts <= MAX_SEND_RETRIES) {
    try {
      const response = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timeout waiting for response to ${message.type} after ${timeout}ms`));
        }, timeout);

        chrome.runtime.sendMessage(message, (result) => {
          clearTimeout(timer);

          if (chrome.runtime.lastError) {
            reject(new Error(`Chrome runtime error: ${chrome.runtime.lastError.message}`));
            return;
          }

          if (!result) {
            reject(new Error('No response received from background script'));
            return;
          }

          if (!result.success) {
            reject(new Error(result.error || `Operation ${message.type} failed`));
            return;
          }

          resolve(result);
        });
      });

      return response;
    } catch (error) {
      const canRetry = isReceivingEndError(error) && attempts < MAX_SEND_RETRIES;
      if (!canRetry) {
        throw error;
      }

      await new Promise((resolve) => {
        setTimeout(resolve, MESSAGE_RETRY_DELAY_MS);
      });
      attempts += 1;
    }
  }

  throw new Error(`Failed to send ${message.type} after retries`);
}

/**
 * Get current device type from cookies
 * Checks both 'deviceoutput' and 'devicetype' cookies
 * Returns the device type or null if not set
 */
async function getCurrentDevice() {
  const url = window.location.href;

  try {
    const response = await sendMessageToBackground({
      type: GET_ALL_COOKIES,
      url: url,
    });

    if (response && response.cookies) {
      const deviceOutputCookie = response.cookies.find(
        (c) => c.name === 'deviceoutput'
      );
      const deviceTypeCookie = response.cookies.find((c) => c.name === 'devicetype');

      // Prioritize deviceoutput, fall back to devicetype
      const deviceValue =
        deviceOutputCookie?.value || deviceTypeCookie?.value || null;

      // Validate it's a known device type
      if (Object.values(DEVICE_TYPES).includes(deviceValue)) {
        return deviceValue;
      }
    }
    return null;
  } catch (error) {
    if (isReceivingEndError(error)) {
      const fallbackValue =
        getDocumentCookieValue('deviceoutput')
        || getDocumentCookieValue('devicetype');

      if (Object.values(DEVICE_TYPES).includes(fallbackValue)) {
        return fallbackValue;
      }

      return null;
    }

    console.error('Error getting current device:', error);
    return null;
  }
}

/**
 * Set device type cookies
 * Sets both 'deviceoutput' and 'devicetype' cookies to the specified type
 */
async function setDeviceType(deviceType) {
  const url = window.location.href;

  if (!Object.values(DEVICE_TYPES).includes(deviceType)) {
    throw new Error(`Invalid device type: ${deviceType}`);
  }

  try {
    // Set deviceoutput cookie
    await sendMessageToBackground({
      type: SET_COOKIE,
      url: url,
      name: 'deviceoutput',
      value: deviceType,
    });

    // Set devicetype cookie
    await sendMessageToBackground({
      type: SET_COOKIE,
      url: url,
      name: 'devicetype',
      value: deviceType,
    });

    return true;
  } catch (error) {
    console.error('Error setting device type:', error);
    throw error;
  }
}

/**
 * Get the cookie value for a specific cookie name
 */
async function getCookie(name) {
  const url = window.location.href;

  try {
    const response = await sendMessageToBackground({
      type: GET_COOKIE,
      url: url,
      name: name,
    });

    return response?.cookie?.value || null;
  } catch (error) {
    console.error(`Error getting cookie ${name}:`, error);
    return null;
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    DEVICE_TYPES,
    getCurrentDevice,
    setDeviceType,
    getCookie,
  };
}
