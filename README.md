# EDS Page Switcher Chrome Extension

A Chrome extension that allows you to easily switch between original website pages and their corresponding EDS (Edge Delivery Services) pages.

## Features

- **User-Configured Mappings**: Set up your domain pairs once in settings
- **One-Click Switching**: Switch between original and EDS versions with a single click
- **Generic Support**: Works with any website after configuring domain mappings
- **Persistent Settings**: Domain mappings are saved and synced across devices
- **Easy Setup**: Multiple ways to configure mappings (manual entry, URL extraction, auto-detection)

## Examples

### Original → EDS
- `https://www.cmegroup.com/education/brochures-and-handbooks/bloomberg-user-guide-cme-fx-futures.html`
- → `https://main--www--cmegroup.aem.page/education/brochures-and-handbooks/bloomberg-user-guide-cme-fx-futures.html`

### EDS → Original
- `https://main--www--cmegroup.aem.page/education/brochures-and-handbooks/bloomberg-user-guide-cme-fx-futures`
- → `https://www.cmegroup.com/education/brochures-and-handbooks/bloomberg-user-guide-cme-fx-futures`

## Installation

### 🚀 Quick Install (2 minutes)

1. **Download**: 
   - Click the green "Code" button above → "Download ZIP"
   - Extract the ZIP file

2. **Install in Chrome**:
   - Open `chrome://extensions/` in Chrome
   - Enable "Developer mode" (top-right toggle)
   - Click "Load unpacked" → Select the extracted folder
   - Done! ✅

3. **Pin Extension** (optional):
   - Click puzzle piece icon (🧩) in Chrome toolbar
   - Pin "Edge Delivery Services Switcher"

📖 **Detailed guide**: See [INSTALL_GUIDE.md](INSTALL_GUIDE.md) for step-by-step instructions with screenshots.

### Alternative Methods

### Method 2: Package and Install

1. **Package the Extension**:
   - Go to `chrome://extensions/`
   - Click "Pack extension"
   - Select the `eds-switcher` folder
   - This creates a `.crx` file

2. **Install the Package**:
   - Drag and drop the `.crx` file onto the extensions page
   - Click "Add extension" when prompted

## Usage

### First Time Setup

1. **Install the extension** (see Installation section below)

2. **Configure your domain mappings**:
   - Click the extension icon and then "⚙️ Configure Domain Mappings"
   - OR right-click the extension icon and select "Options"

3. **Add your domain pairs** using one of these methods:
   - **Quick Setup**: Enter original domain (e.g., `www.cmegroup.com`) and EDS domain (e.g., `main--www--cmegroup.aem.page`)
   - **URL Extraction**: Paste sample URLs from both sites and extract the domains automatically
   - **Auto-detect**: Enter one domain and let the extension try to generate the other

### Daily Usage

1. **Navigate to any configured website** 

2. **Click the extension icon** in the Chrome toolbar

3. **Click the switch button**:
   - If on original website: Shows "Open EDS Page"
   - If on EDS page: Shows "Open Original Website"
   - If domain not configured: Shows link to settings

4. **The target page opens** in a new tab

## Supported URL Patterns

### Original Website URLs
- `https://www.example.com/path`
- `https://subdomain.example.com/path`

### EDS URLs
- `https://main--www--example.aem.page/path`
- `https://branch--site--org.aem.page/path`
- `https://main--www--example.aem.live/path`

## Technical Details

### URL Conversion Logic

**Original → EDS:**
- Extracts domain components from original URL
- Maps `www` subdomain to `main` branch
- Creates EDS format: `branch--site--org.aem.page`

**EDS → Original:**
- Parses EDS hostname pattern
- Reconstructs original domain structure
- Maps `main` branch back to `www` subdomain

### Files Structure

```
eds-switcher/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup interface
├── popup.js           # Popup logic and URL conversion
├── content.js         # Content script for page detection
├── icon16.png         # 16x16 icon
├── icon48.png         # 48x48 icon
├── icon128.png        # 128x128 icon
└── README.md          # This file
```

## Troubleshooting

### Extension not working?
1. Make sure Developer mode is enabled
2. Reload the extension from `chrome://extensions/`
3. Check the browser console for errors

### URL conversion not working?
1. Verify the URL follows supported patterns
2. Check that the target domain exists
3. Some custom domain configurations may not be supported

### No button appears?
1. The extension needs `activeTab` permission
2. Try refreshing the page and opening the extension again

## Development

To modify this extension:

1. **Make changes** to the source files
2. **Reload the extension**:
   - Go to `chrome://extensions/`
   - Click the refresh icon on the "EDS Page Switcher" card
3. **Test your changes** on various websites

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the MIT License.
