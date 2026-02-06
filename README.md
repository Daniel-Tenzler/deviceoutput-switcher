# Device Output Switcher

A Chrome extension that switches between device output modes (Desktop, Mobile, App) by managing cookies.

## How it works

The extension sets two cookies on the current domain: `deviceoutput` and `devicetype`. Both cookies are set to the same value (desktop, mobile, or app) and the page is reloaded to apply the changes.

The extension injects a floating UI card into the page with buttons to switch between device modes. It only activates on whitelisted domains.

## Permissions

- `activeTab` - Access the current tab
- `cookies` - Read and write cookies
- `storage` - Store domain whitelist
- `tabs` - Query and notify tabs of cookie changes
- `<all_urls>` - Access to all websites (limited by domain whitelist)

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the extension directory

## Usage

1. Navigate to a website where you want to switch device modes
2. Click the floating card that appears
3. Click a device type button (Desktop, Mobile, or App)
4. The page will reload with the new device cookies set

To manage the whitelist of domains where the extension activates:

1. Click the settings icon on the floating card
2. Add or remove domains from the list
3. Changes take effect immediately

## Architecture

```
manifest.json - Extension configuration
src/
  background/
    background.js - Service worker that handles chrome.cookies API
  content/
    content.js - Main entry point, orchestrates UI and cookie management
    cookie-manager.js - Cookie operations via background script
    storage-manager.js - Chrome storage API wrapper
    ui.js - Floating card UI creation and manipulation
    styles.css - UI styling
  shared/
    constants.js - Shared constants (device types, message types)
```

### Limitations

- The extension only works on domains that are explicitly whitelisted
- Each device change triggers a page reload
- Cookie behavior depends on how the target website interprets the `deviceoutput` and `devicetype` cookies
