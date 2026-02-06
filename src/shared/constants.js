// Shared constants for Device Output Switcher extension
// Attached to global scope for use across content scripts

(function() {
  // Create global namespace for extension constants
  if (!window.DeviceOutputConstants) {
    window.DeviceOutputConstants = {};
  }

  // Message types passed between background and content scripts
  window.DeviceOutputConstants.GET_COOKIE = 'GET_COOKIE';
  window.DeviceOutputConstants.SET_COOKIE = 'SET_COOKIE';
  window.DeviceOutputConstants.GET_ALL_COOKIES = 'GET_ALL_COOKIES';

  // Device type constants
  window.DeviceOutputConstants.DEVICE_TYPES = {
    DESKTOP: 'desktop',
    MOBILE: 'mobile',
    APP: 'app',
  };

  // Domain validation regex
  // Validates standard domain format (e.g., example.com, sub.example.co.uk)
  // Rejects: IP addresses, protocols, paths, invalid characters
  window.DeviceOutputConstants.DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

  // Timing constants
  window.DeviceOutputConstants.RELOAD_DELAY_MS = 100;
  window.DeviceOutputConstants.MESSAGE_TIMEOUT_MS = 5000;
  window.DeviceOutputConstants.MUTATION_DEBOUNCE_MS = 250;
  window.DeviceOutputConstants.ERROR_HIDE_DELAY_MS = 5000;
})();
