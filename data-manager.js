// modules/data-manager.js - Handles all data operations

export class DataManager {
    constructor() {
        // Private variables
        this.buildData = [];
        this.installCodes = [];
        this.addonData = [];
        this.selectedAddons = [];
        this.addonDescriptionsData = {}; // Object to store add-on descriptions
        this.customDescriptions = {};
        this.addonDescriptions = {};
        this.selectedBuild = null;
    }

    // Load data from localStorage or config
    loadData() {
        try {
            // Load saved custom descriptions
            const savedBuildDescriptions = localStorage.getItem('buildCustomDescriptions');
            if (savedBuildDescriptions) {
                this.customDescriptions = JSON.parse(savedBuildDescriptions);
            }
            
            const savedAddonDescriptions = localStorage.getItem('addonCustomDescriptions');
            if (savedAddonDescriptions) {
                this.addonDescriptions = JSON.parse(savedAddonDescriptions);
            }
            
            // Try to load saved data from localStorage
            if (localStorage.getItem('buildData')) {
                this.loadDataFromLocalStorage();
            } else if (typeof configData !== 'undefined') {
                // Store the configuration data if no localStorage data exists
                this.loadDataFromConfig();
            } else {
                // No config data, show message to upload Excel
                const uploadStatus = document.getElementById('upload-status');
                uploadStatus.textContent = 'Please upload an Excel file with build and install code data.';
                uploadStatus.style.color = 'blue';
            }
        } catch (e) {
            console.error('Error loading saved data:', e);
            this.customDescriptions = {};
            this.addonDescriptions = {};
            
            // Fall back to config data if localStorage fails
            if (typeof configData !== 'undefined') {
                this.loadDataFromConfig();
            }
        }
    }

    // Load data from localStorage
    loadDataFromLocalStorage() {
        try {
            this.buildData = JSON.parse(localStorage.getItem('buildData')) || [];
            this.installCodes = JSON.parse(localStorage.getItem('installCodes')) || [];
            this.addonData = JSON.parse(localStorage.getItem('addonData')) || [];
            this.addonDescriptionsData = JSON.parse(localStorage.getItem('addonDescriptionsData')) || {};
            
            const lastUpdated = localStorage.getItem('lastUpdated');
            if (lastUpdated) {
                const uploadStatus = document.getElementById('upload-status');
                uploadStatus.textContent = `Using saved data from: ${lastUpdated}`;
                uploadStatus.style.color = 'green';
            }
            
            console.log('Data loaded from localStorage successfully');
        } catch (e) {
            console.error('Error loading data from localStorage:', e);
            alert('There was an error loading your saved data. Falling back to default configuration.');
            
            // Fall back to config data if available
            if (typeof configData !== 'undefined') {
                this.loadDataFromConfig();
            }
        }
    }

    // Load data from config.js
    loadDataFromConfig() {
        // Store the configuration data
        this.buildData = configData.builds;
        this.installCodes = configData.installCodes;
        this.addonData = configData.addons;
        
        // Extract addon descriptions from config data if available
        if (configData.addonDescriptions) {
            this.addonDescriptionsData = configData.addonDescriptions;
        } else {
            // Otherwise, build addon descriptions from install codes
            this.addonDescriptionsData = {};
            this.installCodes.forEach(code => {
                if (code.forAddon) {
                    this.addonDescriptionsData[code.forAddon] = code.description || '';
                }
            });
        }
    }

    // Process Excel data
    processExcelData(workbook) {
        // Assume the first sheet contains the data
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert sheet to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length < 3) {
            throw new Error('Invalid Excel format. Not enough rows.');
        }
        
        // First row should have headers with "Code", "Description", "Type", and build numbers
        const headerRow = jsonData[0];
        
        // Find column indices
        const codeColIndex = headerRow.findIndex(cell => cell && cell.toString().trim().toLowerCase() === 'code');
        const descColIndex = headerRow.findIndex(cell => cell && cell.toString().trim().toLowerCase() === 'description');
        const typeColIndex = headerRow.findIndex(cell => cell && cell.toString().trim().toLowerCase() === 'type');
        
        if (codeColIndex === -1 || descColIndex === -1 || typeColIndex === -1) {
            throw new Error('Required columns (Code, Description, Type) not found in the Excel file.');
        }
        
        // Extract build numbers from header row (after the Type column)
        const buildNumbers = [];
        for (let i = typeColIndex + 1; i < headerRow.length; i++) {
            if (headerRow[i] && headerRow[i].toString().trim() !== '') {
                buildNumbers.push(headerRow[i].toString().trim());
            }
        }
        
        if (buildNumbers.length === 0) {
            throw new Error('No build numbers found in the Excel file.');
        }
        
        // Extract install codes and compatibility info
        const installCodesData = [];
        const addonsData = new Set();
        const addonDescriptionsObj = {};
        
        // Process data rows (starting from row 2)
        for (let rowIdx = 1; rowIdx < jsonData.length; rowIdx++) {
            const row = jsonData[rowIdx];
            
            // Skip empty rows
            if (!row || !row[codeColIndex] || row[codeColIndex].toString().trim() === '') {
                continue;
            }
            
            const code = row[codeColIndex].toString().trim();
            const description = row[descColIndex] ? row[descColIndex].toString().trim() : '';
            const type = row[typeColIndex] ? row[typeColIndex].toString().trim() : '';
            
            // Determine if this is an addon code
            const isAddon = type === 'Add-On';
            let addonName = null;
            
            if (isAddon) {
                // Use the code as the addon name for simplicity
                addonName = code;
                addonsData.add(addonName);
                // Store the description for the add-on
                addonDescriptionsObj[addonName] = description;
            }
            
            // Determine compatible builds
            const compatibleBuilds = [];
            for (let i = 0; i < buildNumbers.length; i++) {
                const cellValue = row[typeColIndex + 1 + i];
                // Any non-empty cell value (including checkboxes which might be TRUE/FALSE or 1/0)
                // Consider it compatible if the value exists and is not explicitly empty, "FALSE", "0", or "No"
                if (cellValue !== undefined && 
                    cellValue !== null && 
                    cellValue.toString().trim() !== '' && 
                    cellValue.toString().trim().toLowerCase() !== 'false' && 
                    cellValue.toString().trim() !== '0' && 
                    cellValue.toString().trim().toLowerCase() !== 'no') {
                    compatibleBuilds.push(buildNumbers[i]);
                }
            }
            
            // Create the install code object
            const installCodeObj = {
                code: code,
                description: description,
                compatibleBuilds: compatibleBuilds
            };
            
            if (isAddon) {
                installCodeObj.forAddon = addonName;
            }
            
            installCodesData.push(installCodeObj);
        }
        
        // Update the data variables
        this.buildData = buildNumbers;
        this.installCodes = installCodesData;
        this.addonData = Array.from(addonsData);
        this.addonDescriptionsData = addonDescriptionsObj;
        
        // Save the data to localStorage for persistence
        this.saveDataToLocalStorage();
    }

    // Save data to localStorage
    saveDataToLocalStorage() {
        try {
            localStorage.setItem('buildData', JSON.stringify(this.buildData));
            localStorage.setItem('installCodes', JSON.stringify(this.installCodes));
            localStorage.setItem('addonData', JSON.stringify(this.addonData));
            localStorage.setItem('addonDescriptionsData', JSON.stringify(this.addonDescriptionsData));
            localStorage.setItem('lastUpdated', new Date().toString());
            console.log('Data saved to localStorage successfully');
        } catch (e) {
            console.error('Error saving data to localStorage:', e);
            alert('There was an error saving your data. This might be due to storage limits or privacy settings in your browser.');
        }
    }

    // Save build custom description
    saveBuildDescription(buildNumber, description) {
        this.customDescriptions[buildNumber] = description;
        try {
            localStorage.setItem('buildCustomDescriptions', JSON.stringify(this.customDescriptions));
        } catch (e) {
            console.error('Error saving descriptions:', e);
        }
    }

    // Save addon custom description
    saveAddonDescription(addon, description) {
        this.addonDescriptions[addon] = description;
        try {
            localStorage.setItem('addonCustomDescriptions', JSON.stringify(this.addonDescriptions));
        } catch (e) {
            console.error('Error saving addon descriptions:', e);
        }
    }

    // Select a build
    selectBuild(buildNumber) {
        this.selectedBuild = buildNumber;
    }

    // Get the selected build
    getSelectedBuild() {
        return this.selectedBuild;
    }

    // Get install codes for a specific build
    getInstallCodesForBuild(buildNumber) {
        // Filter to only show required codes that are compatible with the selected build
        return this.installCodes.filter(code => 
            !code.forAddon && // Not an addon code
            code.compatibleBuilds && 
            code.compatibleBuilds.includes(buildNumber)
        );
    }

    // Add an addon to selected addons
    addAddon(addon) {
        if (!this.selectedAddons.includes(addon)) {
            this.selectedAddons.push(addon);
        }
    }

    // Remove an addon from selected addons
    removeAddon(addon) {
        this.selectedAddons = this.selectedAddons.filter(item => item !== addon);
    }

    // Get selected addons
    getSelectedAddons() {
        return this.selectedAddons;
    }

    // Reset selection
    resetSelection() {
        this.selectedBuild = null;
        this.selectedAddons = [];
    }

    // Clear saved data
    clearSavedData() {
        try {
            // Clear only the app data, keep user notes
            localStorage.removeItem('buildData');
            localStorage.removeItem('installCodes');
            localStorage.removeItem('addonData');
            localStorage.removeItem('addonDescriptionsData');
            localStorage.removeItem('lastUpdated');
        } catch (e) {
            console.error('Error clearing data:', e);
            throw new Error('Failed to clear saved data');
        }
    }

    // Generate config data object for export
    getConfigData() {
        return {
            builds: this.buildData,
            installCodes: this.installCodes,
            addons: this.addonData,
            addonDescriptions: this.addonDescriptionsData
        };
    }
}