const delay = ms => new Promise(res => setTimeout(res, ms));

/**
 * Gets an answer for a SINGLE question.
 */
async function getGeminiAnswer(apiKey, q) {
    // 1. Use "gemini-2.5-pro" as requested
    const MODEL_NAME = "gemini-2.5-pro"; 
    //const MODEL_NAME = "gemini-3-pro-preview"; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=`;
    
    let prompt;
    if (q.type === 'short_answer' || q.type === 'paragraph') {
        prompt = `You are an expert assistant. Provide a concise, direct answer for the following question. Do not add any extra commentary.\nQuestion: "${q.questionText}"\nAnswer:`;
    } else if (q.type === 'dropdown' || q.type === 'listbox' || q.type === 'grid') {
        prompt = `You are an expert quiz solver. Analyze the following question and determine the correct answer(s).
Provide ONLY the exact text of the correct option(s), nothing else.

Question: "${q.questionText}"
Options:\n${q.options.map(opt => `- "${opt}"`).join('\n')}
Correct Answer(s):`;
    } else {
        // MCQ, checkboxes
        prompt = `You are an expert quiz solver. Analyze the following multiple-choice question and determine the correct answer(s).
- If there is ONLY ONE correct answer, provide just its exact text.
- If there are MULTIPLE correct answers, list each correct answer on a new line.
- Do not add any extra explanation or commentary.

Question: "${q.questionText}"
Options:\n${q.options.map(opt => `- "${opt}"`).join('\n')}
Correct Answer(s):`;
    }

    const MAX_RETRIES = 3;
    let answerData = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            const response = await fetch(`${API_URL}${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 102400 } })
            });
            const data = await response.json();
            
            // Debug log
            console.log(`Nightfury DEBUG (Question: ${q.id}, Attempt: ${attempt}): Full API Response:`, data);

            if (response.ok) {
                const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
                if (text) {
                    answerData = { questionId: q.id, type: q.type, answer: text };
                } else {
                    answerData = { questionId: q.id, type: q.type, answer: `API_ERROR: Model returned empty/invalid response. Full data: ${JSON.stringify(data)}` };
                }
                break; // Success!
            }
            
            const errorMessage = data.error?.message || 'Unknown API error.';
            answerData = { questionId: q.id, type: q.type, answer: `API_ERROR: ${errorMessage}` };
            
            if (response.status === 429 || response.status === 503 || errorMessage.includes('overloaded')) {
                console.warn(`Attempt ${attempt} for question "${q.questionText.substring(0,20)}..." failed. Retrying...`);
                await delay(1000 * attempt);
            } else {
                break;
            }

        } catch (error) {
            console.error("Fetch Error:", error);
            answerData = { questionId: q.id, type: q.type, answer: `FETCH_ERROR: ${error.message}` };
            if (attempt < MAX_RETRIES) await delay(1000 * attempt);
        }
    }
    return answerData;
}

chrome.commands.onCommand.addListener((command, tab) => {
    chrome.storage.sync.get(['geminiApiKey'], (result) => {
        if (!result.geminiApiKey) { 
            chrome.runtime.openOptionsPage(); 
        } else {
            chrome.tabs.sendMessage(tab.id, { action: command, apiKey: result.geminiApiKey });
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "fetchAnswers") {
        (async () => {
            // *** THIS IS THE NEW FIX ***
            // We wrap the entire loop in a try...catch block
            try {
                for (const q of request.questions) {
                    const answerData = await getGeminiAnswer(request.apiKey, q);
                    
                    chrome.tabs.sendMessage(sender.tab.id, { action: "displaySingleAnswer", answer: answerData });
                    
                    // Use a safe delay to respect your 100 RPM quota
                    await delay(2000); 
                }
            } catch (err) {
                // This will log the hidden error
                console.error("Nightfury: CRITICAL ERROR in main loop. Loop stopped.", err);
            }
            // *** END OF FIX ***
        })();
        
        return true; 
    }
});
