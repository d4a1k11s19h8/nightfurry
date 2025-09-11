document.addEventListener('DOMContentLoaded', () => {
    const apiKeyInput = document.getElementById('apiKey');
    const saveButton = document.getElementById('save');
    const statusDiv = document.getElementById('status');

    // Load the saved API key when the options page is opened
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (result.geminiApiKey) {
            apiKeyInput.value = result.geminiApiKey;
        }
    });

    // Save the API key
    saveButton.addEventListener('click', () => {
        const apiKey = apiKeyInput.value;
        if (apiKey) {
            chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
                statusDiv.textContent = 'API Key saved!';
                setTimeout(() => {
                    statusDiv.textContent = '';
                }, 2000);
            });
        }
    });
});