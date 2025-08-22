// Content script to help with page detection and communication
// This script runs on all pages and can be used for future enhancements

// Function to detect if current page is EDS
function detectPageType() {
  const hostname = window.location.hostname;
  return {
    isEDS: hostname.includes('.aem.page') || hostname.includes('.aem.live'),
    url: window.location.href,
    hostname: hostname
  };
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getPageInfo') {
    sendResponse(detectPageType());
  }
  return true; // Keep message channel open for async response
});

// Optional: Add visual indicator (can be enabled in future versions)
function addPageIndicator() {
  const pageInfo = detectPageType();
  
  if (pageInfo.isEDS) {
    console.log('EDS Page Switcher: This is an EDS page');
  } else {
    console.log('EDS Page Switcher: This is an original website page');
  }
}

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', addPageIndicator);
} else {
  addPageIndicator();
}
