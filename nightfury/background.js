// A helper function to pause execution
const delay = ms => new Promise(res => setTimeout(res, ms));

async function getGeminiAnswers(apiKey, questions) {
    const MODEL_NAME = "gemini-1.5-flash-latest";
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=`;

    const promises = questions.map(async (q) => {
        let prompt;

        // --- NEW: DYNAMIC PROMPT BASED ON QUESTION TYPE ---
        if (q.type === 'short_answer') {
            prompt = `You are an expert assistant. Provide a concise, direct answer for the following question. Do not add any extra commentary.\nQuestion: "${q.questionText}"\nAnswer:`;
        } else { // This handles MCQs (both single and multiple choice)
            prompt = `You are an expert quiz solver. Analyze the following multiple-choice question and determine the correct answer(s).
- If there is ONLY ONE correct answer, provide just its exact text.
- If there are MULTIPLE correct answers, list each correct answer on a new line.
- Do not add any extra explanation or commentary.

Question: "${q.questionText}"
Options:\n${q.options.map(opt => `- "${opt}"`).join('\n')}
Correct Answer(s):`;
        }

        const MAX_RETRIES = 3;
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            try {
                const response = await fetch(`${API_URL}${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 150 } })
                });

                const data = await response.json();

                if (response.ok) {
                    if (!data.candidates || data.candidates.length === 0) return { questionId: q.id, answer: `API_ERROR: Model returned no response.` };
                    return { questionId: q.id, answer: data.candidates[0].content.parts[0].text.trim() };
                }

                const errorMessage = data.error?.message || 'Unknown API error.';
                if (response.status === 429 || response.status === 503 || errorMessage.includes('overloaded')) {
                    console.warn(`Attempt ${attempt} failed. Retrying...`);
                    await delay(1000 * attempt);
                    continue;
                } else {
                    return { questionId: q.id, answer: `API_ERROR: ${errorMessage}` };
                }
            } catch (error) {
                console.error("Fetch Error:", error);
                if (attempt === MAX_RETRIES) return { questionId: q.id, answer: `FETCH_ERROR: ${error.message}` };
                await delay(1000 * attempt);
            }
        }
        return { questionId: q.id, answer: `API_ERROR: The model is overloaded. Please try again later.` };
    });

    return Promise.all(promises);
}

// The rest of the file remains the same...
chrome.commands.onCommand.addListener((command, tab) => {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (!result.geminiApiKey) { chrome.runtime.openOptionsPage(); } 
        else {
            chrome.tabs.sendMessage(tab.id, { action: command, apiKey: result.geminiApiKey });
        }
    });
});
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchAnswers") {
        getGeminiAnswers(request.apiKey, request.questions)
            .then(answers => {
                chrome.tabs.sendMessage(sender.tab.id, { action: "displayAnswers", answers: answers });
            });
        return true;
    }
});