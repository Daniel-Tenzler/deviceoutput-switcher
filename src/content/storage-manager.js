// Storage Manager - handles chrome.storage operations for domain whitelist

const WHITELIST_KEY = 'domainWhitelist';

/**
 * Get the domain whitelist from storage
 * @returns {Promise<string[]>} Array of whitelisted domains
 */
async function getWhitelist() {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get([WHITELIST_KEY], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(result[WHITELIST_KEY] || []);
      }
    });
  });
}

/**
 * Save the domain whitelist to storage
 * @param {string[]} domains - Array of domains to whitelist
 * @returns {Promise<void>}
 */
async function saveWhitelist(domains) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [WHITELIST_KEY]: domains }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve();
      }
    });
  });
}

/**
 * Add a domain to the whitelist
 * @param {string} domain - Domain to add
 * @returns {Promise<string[]>} Updated whitelist
 */
async function addDomainToWhitelist(domain) {
  const whitelist = await getWhitelist();
  const normalizedDomain = normalizeDomain(domain);

  if (!whitelist.includes(normalizedDomain)) {
    whitelist.push(normalizedDomain);
    await saveWhitelist(whitelist);
  }

  return whitelist;
}

/**
 * Remove a domain from the whitelist
 * @param {string} domain - Domain to remove
 * @returns {Promise<string[]>} Updated whitelist
 */
async function removeDomainFromWhitelist(domain) {
  const whitelist = await getWhitelist();
  const normalizedDomain = normalizeDomain(domain);

  const updated = whitelist.filter((d) => d !== normalizedDomain);
  await saveWhitelist(updated);

  return updated;
}

/**
 * Normalize a domain for consistent storage
 * Removes protocol, www, and trailing slashes
 * @param {string} domain - Domain to normalize
 * @returns {string} Normalized domain
 */
function normalizeDomain(domain) {
  const normalized = domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '')
    .trim();

  // Allow localhost and single-label hostnames (e.g., localhost, myapp)
  if (normalized === 'localhost' || /^[a-z0-9-]+$/.test(normalized)) {
    return normalized;
  }

  // Validate standard domain format using regex (e.g., example.com, sub.example.co.uk)
  const domainPattern = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  if (!domainPattern.test(normalized)) {
    throw new Error(`Invalid domain format: "${domain}". Please enter a valid domain (e.g., example.com)`);
  }

  return normalized;
}

/**
 * Check if a domain is a subdomain of another domain
 * @param {string} subdomain - Potential subdomain (e.g., api.example.com)
 * @param {string} domain - Parent domain (e.g., example.com)
 * @returns {boolean} True if subdomain is a genuine subdomain of domain
 */
function isSubdomain(subdomain, domain) {
  const subParts = subdomain.split('.');
  const domParts = domain.split('.');

  // Subdomain must have at least one more part than parent
  if (subParts.length <= domParts.length) {
    return false;
  }

  // Check that the suffix matches exactly
  const subSuffix = subParts.slice(-domParts.length).join('.');
  return subSuffix === domain;
}

/**
 * Check if the current page's domain is in the whitelist
 * @returns {Promise<boolean>} True if current domain is whitelisted or whitelist is empty
 */
async function isCurrentDomainWhitelisted() {
  const whitelist = await getWhitelist();

  // If whitelist is empty, show on all pages
  if (whitelist.length === 0) {
    return true;
  }

  const currentDomain = normalizeDomain(window.location.hostname);

  // Check if current domain matches any whitelisted domain
  return whitelist.some((domain) => {
    // Exact match
    if (currentDomain === domain) {
      return true;
    }

    // Subdomain match (e.g., api.example.com matches example.com)
    // Use proper validation to prevent bypass (e.g., evilcom.example.com should NOT match example.com)
    if (isSubdomain(currentDomain, domain)) {
      return true;
    }

    return false;
  });
}

/**
 * Extract the root domain from a URL
 * @param {string} url - URL to extract domain from
 * @returns {string} Root domain
 */
function extractDomain(url) {
  return normalizeDomain(url);
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    getWhitelist,
    saveWhitelist,
    addDomainToWhitelist,
    removeDomainFromWhitelist,
    isCurrentDomainWhitelisted,
    normalizeDomain,
    extractDomain,
  };
}
