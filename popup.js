// Storage for domain mappings
let domainMappings = new Map();

// Load domain mappings from storage
async function loadDomainMappings() {
  try {
    const result = await chrome.storage.sync.get(['domainMappings']);
    if (result.domainMappings) {
      domainMappings = new Map(Object.entries(result.domainMappings));
      console.log('Loaded domain mappings:', Array.from(domainMappings.entries()));
    }
  } catch (error) {
    console.error('Error loading domain mappings:', error);
  }
}

// Function to determine if URL is an EDS page
function isEDSPage(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.includes('.aem.page') || urlObj.hostname.includes('.aem.live');
  } catch (e) {
    return false;
  }
}

// Function to convert URL using stored domain mappings with smart target selection
async function convertUrl(currentUrl) {
  try {
    const urlObj = new URL(currentUrl);
    const currentDomain = urlObj.hostname.toLowerCase();
    
    const isCurrentEDS = isEDSPage(currentUrl);
    let targetDomain;
    
    if (isCurrentEDS) {
      // Coming from EDS (.page or .live) → Go to original
      targetDomain = domainMappings.get(currentDomain);
    } else {
      // Coming from original → Smart EDS selection
      targetDomain = selectBestEDSTarget(currentDomain);
    }
    
    if (targetDomain) {
      let targetPath = urlObj.pathname;
      
      // Handle file extensions intelligently
      const isTargetEDS = targetDomain.includes('.aem.');
      
      if (!isCurrentEDS && isTargetEDS) {
        // Converting from original to EDS - remove common file extensions
        targetPath = removeFileExtension(targetPath);
      } else if (isCurrentEDS && !isTargetEDS) {
        // Converting from EDS to original - might need to add extension
        targetPath = await addFileExtensionIfNeeded(targetPath, currentDomain, targetDomain);
      }
      
      // Create the target URL with processed path
      return `https://${targetDomain}${targetPath}${urlObj.search}${urlObj.hash}`;
    }
    
    return null; // No mapping found
  } catch (e) {
    console.error('Error converting URL:', e);
    return null;
  }
}

// Smart function to select the best EDS target when coming from original site
function selectBestEDSTarget(originalDomain) {
  console.log('selectBestEDSTarget called with:', originalDomain);
  console.log('All domain mappings:', Array.from(domainMappings.entries()));
  
  // Get EDS targets for this original domain (stored as comma-separated string)
  const targetsString = domainMappings.get(originalDomain);
  
  if (!targetsString) {
    console.log('No targets found for domain:', originalDomain);
    return null;
  }
  
  // Parse comma-separated targets
  const possibleTargets = targetsString.split(',').map(target => target.trim());
  console.log('Found targets:', possibleTargets);
  
  if (possibleTargets.length === 0) {
    console.log('No targets found, returning null');
    return null;
  }
  
  if (possibleTargets.length === 1) {
    console.log('Only one target found:', possibleTargets[0]);
    return possibleTargets[0];
  }
   
  // If multiple targets available, prefer .live over .page
  // .live is typically the production environment
  const liveTarget = possibleTargets.find(target => target.includes('.aem.live'));
  if (liveTarget) {
    console.log('Selected .live target:', liveTarget);
    return liveTarget;
  }
  
  // Fallback to .page if .live not available
  const pageTarget = possibleTargets.find(target => target.includes('.aem.page'));
  if (pageTarget) {
    console.log('Fallback to .page target:', pageTarget);
    return pageTarget;
  }
  
  // Fallback to first available target
  console.log('Fallback to first target:', possibleTargets[0]);
  return possibleTargets[0];
}

// Function to remove common file extensions when going to EDS
function removeFileExtension(path) {
  // Common extensions to remove when converting to EDS
  const extensionsToRemove = ['.html', '.htm', '.php', '.aspx', '.jsp'];
  
  for (const ext of extensionsToRemove) {
    if (path.toLowerCase().endsWith(ext)) {
      return path.substring(0, path.length - ext.length);
    }
  }
  
  return path;
}

// Function to intelligently add file extension when going from EDS to original
async function addFileExtensionIfNeeded(path, currentDomain, targetDomain) {
  // Don't add extension if path already has one
  const hasExtension = /\.[a-zA-Z0-9]+$/.test(path);
  if (hasExtension) {
    return path;
  }
  
  // Don't add extension if path ends with slash (directory)
  if (path.endsWith('/')) {
    return path;
  }
  
  // Get stored extension preference for this domain mapping
  const extensionKey = `${currentDomain}->${targetDomain}-extension`;
  
  try {
    const result = await chrome.storage.sync.get([extensionKey]);
    const storedExtension = result[extensionKey];
    
    if (storedExtension !== undefined) {
      return path + storedExtension; // storedExtension could be '' for no extension
    }
  } catch (error) {
    console.error('Error loading extension preference:', error);
  }
  
  // Default extension based on common patterns
  // Most websites use .html for content pages
  return path + '.html';
}

// Function to update the popup UI
async function updatePopup(currentUrl) {
  const currentUrlElement = document.getElementById('currentUrl');
  const switchButton = document.getElementById('switchButton');
  const errorElement = document.getElementById('error');
  
  // Load domain mappings first
  await loadDomainMappings();
  
  currentUrlElement.textContent = currentUrl;
  
  const isEDS = isEDSPage(currentUrl);
  const targetUrl = await convertUrl(currentUrl);
  
  if (targetUrl) {
    // Immediate switch - redirect directly to target page
    chrome.tabs.update({ url: targetUrl });
    window.close();
    return;
  } else {
    switchButton.textContent = 'No Domain Mapping Found';
    switchButton.disabled = true;
    
    const currentDomain = new URL(currentUrl).hostname;
    errorElement.innerHTML = `
      No mapping found for domain: <strong>${currentDomain}</strong><br>
      <a href="#" id="openSettings" style="color: #007cba; text-decoration: underline;">Configure domain mappings</a>
    `;
    errorElement.style.display = 'block';
    
    // Add click handler for settings link
    document.getElementById('openSettings').addEventListener('click', (e) => {
      e.preventDefault();
      chrome.runtime.openOptionsPage();
      window.close();
    });
  }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Set up settings button
    document.getElementById('settingsButton').addEventListener('click', () => {
      chrome.runtime.openOptionsPage();
      window.close();
    });

    // Get current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab && tab.url) {
      await updatePopup(tab.url);
    } else {
      document.getElementById('error').textContent = 'Unable to get current tab URL';
      document.getElementById('error').style.display = 'block';
    }
  } catch (error) {
    console.error('Error initializing popup:', error);
    document.getElementById('error').textContent = 'Error initializing extension';
    document.getElementById('error').style.display = 'block';
  }
});
