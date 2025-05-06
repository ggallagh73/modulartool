// modules/export-manager.js - Handles exporting to Excel and config.js

export class ExportManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
    }
    
    // Function to export the current data to Excel
    exportToExcel() {
        // Create a new workbook
        const wb = XLSX.utils.book_new();
        
        // Prepare data for the worksheet
        const wsData = [];
        
        // Header row
        const headerRow = ['Code', 'Description', 'Type'];
        this.dataManager.buildData.forEach(build => {
            headerRow.push(build);
        });
        wsData.push(headerRow);
        
        // Data rows for each install code
        this.dataManager.installCodes.forEach(code => {
            const row = [];
            row.push(code.code);
            row.push(code.description);
            row.push(code.forAddon ? 'Add-On' : 'Required');
            
            // Mark compatible builds with an X
            this.dataManager.buildData.forEach(build => {
                if (code.compatibleBuilds && code.compatibleBuilds.includes(build)) {
                    row.push('X');
                } else {
                    row.push('');
                }
            });
            
            wsData.push(row);
        });
        
        // Create worksheet
        const ws = XLSX.utils.aoa_to_sheet(wsData);
        
        // Add worksheet to workbook
        XLSX.utils.book_append_sheet(wb, ws, 'KTEC Flint Install Codes');
        
        // Generate Excel file
        XLSX.writeFile(wb, 'KTEC_Flint_Install_Codes.xlsx');
    }
    
    // Function to generate config.js content from current data
    generateConfigJS() {
        // Create config object
        const configObject = this.dataManager.getConfigData();
        
        // Convert to formatted JavaScript
        let configJS = "// KTEC Flint Install Code Generator - Configuration\n";
        configJS += "// Generated on " + new Date().toLocaleString() + "\n\n";
        configJS += "const configData = " + JSON.stringify(configObject, null, 4) + ";";
        
        // Format arrays to be more readable
        configJS = configJS.replace(/"builds": \[/g, '"builds": [');
        configJS = configJS.replace(/"installCodes": \[/g, '"installCodes": [');
        configJS = configJS.replace(/"addons": \[/g, '"addons": [');
        configJS = configJS.replace(/"addonDescriptions": {/g, '"addonDescriptions": {');
        
        // Download the file
        const blob = new Blob([configJS], { type: 'text/javascript' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.js';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
        
        alert('Config file generated successfully! Replace your existing config.js with this file.');
    }
}