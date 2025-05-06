// main.js - Entry point for the application

// Import modules
import { DataManager } from './modules/data-manager.js';
import { UIManager } from './modules/ui-manager.js';
import { PrintManager } from './modules/print-manager.js';
import { ExportManager } from './modules/export-manager.js';

// Main App Module (simplified from previous monolithic approach)
const KTECApp = (function() {
    // Module references
    let dataManager;
    let uiManager;
    let printManager;
    let exportManager;
    
    // Initialize the app
    function init() {
        // Initialize modules
        dataManager = new DataManager();
        uiManager = new UIManager(dataManager);
        printManager = new PrintManager(dataManager);
        exportManager = new ExportManager(dataManager);
        
        // Load data
        dataManager.loadData();
        
        // Setup UI
        uiManager.setupEventListeners();
        uiManager.setupCustomComponents();
        
        // Hide loading and show tool
        document.getElementById('loading').style.display = 'none';
        document.getElementById('tool-container').style.display = 'block';
    }
    
    // Return public API
    return {
        init: init
    };
})();

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    KTECApp.init();
});