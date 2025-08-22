// Settings page JavaScript for managing domain mappings

class DomainMappingManager {
  constructor() {
    this.mappings = new Map();
    this.init();
  }

  async init() {
    await this.loadMappings();
    this.setupEventListeners();
    this.renderMappings();
  }

  async loadMappings() {
    try {
      const result = await chrome.storage.sync.get(['domainMappings']);
      if (result.domainMappings) {
        this.mappings = new Map(Object.entries(result.domainMappings));
      }
    } catch (error) {
      console.error('Error loading mappings:', error);
    }
  }



  async saveMappings() {
    try {
      const mappingsObj = Object.fromEntries(this.mappings);
      await chrome.storage.sync.set({ domainMappings: mappingsObj });
      this.showStatus('Mappings saved successfully!', 'success');
    } catch (error) {
      console.error('Error saving mappings:', error);
      this.showStatus('Error saving mappings: ' + error.message, 'error');
    }
  }

  setupEventListeners() {
    // Auto-configure button (main quick setup)
    document.getElementById('extractAndAdd').addEventListener('click', () => {
      this.autoConfigureMapping();
    });





    // Export mappings
    document.getElementById('exportMappings').addEventListener('click', () => {
      this.exportMappings();
    });

    // Import mappings
    document.getElementById('importMappings').addEventListener('click', () => {
      document.getElementById('fileInput').click();
    });

    document.getElementById('fileInput').addEventListener('change', (e) => {
      this.importMappings(e.target.files[0]);
    });

    // Clear all
    document.getElementById('clearAll').addEventListener('click', () => {
      this.clearAllMappings();
    });

    // Enter key support for Quick Setup
    ['sampleOriginalUrl', 'sampleEdsUrl'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.autoConfigureMapping();
        }
      });
    });
  }

  async autoConfigureMapping() {
    const originalUrl = document.getElementById('sampleOriginalUrl').value.trim();
    const edsUrl = document.getElementById('sampleEdsUrl').value.trim();

    if (!originalUrl || !edsUrl) {
      this.showStatus('Please enter both sample URLs', 'error');
      return;
    }

    try {
      const originalUrlObj = new URL(originalUrl);
      const edsUrlObj = new URL(edsUrl);
      const originalDomain = originalUrlObj.hostname;
      const edsDomain = edsUrlObj.hostname;

      // Validate domains
      if (!this.isValidDomain(originalDomain) || !this.isValidDomain(edsDomain)) {
        this.showStatus('Invalid URLs provided', 'error');
        return;
      }

      // Auto-detect file extension from the original URL
      const originalPath = originalUrlObj.pathname;
      const detectedExtension = this.detectFileExtension(originalPath);

      // Add bidirectional mapping with auto .page/.live domains
      const edsTargets = [edsDomain.toLowerCase()];
      
      // Auto-add complementary domain
      if (edsDomain.includes('.aem.page')) {
        const liveDomain = edsDomain.replace('.aem.page', '.aem.live');
        edsTargets.push(liveDomain.toLowerCase());
      } else if (edsDomain.includes('.aem.live')) {
        const pageDomain = edsDomain.replace('.aem.live', '.aem.page');
        edsTargets.push(pageDomain.toLowerCase());
      }
      
      // Store all EDS targets for the original domain
      for (const target of edsTargets) {
        this.mappings.set(target, originalDomain.toLowerCase());
        
        // Store extension preference for each EDS domain
        if (detectedExtension) {
          const extensionKey = `${target}->${originalDomain.toLowerCase()}-extension`;
          try {
            await chrome.storage.sync.set({ [extensionKey]: detectedExtension });
          } catch (error) {
            console.error('Error saving extension preference:', error);
          }
        }
      }
      
      // Store all EDS targets as a comma-separated string for the original domain
      this.mappings.set(originalDomain.toLowerCase(), edsTargets.join(','));



      // Clear inputs
      document.getElementById('sampleOriginalUrl').value = '';
      document.getElementById('sampleEdsUrl').value = '';

      await this.saveMappings();
      this.renderMappings();
      
      let statusMessage = `✅ Successfully configured mapping: ${originalDomain}`;
      if (edsTargets.length > 1) {
        statusMessage += `\n✅ Auto-added both .page and .live domains`;
      }
      statusMessage += `\n🎯 EDS targets: ${edsTargets.join(', ')}`;
      if (detectedExtension) {
        statusMessage += `\n🔧 Auto-detected file extension: ${detectedExtension}`;
      }
      this.showStatus(statusMessage, 'success');
    } catch (error) {
      this.showStatus('Error parsing URLs: ' + error.message, 'error');
    }
  }

  // Helper method to detect file extension from URL path
  detectFileExtension(path) {
    const commonExtensions = ['.html', '.htm', '.php', '.aspx', '.jsp'];
    
    for (const ext of commonExtensions) {
      if (path.toLowerCase().endsWith(ext)) {
        return ext;
      }
    }
    
    // Check for any file extension pattern
    const extensionMatch = path.match(/(\.[a-zA-Z0-9]+)$/);
    if (extensionMatch) {
      return extensionMatch[1];
    }
    
    return null; // No extension detected
  }







  cleanDomain(domain) {
    return domain.replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  }

  isValidDomain(domain) {
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]*[a-zA-Z0-9]$/;
    return domainRegex.test(domain) && domain.includes('.');
  }

  renderMappings() {
    const container = document.getElementById('mappingsList');
    
    // Get unique pairs (avoid showing both directions)
    const uniquePairs = new Map();
    for (const [domain1, domain2] of this.mappings) {
      const isEDS1 = domain1.includes('.aem.');
      const isEDS2 = domain2.includes('.aem.');
      
      if (!isEDS1 && isEDS2) {
        // domain1 is original, domain2 is EDS
        uniquePairs.set(domain1, domain2);
      }
    }

    if (uniquePairs.size === 0) {
      container.innerHTML = '<div class="empty-state">No domain mappings configured yet. Add your first mapping above.</div>';
      return;
    }

    const html = Array.from(uniquePairs.entries()).map(([original, eds], index) => `
      <div class="mapping-item">
        <div class="mapping-info">
          <div class="mapping-original">${original}</div>
          <div class="mapping-eds">↔ ${eds}</div>
        </div>
        <div class="mapping-actions">
          <button class="button small danger" data-original="${original}" data-eds="${eds}">Delete</button>
        </div>
      </div>
    `).join('');

    container.innerHTML = html;

    // Add event listeners for delete buttons
    container.querySelectorAll('.button.danger').forEach(button => {
      button.addEventListener('click', (e) => {
        const original = e.target.getAttribute('data-original');
        const eds = e.target.getAttribute('data-eds');
        if (confirm(`Are you sure you want to delete the mapping:\n${original} ↔ ${eds}?`)) {
          this.deleteMapping(original, eds);
        }
      });
    });
  }

  deleteMapping(original, eds) {
    this.mappings.delete(original);
    this.mappings.delete(eds);
    this.saveMappings();
    this.renderMappings();
  }

  exportMappings() {
    const data = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      mappings: Object.fromEntries(this.mappings)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'eds-domain-mappings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus('Mappings exported successfully!', 'success');
  }

  async importMappings(file) {
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (data.mappings) {
        const importedMappings = new Map(Object.entries(data.mappings));
        
        // Merge with existing mappings
        for (const [key, value] of importedMappings) {
          this.mappings.set(key, value);
        }

        await this.saveMappings();
        this.renderMappings();
        this.showStatus(`Imported ${importedMappings.size} mappings successfully!`, 'success');
      } else {
        this.showStatus('Invalid file format', 'error');
      }
    } catch (error) {
      this.showStatus('Error importing file: ' + error.message, 'error');
    }

    // Reset file input
    document.getElementById('fileInput').value = '';
  }

  clearAllMappings() {
    if (confirm('Are you sure you want to clear all domain mappings? This cannot be undone.')) {
      this.mappings.clear();
      this.saveMappings();
      this.renderMappings();
    }
  }

  showStatus(message, type) {
    const statusEl = document.getElementById('statusMessage');
    statusEl.textContent = message;
    statusEl.className = `status-message ${type}`;
    statusEl.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);
  }
}

// Initialize the manager when page loads
let mappingManager;
document.addEventListener('DOMContentLoaded', () => {
  mappingManager = new DomainMappingManager();
});
