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

    // Add mapping button (manual)
    document.getElementById('addMapping').addEventListener('click', () => {
      this.addMapping();
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

    // Enter key support
    ['originalDomain', 'edsDomain'].forEach(id => {
      document.getElementById(id).addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.addMapping();
        }
      });
    });

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
    const defaultExtension = document.getElementById('autoExtension').value;

    if (!originalUrl || !edsUrl) {
      this.showStatus('Please enter both sample URLs', 'error');
      return;
    }

    try {
      const originalDomain = new URL(originalUrl).hostname;
      const edsDomain = new URL(edsUrl).hostname;

      // Validate domains
      if (!this.isValidDomain(originalDomain) || !this.isValidDomain(edsDomain)) {
        this.showStatus('Invalid URLs provided', 'error');
        return;
      }

      // Add bidirectional mapping
      this.mappings.set(originalDomain.toLowerCase(), edsDomain.toLowerCase());
      this.mappings.set(edsDomain.toLowerCase(), originalDomain.toLowerCase());

      // Store extension preference if specified
      if (defaultExtension && defaultExtension !== '') {
        const extensionKey = `${edsDomain.toLowerCase()}->${originalDomain.toLowerCase()}-extension`;
        const extensionValue = defaultExtension === 'none' ? '' : defaultExtension;
        
        try {
          await chrome.storage.sync.set({ [extensionKey]: extensionValue });
        } catch (error) {
          console.error('Error saving extension preference:', error);
        }
      }

      // Clear inputs
      document.getElementById('sampleOriginalUrl').value = '';
      document.getElementById('sampleEdsUrl').value = '';
      document.getElementById('autoExtension').value = '';

      await this.saveMappings();
      this.renderMappings();
      this.showStatus(`✅ Successfully configured mapping: ${originalDomain} ↔ ${edsDomain}`, 'success');
    } catch (error) {
      this.showStatus('Error parsing URLs: ' + error.message, 'error');
    }
  }

  async addMapping() {
    const originalDomain = document.getElementById('originalDomain').value.trim();
    const edsDomain = document.getElementById('edsDomain').value.trim();
    const defaultExtension = document.getElementById('defaultExtension').value;

    if (!originalDomain || !edsDomain) {
      this.showStatus('Please enter both original and EDS domains', 'error');
      return;
    }

    // Clean up domains (remove protocol and paths)
    const cleanOriginal = this.cleanDomain(originalDomain);
    const cleanEds = this.cleanDomain(edsDomain);

    // Validate domains
    if (!this.isValidDomain(cleanOriginal) || !this.isValidDomain(cleanEds)) {
      this.showStatus('Please enter valid domain names', 'error');
      return;
    }

    // Add bidirectional mapping
    this.mappings.set(cleanOriginal, cleanEds);
    this.mappings.set(cleanEds, cleanOriginal);

    // Store extension preference if specified
    if (defaultExtension && defaultExtension !== '') {
      const extensionKey = `${cleanEds}->${cleanOriginal}-extension`;
      const extensionValue = defaultExtension === 'none' ? '' : defaultExtension;
      
      try {
        await chrome.storage.sync.set({ [extensionKey]: extensionValue });
      } catch (error) {
        console.error('Error saving extension preference:', error);
      }
    }

    // Clear inputs
    document.getElementById('originalDomain').value = '';
    document.getElementById('edsDomain').value = '';
    document.getElementById('defaultExtension').value = '';

    this.saveMappings();
    this.renderMappings();
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
