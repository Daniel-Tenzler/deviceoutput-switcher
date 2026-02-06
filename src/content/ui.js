// UI Module - renders and manages the device switcher card

// Constants
const ERROR_HIDE_DELAY_MS = 5000;

const DEVICE_CONFIG = {
  desktop: {
    emoji: '🖥️',
    label: 'D',
  },
  mobile: {
    emoji: '📱',
    label: 'M',
  },
  app: {
    emoji: '⚙️',
    label: 'A',
  },
};

/**
 * Create the device switcher card element
 */
function createCard() {
  const card = document.createElement('div');
  card.className = 'device-output-card collapsed';
  card.id = 'device-output-switcher';

  // Circular button - expands/collapses the card
  const toggle = document.createElement('button');
  toggle.className = 'device-output-settings-btn';
  toggle.innerHTML = '⚙️';
  toggle.setAttribute('aria-label', 'Toggle device switcher');
  toggle.id = 'device-output-settings-btn';
  toggle.onclick = () => toggleCard(card);

  // Settings button (top right corner) - opens settings panel
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'device-output-toggle';
  settingsBtn.innerHTML = '<span class="toggle-icon">⚙️</span>';
  settingsBtn.setAttribute('aria-label', 'Settings');
  settingsBtn.onclick = () => toggleSettings();

  // Card content
  const content = document.createElement('div');
  content.className = 'device-output-card-content';

  // Buttons container
  const buttonsContainer = document.createElement('div');
  buttonsContainer.className = 'device-output-buttons';

  // Create buttons for each device type
  Object.entries(DEVICE_CONFIG).forEach(([deviceType, config]) => {
    const button = createDeviceButton(deviceType, config);
    buttonsContainer.appendChild(button);
  });

  // Settings panel
  const settingsPanel = createSettingsPanel();

  // Error message container
  const errorContainer = document.createElement('div');
  errorContainer.className = 'device-output-error';
  errorContainer.id = 'device-output-error';
  errorContainer.textContent = '';

  // Assemble card
  content.appendChild(buttonsContainer);
  content.appendChild(settingsPanel);
  content.appendChild(errorContainer);
  card.appendChild(toggle);
  card.appendChild(settingsBtn);
  card.appendChild(content);

  return card;
}

/**
 * Create a device button element
 */
function createDeviceButton(deviceType, config) {
  const button = document.createElement('button');
  button.className = 'device-output-button';
  button.dataset.deviceType = deviceType;
  button.setAttribute('aria-label', `Switch to ${config.label} mode`);

  const emoji = document.createElement('span');
  emoji.className = 'emoji';
  emoji.textContent = config.emoji;

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = config.label;

  button.appendChild(emoji);
  button.appendChild(label);

  return button;
}

/**
 * Create the settings panel
 */
function createSettingsPanel() {
  const panel = document.createElement('div');
  panel.className = 'device-output-settings';
  panel.id = 'device-output-settings';

  // Input field
  const input = document.createElement('input');
  input.className = 'device-output-settings-input';
  input.type = 'text';
  input.placeholder = 'example.com';
  input.id = 'device-output-settings-input';

  // Actions container
  const actions = document.createElement('div');
  actions.className = 'device-output-settings-actions';

  // Add button
  const addBtn = document.createElement('button');
  addBtn.className = 'device-output-settings-btn-action primary';
  addBtn.textContent = 'Add';
  addBtn.id = 'device-output-add-btn';

  // Cancel button
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'device-output-settings-btn-action';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.onclick = () => toggleSettings();

  actions.appendChild(addBtn);
  actions.appendChild(cancelBtn);

  // Whitelist display
  const whitelist = document.createElement('div');
  whitelist.className = 'device-output-whitelist';
  whitelist.id = 'device-output-whitelist';

  const whitelistLabel = document.createElement('div');
  whitelistLabel.className = 'device-output-whitelist-label';
  whitelistLabel.textContent = 'Whitelisted domains:';

  const whitelistDomains = document.createElement('div');
  whitelistDomains.className = 'device-output-whitelist-domains';
  whitelistDomains.id = 'device-output-whitelist-domains';

  whitelist.appendChild(whitelistLabel);
  whitelist.appendChild(whitelistDomains);

  panel.appendChild(input);
  panel.appendChild(actions);
  panel.appendChild(whitelist);

  return panel;
}

/**
 * Toggle settings panel
 */
function toggleSettings() {
  const panel = document.getElementById('device-output-settings');
  if (panel) {
    panel.classList.toggle('open');
  }
}

/**
 * Update the whitelist display
 * @param {string[]} domains - Array of whitelisted domains
 */
function updateWhitelistDisplay(domains) {
  const whitelistContainer = document.getElementById('device-output-whitelist');
  const whitelistDomains = document.getElementById('device-output-whitelist-domains');

  if (!whitelistContainer || !whitelistDomains) return;

  // Clear existing domains
  whitelistDomains.innerHTML = '';

  if (domains.length === 0) {
    whitelistContainer.classList.remove('has-domains');
  } else {
    whitelistContainer.classList.add('has-domains');

    domains.forEach((domain) => {
      const domainEl = document.createElement('div');
      domainEl.className = 'device-output-whitelist-domain';
      domainEl.textContent = domain;

      const removeBtn = document.createElement('button');
      removeBtn.className = 'device-output-whitelist-domain-remove';
      removeBtn.textContent = '×';
      removeBtn.onclick = () => dispatchRemoveDomainEvent(domain);

      domainEl.appendChild(removeBtn);
      whitelistDomains.appendChild(domainEl);
    });
  }
}

/**
 * Add current domain to whitelist
 */
function addCurrentDomainToWhitelist() {
  const currentDomain = window.location.hostname;
  addDomainToWhitelist(currentDomain);
}

/**
 * Dispatch event to remove a domain from the whitelist
 * This function dispatches an event that is handled by content.js
 * @param {string} domain - Domain to remove
 */
function dispatchRemoveDomainEvent(domain) {
  const event = new CustomEvent('removeDomainFromWhitelist', { detail: domain });
  document.dispatchEvent(event);
}

/**
 * Toggle card collapsed state
 */
function toggleCard(card) {
  card.classList.toggle('collapsed');
}

/**
 * Show the card on the page
 */
function showCard() {
  // Remove existing card if present
  hideCard();

  const card = createCard();
  document.body.appendChild(card);
}

/**
 * Hide/remove the card from the page
 */
function hideCard() {
  const existingCard = document.getElementById('device-output-switcher');
  if (existingCard) {
    existingCard.remove();
  }
}

/**
 * Update the active state of device buttons
 */
function updateActiveDevice(deviceType) {
  const buttons = document.querySelectorAll('.device-output-button');
  buttons.forEach((button) => {
    if (button.dataset.deviceType === deviceType) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

/**
 * Show an error message
 */
function showError(message) {
  const errorContainer = document.getElementById('device-output-error');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.add('visible');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorContainer.classList.remove('visible');
    }, ERROR_HIDE_DELAY_MS);
  }
}

/**
 * Hide error message
 */
function hideError() {
  const errorContainer = document.getElementById('device-output-error');
  if (errorContainer) {
    errorContainer.classList.remove('visible');
  }
}

/**
 * Attach click handler to device buttons
 */
function attachButtonHandler(handler) {
  const buttons = document.querySelectorAll('.device-output-button');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      const deviceType = button.dataset.deviceType;
      handler(deviceType);
    });
  });
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    showCard,
    hideCard,
    updateActiveDevice,
    showError,
    hideError,
    attachButtonHandler,
    toggleCard,
    toggleSettings,
    updateWhitelistDisplay,
  };
}
