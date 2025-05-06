// modules/ui-manager.js - Handles UI interactions and display

export class UIManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        
        // DOM Elements
        this.elements = {
            loadingElement: document.getElementById('loading'),
            toolContainer: document.getElementById('tool-container'),
            buildSearchInput: document.getElementById('build-search'),
            codeSearchInput: document.getElementById('code-search'),
            addonSearchInput: document.getElementById('addon-search'),
            resultContainer: document.getElementById('result'),
            selectedBuildNumber: document.getElementById('selected-build-number'),
            buildDescriptionTextarea: document.getElementById('build-description'),
            selectedAddonsList: document.getElementById('selected-addons-list'),
            resetButton: document.getElementById('reset'),
            printButton: document.getElementById('print'),
            exportButton: document.getElementById('export-excel'),
            excelUpload: document.getElementById('excel-upload'),
            uploadStatus: document.getElementById('upload-status'),
            closePrintButton: document.getElementById('close-print')
        };
    }

    // Set up all event listeners
    setupEventListeners() {
        // Set up Excel file upload listener
        this.elements.excelUpload.addEventListener('change', this.handleExcelUpload.bind(this));
        
        // Set up Clear Saved Data button
        const clearSavedDataButton = document.getElementById('clear-saved-data');
        if (clearSavedDataButton) {
            clearSavedDataButton.addEventListener('click', this.clearSavedData.bind(this));
        }
        
        // Set up event listeners for filters
        this.elements.buildSearchInput.addEventListener('input', this.populateBuildsTable.bind(this));
        this.elements.codeSearchInput.addEventListener('input', this.filterInstallCodes.bind(this));
        this.elements.addonSearchInput.addEventListener('input', this.populateAddonsTable.bind(this));
        
        // Save custom description when it changes
        this.elements.buildDescriptionTextarea.addEventListener('input', this.handleBuildDescriptionChange.bind(this));
        
        // Set up reset button
        this.elements.resetButton.addEventListener('click', this.resetSelection.bind(this));
        
        // Set up print button
        this.elements.printButton.addEventListener('click', () => {
            const printManager = new PrintManager(this.dataManager);
            printManager.preparePrintView();
        });
        
        // Set up export button
        if (this.elements.exportButton) {
            this.elements.exportButton.addEventListener('click', () => {
                const exportManager = new ExportManager(this.dataManager);
                exportManager.exportToExcel();
            });
        }
        
        // Set up print view close button
        this.elements.closePrintButton.addEventListener('click', function() {
            document.getElementById('print-container').style.display = 'none';
        });
        
        // Set up actual print button
        document.getElementById('actual-print').addEventListener('click', function() {
            window.print();
        });
    }

    // Setup additional UI components
    setupCustomComponents() {
        // Add config.js export button
        this.addConfigExportButton();
    }

    // Function to add config.js export button
    addConfigExportButton() {
        // Create a container for the export config button
        const exportContainer = document.createElement('div');
        exportContainer.className = 'form-group';
        exportContainer.innerHTML = `
            <h3>Export Current Data as Permanent Configuration</h3>
            <p>After uploading and processing an Excel file, use this button to generate a new config.js file.</p>
            <div style="margin-top: 10px;">
                <button id="export-config-js" class="print-button">Generate config.js</button>
            </div>
        `;
        
        // Insert it after the Excel upload section
        const excelSection = document.querySelector('.form-group');
        excelSection.parentNode.insertBefore(exportContainer, excelSection.nextSibling);
        
        // Add event listener
        document.getElementById('export-config-js').addEventListener('click', () => {
            const exportManager = new ExportManager(this.dataManager);
            exportManager.generateConfigJS();
        });
    }

    // Handle Excel file upload
    handleExcelUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        this.elements.uploadStatus.textContent = 'Reading file...';
        
        const reader = new FileReader();
        const self = this;
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                // Process the Excel data
                self.dataManager.processExcelData(workbook);
                
                self.elements.uploadStatus.textContent = 'File processed successfully and data saved for future use!';
                self.elements.uploadStatus.style.color = 'green';
                
                // Display notification that data is now saved
                alert('Your data has been successfully loaded and saved. You will not need to upload the file again unless you want to update the data.');
                
                // Populate tables
                self.populateBuildsTable();
                self.populateAddonsTable();
            } catch (error) {
                console.error('Error processing Excel file:', error);
                self.elements.uploadStatus.textContent = 'Error processing file. Please check the format.';
                self.elements.uploadStatus.style.color = 'red';
            }
        };
        
        reader.onerror = function() {
            self.elements.uploadStatus.textContent = 'Error reading file.';
            self.elements.uploadStatus.style.color = 'red';
        };
        
        reader.readAsArrayBuffer(file);
    }

    // Handle build description change
    handleBuildDescriptionChange() {
        const selectedBuildNumberText = this.elements.selectedBuildNumber.textContent;
        if (selectedBuildNumberText) {
            this.dataManager.saveBuildDescription(
                selectedBuildNumberText, 
                this.elements.buildDescriptionTextarea.value
            );
        }
    }

    // Function to populate builds table with filtering
    populateBuildsTable() {
        const buildsTableBody = document.querySelector('#builds-table tbody');
        buildsTableBody.innerHTML = '';
        
        // Get filter value
        const searchTerm = this.elements.buildSearchInput.value.toLowerCase();
        
        // Filter and populate builds
        const filteredBuilds = this.dataManager.buildData.filter(build => 
            build.toLowerCase().includes(searchTerm)
        );
        
        if (filteredBuilds.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="2">No builds found matching your search.</td>';
            buildsTableBody.appendChild(row);
            return;
        }
        
        filteredBuilds.forEach(build => {
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${build}</td>
                <td>
                    <button class="select-build" data-build="${build}">
                        Select
                    </button>
                </td>
            `;
            
            buildsTableBody.appendChild(row);
        });
        
        // Add event listeners to select buttons
        document.querySelectorAll('.select-build').forEach(button => {
            button.addEventListener('click', this.handleBuildSelection.bind(this));
        });
    }

    // Handle build selection
    handleBuildSelection(event) {
        const buildNumber = event.currentTarget.getAttribute('data-build');
        this.selectBuild(buildNumber);
    }

    // Function to select a build and show compatible install codes
    selectBuild(buildNumber) {
        // Set selected build info
        this.elements.selectedBuildNumber.textContent = buildNumber;
        this.dataManager.selectBuild(buildNumber);
        
        // Check for custom description
        if (this.dataManager.customDescriptions[buildNumber]) {
            this.elements.buildDescriptionTextarea.value = this.dataManager.customDescriptions[buildNumber];
        } else {
            this.elements.buildDescriptionTextarea.value = '';
        }
        
        // Populate install codes table
        this.populateInstallCodesTable(buildNumber);
        
        // Show result container
        this.elements.resultContainer.style.display = 'block';
        
        // Highlight selected build in the table
        document.querySelectorAll('#builds-table tbody tr').forEach(row => {
            row.classList.remove('highlight');
            
            const rowBuildNumber = row.cells[0].textContent;
            if (rowBuildNumber === buildNumber) {
                row.classList.add('highlight');
            }
        });
        
        // Scroll to results
        this.elements.resultContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Function to populate install codes table based on selected build
    populateInstallCodesTable(buildNumber) {
        const codesTableBody = document.querySelector('#codes-table tbody');
        codesTableBody.innerHTML = '';
        
        // Get required codes for this build
        const requiredCodes = this.dataManager.getInstallCodesForBuild(buildNumber);
        
        if (requiredCodes.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3">No required install codes found for this build.</td>';
            codesTableBody.appendChild(row);
            return;
        }
        
        requiredCodes.forEach(code => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${code.code}</td>
                <td>${code.description}</td>
                <td class="compatible">✓ Required</td>
            `;
            
            // Add highlight class to all rows since they're all required
            row.classList.add('highlight');
            
            codesTableBody.appendChild(row);
        });
        
        // Apply any existing filter
        this.filterInstallCodes();
    }

    // Function to filter install codes based on search input
    filterInstallCodes() {
        const searchTerm = this.elements.codeSearchInput.value.toLowerCase();
        const rows = document.querySelectorAll('#codes-table tbody tr');
        
        rows.forEach(row => {
            if (row.cells.length < 2) return; // Skip message rows
            
            const code = row.cells[0].textContent.toLowerCase();
            const description = row.cells[1].textContent.toLowerCase();
            const isMatch = code.includes(searchTerm) || description.includes(searchTerm);
            
            row.style.display = isMatch ? '' : 'none';
        });
    }

    // Function to populate add-ons table with filtering
    populateAddonsTable() {
        const addonsTableBody = document.querySelector('#addons-table tbody');
        addonsTableBody.innerHTML = '';
        
        // Get filter value
        const searchTerm = this.elements.addonSearchInput.value.toLowerCase();
        
        // Filter and populate add-ons
        const filteredAddons = this.dataManager.addonData.filter(addon => 
            addon.toLowerCase().includes(searchTerm) || 
            (this.dataManager.addonDescriptionsData[addon] && 
             this.dataManager.addonDescriptionsData[addon].toLowerCase().includes(searchTerm))
        );
        
        if (filteredAddons.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="3">No add-ons found matching your search.</td>';
            addonsTableBody.appendChild(row);
            return;
        }
        
        filteredAddons.forEach(addon => {
            const row = document.createElement('tr');
            row.className = 'addon-row';
            
            // Check if this add-on is already selected
            const isSelected = this.dataManager.selectedAddons.includes(addon);
            if (isSelected) {
                row.classList.add('selected');
            }
            
            // Get description for this add-on
            const description = this.dataManager.addonDescriptionsData[addon] || '';
            
            row.innerHTML = `
                <td>${addon}</td>
                <td>${description}</td>
                <td>
                    <button class="${isSelected ? 'reset-button' : 'select-build'}" data-addon="${addon}">
                        ${isSelected ? 'Remove' : 'Add'}
                    </button>
                </td>
            `;
            
            addonsTableBody.appendChild(row);
        });
        
        // Add event listeners to add/remove buttons
        document.querySelectorAll('#addons-table button').forEach(button => {
            button.addEventListener('click', this.handleAddonToggle.bind(this));
        });
    }

    // Handle addon toggle (add/remove)
    handleAddonToggle(event) {
        const addon = event.currentTarget.getAttribute('data-addon');
        if (this.dataManager.selectedAddons.includes(addon)) {
            this.removeAddon(addon);
        } else {
            this.addAddon(addon);
        }
    }

    // Function to add an add-on
    addAddon(addon) {
        this.dataManager.addAddon(addon);
        this.updateSelectedAddonsList();
        this.populateAddonsTable();
    }

    // Function to remove an add-on
    removeAddon(addon) {
        this.dataManager.removeAddon(addon);
        this.updateSelectedAddonsList();
        this.populateAddonsTable();
    }

    // Function to update the selected add-ons list display
    updateSelectedAddonsList() {
        const selectedAddons = this.dataManager.getSelectedAddons();
        
        if (selectedAddons.length === 0) {
            this.elements.selectedAddonsList.innerHTML = '<p class="no-addons">No add-ons selected</p>';
            return;
        }
        
        this.elements.selectedAddonsList.innerHTML = '';
        
        selectedAddons.forEach(addon => {
            const addonItem = document.createElement('div');
            addonItem.className = 'addon-item';
            
            // Get the addon notes or create new ones from the description
            // If there are no saved notes yet, use the addon description as a starting point
            if (!this.dataManager.addonDescriptions[addon] && this.dataManager.addonDescriptionsData[addon]) {
                this.dataManager.addonDescriptions[addon] = this.dataManager.addonDescriptionsData[addon];
                this.dataManager.saveAddonDescription(addon, this.dataManager.addonDescriptionsData[addon]);
            }
            
            let addonNotes = this.dataManager.addonDescriptions[addon] || '';
            
            addonItem.innerHTML = `
                <h4>${addon}</h4>
                <button class="remove-addon" data-addon="${addon}">×</button>
                <div class="editable-description">
                    <label for="addon-notes-${addon.replace(/\s+/g, '-')}"><strong>Notes:</strong></label>
                    <textarea id="addon-notes-${addon.replace(/\s+/g, '-')}" 
                        data-addon="${addon}" 
                        placeholder="Add your notes for this add-on...">${addonNotes}</textarea>
                </div>
            `;
            
            this.elements.selectedAddonsList.appendChild(addonItem);
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-addon').forEach(button => {
            button.addEventListener('click', event => {
                const addon = event.currentTarget.getAttribute('data-addon');
                this.removeAddon(addon);
            });
        });
        
        // Add event listeners to textarea changes
        document.querySelectorAll('[id^="addon-notes-"]').forEach(textarea => {
            textarea.addEventListener('input', event => {
                const addon = event.currentTarget.getAttribute('data-addon');
                this.dataManager.saveAddonDescription(addon, event.currentTarget.value);
            });
        });
    }

    // Function to reset selection
    resetSelection() {
        // Reset data selection
        this.dataManager.resetSelection();
        
        // Hide result container
        this.elements.resultContainer.style.display = 'none';
        
        // Clear search inputs
        this.elements.buildSearchInput.value = '';
        this.elements.codeSearchInput.value = '';
        this.elements.addonSearchInput.value = '';
        
        // Update the selected add-ons list
        this.updateSelectedAddonsList();
        
        // Remove highlights
        document.querySelectorAll('#builds-table tbody tr').forEach(row => {
            row.classList.remove('highlight');
        });
        
        // Refresh builds table
        this.populateBuildsTable();
        this.populateAddonsTable();
    }

    // Function to clear saved data
    clearSavedData() {
        if (confirm('Are you sure you want to clear all saved data? You will need to upload an Excel file again.')) {
            try {
                this.dataManager.clearSavedData();
                
                // Reload the page to start fresh
                window.location.reload();
            } catch (e) {
                console.error('Error clearing data:', e);
                alert('There was an error clearing the saved data.');
            }
        }
    }