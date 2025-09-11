// Global state variables
let storedAnswers = null;
let answersVisible = false;

// Main listener for all communication
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "load-answers") {
        console.log("Nightfury: Loading answers...");
        clearInjectedElements();
        const questions = parseForm();
        if (questions.length > 0) {
            chrome.runtime.sendMessage({ action: "fetchAnswers", questions: questions, apiKey: request.apiKey });
        } else {
            console.error("Nightfury: No questions found.");
        }
    } else if (request.action === "displayAnswers") {
        console.log("Nightfury: Received answers from background.", request.answers);
        storedAnswers = request.answers;
        answersVisible = true;
        displayAnswers(storedAnswers);
    } else if (request.action === "toggle-answers") {
        console.log("Nightfury: Toggling visibility.");
        toggleVisibility();
    }
});

/**
 * NEW: Parses both Multiple Choice and Short Answer questions.
 */
function parseForm() {
    const questionElements = document.querySelectorAll('.Qr7Oae');
    const questions = [];

    questionElements.forEach((el, index) => {
        const questionTextElement = el.querySelector('.M7eMe');
        if (!questionTextElement) return;

        const questionText = questionTextElement.textContent.trim();

        // Check for Multiple Choice options
        const optionsContainer = el.querySelector('.oyXaNc');
        if (optionsContainer) {
            const optionElements = optionsContainer.querySelectorAll('.aDTYNe');
            const options = Array.from(optionElements).map(optEl => optEl.textContent.trim()).filter(Boolean);
            if (options.length > 0) {
                questions.push({ id: `question-${index}`, type: 'mcq', questionText, options });
            }
            return; // Move to next question element
        }

        // Check for Short Answer input
        const shortAnswerContainer = el.querySelector('.RpC4Ne');
        if (shortAnswerContainer) {
            questions.push({ id: `question-${index}`, type: 'short_answer', questionText });
        }
    });
    return questions;
}

/**
 * NEW: Displays answers as simple, un-styled text below each question.
 */
function displayAnswers(answers) {
    const questionElements = document.querySelectorAll('.Qr7Oae');

    answers.forEach(answerData => {
        const questionIndex = parseInt(answerData.questionId.split('-')[1]);
        const questionElement = questionElements[questionIndex];
        if (!questionElement) return;

        const answerDiv = document.createElement('div');
        answerDiv.classList.add('nightfury-injected-element');

        // Style the injected text element
        answerDiv.style.marginTop = '12px';
        answerDiv.style.padding = '8px';
        answerDiv.style.fontWeight = 'bold';
        answerDiv.style.color = '#3c4043'; // Dark grey color
        answerDiv.style.whiteSpace = 'pre-wrap'; // Preserves newlines from Gemini for multi-answers
        answerDiv.style.fontSize = '14px';

        if (!answerData.answer || answerData.answer.includes('ERROR')) {
            console.error(`Failed to get answer for Question ${questionIndex}:`, answerData.answer);
            answerDiv.textContent = `▶ Error: Could not get suggestion.`;
            answerDiv.style.color = '#d93025'; // Google Red
        } else {
            answerDiv.textContent = `▶ ${answerData.answer}`;
        }
        
        questionElement.appendChild(answerDiv);
    });
}

function clearInjectedElements() {
    document.querySelectorAll('.nightfury-injected-element').forEach(el => el.remove());
}

function toggleVisibility() {
    if (!storedAnswers) {
        console.warn("Nightfury: Cannot toggle visibility, answers not loaded yet.");
        return;
    }
    answersVisible = !answersVisible;

    const answerElements = document.querySelectorAll('.nightfury-injected-element');
    answerElements.forEach(el => {
        el.style.display = answersVisible ? 'block' : 'none';
    });
}