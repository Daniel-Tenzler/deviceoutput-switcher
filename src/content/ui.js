// UI Module - renders and manages the device switcher card

// Constants
const ERROR_HIDE_DELAY_MS = 5000;
const POSITION_STORAGE_KEY = 'deviceOutputSwitcherPosition';
const POSITION_SAVE_INTERVAL_MS = 1000;
const DRAG_START_THRESHOLD_PX = 3;

const DEVICE_CONFIG = {
  desktop: {
    icon: 'monitor',
    label: 'D',
  },
  mobile: {
    icon: 'smartphone',
    label: 'M',
  },
  app: {
    icon: 'layers',
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
  card.tabIndex = 0;
  card.setAttribute('aria-label', 'Device output switcher. Drag to reposition.');

  applyStoredCardPosition(card);
  makeCardDraggable(card);

  // Circular button - expands/collapses the card
  const toggle = document.createElement('button');
  toggle.className = 'device-output-settings-btn';
  toggle.innerHTML = '<i data-lucide="settings"></i>';
  toggle.setAttribute('aria-label', 'Toggle device switcher');
  toggle.id = 'device-output-settings-btn';
  toggle.onclick = () => toggleCard(card);

  // Settings button (top right corner) - opens whitelist panel
  const settingsBtn = document.createElement('button');
  settingsBtn.className = 'device-output-toggle';
  settingsBtn.innerHTML = '<i data-lucide="shield" class="toggle-icon"></i>';
  settingsBtn.setAttribute('aria-label', 'Whitelist');
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

function getStoredCardPosition() {
  try {
    const raw = window.localStorage.getItem(POSITION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    const { left, top } = parsed;
    if (!Number.isFinite(left) || !Number.isFinite(top)) {
      return null;
    }

    return { left, top };
  } catch {
    return null;
  }
}

function persistCardPosition(left, top) {
  try {
    window.localStorage.setItem(
      POSITION_STORAGE_KEY,
      JSON.stringify({ left, top })
    );
  } catch {
    // Ignore storage errors
  }
}

function applyStoredCardPosition(card) {
  const storedPosition = getStoredCardPosition();
  if (!storedPosition) return;

  card.style.left = `${storedPosition.left}px`;
  card.style.top = `${storedPosition.top}px`;
  card.style.right = 'auto';
  card.style.bottom = 'auto';
}

function setCardPosition(card, left, top) {
  card.style.left = `${left}px`;
  card.style.top = `${top}px`;
  card.style.right = 'auto';
  card.style.bottom = 'auto';
}

function keepCardInViewport(card) {
  const hasStoredPosition = Number.isFinite(parseFloat(card.style.left))
    && Number.isFinite(parseFloat(card.style.top));
  if (!hasStoredPosition) return;

  const rect = card.getBoundingClientRect();
  const { left, top } = clampCardPosition(rect.left, rect.top, card);
  setCardPosition(card, left, top);
  persistCardPosition(left, top);
}

function clampCardPosition(left, top, card) {
  const maxLeft = Math.max(0, window.innerWidth - card.offsetWidth);
  const maxTop = Math.max(0, window.innerHeight - card.offsetHeight);

  return {
    left: Math.min(Math.max(0, left), maxLeft),
    top: Math.min(Math.max(0, top), maxTop),
  };
}

function makeCardDraggable(card) {
  let pointerId = null;
  let startPointerX = 0;
  let startPointerY = 0;
  let startLeft = 0;
  let startTop = 0;
  let dragStarted = false;
  let lastSavedAt = 0;
  let suppressNextClick = false;
  let suppressClickTimer = null;
  let pendingLeft = 0;
  let pendingTop = 0;
  let rafId = null;
  let resizeTimer = null;

  const clearClickSuppression = () => {
    suppressNextClick = false;
    if (suppressClickTimer) {
      clearTimeout(suppressClickTimer);
      suppressClickTimer = null;
    }
  };

  const flushPendingPosition = () => {
    setCardPosition(card, pendingLeft, pendingTop);

    const now = Date.now();
    if (now - lastSavedAt >= POSITION_SAVE_INTERVAL_MS) {
      persistCardPosition(pendingLeft, pendingTop);
      lastSavedAt = now;
    }
  };

  const cleanupPointerListeners = () => {
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
  };

  const onPointerMove = (event) => {
    if (event.pointerId !== pointerId) return;

    const deltaX = event.clientX - startPointerX;
    const deltaY = event.clientY - startPointerY;
    const movedEnough = Math.abs(deltaX) > DRAG_START_THRESHOLD_PX
      || Math.abs(deltaY) > DRAG_START_THRESHOLD_PX;

    if (!dragStarted && !movedEnough) {
      return;
    }

    dragStarted = true;
    card.classList.add('dragging');

    const unclampedLeft = startLeft + deltaX;
    const unclampedTop = startTop + deltaY;
    const { left, top } = clampCardPosition(unclampedLeft, unclampedTop, card);
    pendingLeft = left;
    pendingTop = top;

    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        rafId = null;
        flushPendingPosition();
      });
    }
  };

  const onPointerUp = (event) => {
    if (event.pointerId !== pointerId) return;

    cleanupPointerListeners();

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
      flushPendingPosition();
    }

    if (dragStarted) {
      const left = parseFloat(card.style.left) || 0;
      const top = parseFloat(card.style.top) || 0;
      persistCardPosition(left, top);
      suppressNextClick = true;

      if (suppressClickTimer) {
        clearTimeout(suppressClickTimer);
      }

      suppressClickTimer = setTimeout(() => {
        suppressClickTimer = null;
        suppressNextClick = false;
      }, 0);
    }

    pointerId = null;
    dragStarted = false;
    card.classList.remove('dragging');
  };

  card.addEventListener('click', (event) => {
    if (!suppressNextClick) return;
    event.preventDefault();
    event.stopPropagation();
    clearClickSuppression();
  }, true);

  card.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;

    const target = event.target;
    if (target instanceof Element && target.closest('button, input, textarea, select')) {
      return;
    }

    const rect = card.getBoundingClientRect();
    pointerId = event.pointerId;
    startPointerX = event.clientX;
    startPointerY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    pendingLeft = startLeft;
    pendingTop = startTop;
    lastSavedAt = Date.now();
    dragStarted = false;

    clearClickSuppression();

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);
  });

  const onResize = () => {
    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }

    resizeTimer = setTimeout(() => {
      resizeTimer = null;
      keepCardInViewport(card);
    }, 120);
  };

  window.addEventListener('resize', onResize);

  card.addEventListener('keydown', (event) => {
    if (event.target !== card) return;

    const step = event.shiftKey ? 1 : 10;
    const rect = card.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;

    switch (event.key) {
      case 'ArrowLeft':
        left -= step;
        break;
      case 'ArrowRight':
        left += step;
        break;
      case 'ArrowUp':
        top -= step;
        break;
      case 'ArrowDown':
        top += step;
        break;
      default:
        return;
    }

    event.preventDefault();
    const clamped = clampCardPosition(left, top, card);
    setCardPosition(card, clamped.left, clamped.top);
    persistCardPosition(clamped.left, clamped.top);
  });

  const cleanup = () => {
    cleanupPointerListeners();

    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }

    if (resizeTimer) {
      clearTimeout(resizeTimer);
      resizeTimer = null;
    }

    window.removeEventListener('resize', onResize);

    clearClickSuppression();
    card.classList.remove('dragging');
    pointerId = null;
    dragStarted = false;
  };

  card.__dragCleanup = cleanup;
}

/**
 * Create a device button element
 */
function createDeviceButton(deviceType, config) {
  const button = document.createElement('button');
  button.className = 'device-output-button';
  button.dataset.deviceType = deviceType;
  button.setAttribute('aria-label', `Switch to ${config.label} mode`);

  const icon = document.createElement('i');
  icon.className = 'icon';
  icon.setAttribute('data-lucide', config.icon);

  const label = document.createElement('span');
  label.className = 'label';
  label.textContent = config.label;

  button.appendChild(icon);
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

  requestAnimationFrame(() => {
    if (document.body.contains(card)) {
      keepCardInViewport(card);
    }
  });

  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
}

/**
 * Hide/remove the card from the page
 */
function hideCard() {
  const existingCard = document.getElementById('device-output-switcher');
  if (existingCard) {
    if (typeof existingCard.__dragCleanup === 'function') {
      existingCard.__dragCleanup();
    }
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
