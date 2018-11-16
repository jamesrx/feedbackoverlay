const settingsForm = document.getElementById('settings');

function displaySettings(data) {
    const settings = data.settings;

    for (key in settings) {
        const inputs = document.querySelectorAll('input[name=' + key + ']');

        if (Array.isArray(settings[key])) {
            inputs.forEach(input => {
                if (settings[key].includes(input.value)) {
                    input.setAttribute('checked', 'true');
                }
            });
        } else {
            const input = inputs[0];

            if (input.type === 'checkbox') {
                input.setAttribute('checked', 'true');
            } else {
                input.value = settings[key];
            }
        }
    }
}

function saveSettings() {
    const formData = new FormData(settingsForm);
    const settings = {};
    
    for (const key of formData.keys()) {
        let value;
        
        if (key === 'domains') {
            value = formData.getAll(key);
        } else {
            value = formData.get(key);
        }
        
        settings[key] = value;
    }
    
    chrome.storage.local.set({ settings: settings });
}

chrome.storage.local.get('settings', displaySettings);
settingsForm.addEventListener('change', saveSettings);