// Main entry point for Device Output Switcher content script
// Orchestrates UI and CookieManager modules

(async function initDeviceOutputSwitcher() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    await new Promise((resolve) => {
      document.addEventListener('DOMContentLoaded', resolve);
    });
  }

  // Import functionality from other modules (loaded as separate script tags in manifest)
  // In this setup, all modules are loaded in global scope

  // Constants
  const RELOAD_DELAY_MS = 100;

  /**
   * Handle device type change
   */
  async function handleDeviceChange(deviceType) {
    try {
      // Set the cookies
      await setDeviceType(deviceType);

      // Update UI
      updateActiveDevice(deviceType);
      hideError();

      // Reload page to apply changes
      setTimeout(() => location.reload(), RELOAD_DELAY_MS);
    } catch (error) {
      console.error('Failed to set device type:', error);
      showError(`Failed to switch to ${deviceType}: ${error.message}`);
    }
  }

  /**
   * Initialize the card with current device state
   */
  async function initializeCard() {
    // Check if current domain is whitelisted (or whitelist is empty)
    const isWhitelisted = await isCurrentDomainWhitelisted();

    if (!isWhitelisted) {
      // Don't show the card if domain is not whitelisted
      return;
    }

    // Get current device from cookies
    const currentDevice = await getCurrentDevice();

    // Show the UI card
    showCard();

    // Update active state based on current device
    if (currentDevice) {
      updateActiveDevice(currentDevice);
    }

    // Attach click handlers to buttons
    attachButtonHandler(handleDeviceChange);

    // Setup whitelist management
    setupWhitelistManagement();
  }

  /**
   * Listen for cookie changes from other tabs
   */
  function setupCookieChangeListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'COOKIE_CHANGED') {
        // Update UI when cookies change from another tab
        getCurrentDevice().then((device) => {
          if (device) {
            updateActiveDevice(device);
          }
        });
      }
    });
  }

  /**
   * Setup whitelist management
   */
  function setupWhitelistManagement() {
    // Load and display current whitelist
    loadWhitelist();

    // Handle add button click
    const addBtn = document.getElementById('device-output-add-btn');
    if (addBtn) {
      addBtn.onclick = handleAddDomain;
    }

    // Handle Enter key in input field
    const input = document.getElementById('device-output-settings-input');
    if (input) {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          handleAddDomain();
        }
      });
    }

    // Listen for domain removal events - store reference for cleanup
    if (!window.deviceOutputRemoveListener) {
      window.deviceOutputRemoveListener = async (e) => {
        try {
          await removeDomainFromWhitelist(e.detail);
          await loadWhitelist();
        } catch (error) {
          console.error('Failed to remove domain:', error);
          showError(`Failed to remove domain: ${error.message}`);
        }
      };
      document.addEventListener('removeDomainFromWhitelist', window.deviceOutputRemoveListener);
    }
  }

  /**
   * Load and display the whitelist
   */
  async function loadWhitelist() {
    try {
      const whitelist = await getWhitelist();
      updateWhitelistDisplay(whitelist);
    } catch (error) {
      console.error('Failed to load whitelist:', error);
    }
  }

  /**
   * Handle adding a domain to the whitelist
   */
  async function handleAddDomain() {
    const input = document.getElementById('device-output-settings-input');
    if (!input) return;

    const domain = input.value.trim();
    if (!domain) {
      showError('Please enter a domain');
      return;
    }

    try {
      await addDomainToWhitelist(domain);
      input.value = '';
      await loadWhitelist();
      hideError();
    } catch (error) {
      console.error('Failed to add domain:', error);
      showError(`Failed to add domain: ${error.message}`);
    }
  }

  // Initialize everything
  try {
    await initializeCard();
    setupCookieChangeListener();
  } catch (error) {
    console.error('Failed to initialize Device Output Switcher:', error);
  }

  // Handle page navigation (for single-page apps)
  let lastUrl = location.href;
  let lastDomain = window.location.hostname;
  let debounceTimer = null;
  let navigationObserver = null;

  function setupNavigationWatcher() {
    // Cleanup existing observer if present
    if (navigationObserver) {
      navigationObserver.disconnect();
    }

    navigationObserver = new MutationObserver(() => {
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }

      // Debounce to avoid excessive re-initializations
      debounceTimer = setTimeout(async () => {
        const url = location.href;
        const currentDomain = window.location.hostname;

        // Re-initialize on navigation or domain change
        if (url !== lastUrl || currentDomain !== lastDomain) {
          lastUrl = url;
          lastDomain = currentDomain;

          // Check whitelist first
          const isWhitelisted = await isCurrentDomainWhitelisted();

          if (!isWhitelisted) {
            hideCard();
            return;
          }

          // Re-initialize on navigation
          try {
            await initializeCard();
          } catch (err) {
            console.error('Failed to re-initialize on navigation:', err);
          }
        }
      }, 250); // Debounce for 250ms
    });

    navigationObserver.observe(document.body, { childList: true, subtree: true });
  }

  // Initialize navigation watcher
  setupNavigationWatcher();
})();
