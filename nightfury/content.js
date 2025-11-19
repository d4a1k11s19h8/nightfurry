// =============================================
// 🦊 Nightfury Google Forms Content Script (2025)
// =============================================

let storedAnswers = null;
let answersVisible = false;

// ---------------------------------------------
// Listen for background messages
// ---------------------------------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "load-answers") {
    console.log("Nightfury: Loading answers...");

    clearInjectedElements();
    storedAnswers = []; 
    answersVisible = true; 
    
    const questions = parseForm();
    if (questions.length > 0) {
      chrome.runtime.sendMessage({ action: "fetchAnswers", questions, apiKey: request.apiKey });
    } else {
      console.error("Nightfury: No questions found.");
    }

  } else if (request.action === "displaySingleAnswer") {
    const answer = request.answer;
    console.log(`Nightfury: Received answer for ${answer.questionId}`, answer);

    if (!storedAnswers) storedAnswers = [];
    
    const idx = storedAnswers.findIndex(a => a.questionId === answer.questionId);
    if (idx !== -1) storedAnswers[idx] = answer;
    else storedAnswers.push(answer);

    displaySingleAnswer(answer);

  } else if (request.action === "toggle-answers") {
    toggleVisibility();
  }
});

// ---------------------------------------------
// Utility functions (Unchanged)
// ---------------------------------------------
function getVisibleText(el) {
  if (!el) return '';
  const a = el.getAttribute && el.getAttribute('aria-label');
  if (a && a.trim()) return a.trim();
  const txt = (el.innerText || el.textContent || '').trim();
  if (txt) return txt;
  return '';
}

function findQuestionText(root) {
  const qEl1 = root.querySelector('.M7eMe');
  if (qEl1) return getVisibleText(qEl1);

  const heading = root.querySelector('[role="heading"], [data-params], [data-question-title]');
  if (heading) return getVisibleText(heading);

  const children = Array.from(root.querySelectorAll('*'));
  let best = '';
  for (const c of children) {
    const t = getVisibleText(c);
    if (t.length > best.length && t.length < 500) best = t;
  }
  if (best) return best;

  return getVisibleText(root).split('\n').map(s => s.trim()).find(Boolean) || '';
}

function collectLabelsFromNodes(nodes) {
  const labels = [];
  for (const n of nodes) {
    let text = n.getAttribute && n.getAttribute('aria-label');
    const by = n.getAttribute && n.getAttribute('aria-labelledby');
    if (!text && by) {
      const ref = document.getElementById(by);
      text = ref ? (ref.innerText || ref.textContent || '').trim() : '';
    }
    if (!text) text = (n.innerText || n.textContent || '').trim();
    if (!text && n.parentElement) {
      const sib = n.parentElement.querySelector('span, label, div');
      if (sib) text = (sib.innerText || sib.textContent || '').trim();
    }
    if (text && !labels.includes(text)) labels.push(text);
  }
  return labels;
}

// ---------------------------------------------
// Core: Parse Form (Unchanged)
// ---------------------------------------------
function parseForm() {
  const questionEls = Array.from(document.querySelectorAll('.Qr7Oae'));
  const questions = [];

  questionEls.forEach((el, idx) => {
    const qText = findQuestionText(el) || `question-${idx}`;

    // Grid / Matrix
    if (el.querySelector('[role="grid"], [role="table"], .freebirdFormviewerViewItemsGridRoot')) {
      const colNodes = Array.from(el.querySelectorAll('[role="columnheader"], .freebirdFormviewerViewItemsGridColumnHeader'));
      const cols = collectLabelsFromNodes(colNodes);
      if (cols.length) {
        questions.push({ id: `question-${idx}`, type: 'grid', questionText: qText, options: cols });
        return;
      }
    }

    // Listbox
    const listbox = el.querySelector('[role="listbox"], [role="list"]');
    if (listbox) {
      const opts = Array.from(listbox.querySelectorAll('[role="option"], [role="listitem"], option'));
      const labels = collectLabelsFromNodes(opts);
      if (labels.length) {
        questions.push({ id: `question-${idx}`, type: 'listbox', questionText: qText, options: labels });
        return;
      }
    }

    // Radio (MCQ)
    const radiogroup = el.querySelector('[role="radiogroup"]');
    if (radiogroup) {
      const opts = Array.from(radiogroup.querySelectorAll('[role="radio"], [role="option"]'));
      const labels = collectLabelsFromNodes(opts);
      if (labels.length) {
        questions.push({ id: `question-${idx}`, type: 'mcq', questionText: qText, options: labels });
        return;
      }
    }

    // Checkboxes
    const checkboxGroup = el.querySelector('[role="group"], .quantumWizTogglePapercheckbox');
    if (checkboxGroup) {
      const opts = Array.from(checkboxGroup.querySelectorAll('[role="checkbox"], input[type="checkbox"], [data-value], label'));
      const labels = collectLabelsFromNodes(opts);
      if (labels.length) {
        questions.push({ id: `question-${idx}`, type: 'checkboxes', questionText: qText, options: labels });
        return;
      }
    }

    // Dropdown
    const sel = el.querySelector('select');
    if (sel) {
      const opts = Array.from(sel.options || [])
        .map(o => (o.textContent || o.innerText || '').trim())
        .filter(Boolean);
      if (opts.length) {
        questions.push({ id: `question-${idx}`, type: 'dropdown', questionText: qText, options: opts });
        return;
      }
    }

    // Short / Paragraph
    const input = el.querySelector('input[type="text"], input[type="email"], input[type="number"]');
    const textarea = el.querySelector('textarea');
    if (textarea) {
      questions.push({ id: `question-${idx}`, type: 'paragraph', questionText: qText });
      return;
    }
    if (input) {
      questions.push({ id: `question-${idx}`, type: 'short_answer', questionText: qText });
      return;
    }

    // Hidden DataParams Question
    const dp = el.querySelector('div[jsmodel="CP1olw"][data-params]');
    if (dp) {
      const raw = dp.getAttribute('data-params');
      const matches = [...raw.matchAll(/&quot;([^&]+?)&quot;/g)].map(m => m[1])
        .filter(t => t.length < 100 && !t.match(/null|false|true|@|js|id/));
      if (matches.length > 1) {
        questions.push({ id: `question-${idx}`, type: 'mcq', questionText: qText, options: matches });
        return;
      }
    }

    // Fallback
    const genericOpts = el.querySelectorAll('[role="option"], [role="checkbox"], [role="radio"], option, label');
    const anyLabels = collectLabelsFromNodes(Array.from(genericOpts).slice(0, 50));
    if (anyLabels.length) {
      const hasRadio = el.querySelector('[role="radio"]');
      const typ = hasRadio ? 'mcq' : 'checkboxes';
      questions.push({ id: `question-${idx}`, type: typ, questionText: qText, options: anyLabels });
      return;
    }

    questions.push({ id: `question-${idx}`, type: 'unknown', questionText: qText, options: [] });
  });

  console.log("Parsed questions:", questions);
  return questions.filter(q => q);
}

// ---------------------------------------------
// Display a SINGLE answer
// ---------------------------------------------
function displaySingleAnswer(answerData) {
  const questionEls = document.querySelectorAll('.Qr7Oae');
  const index = parseInt(answerData.questionId.split('-')[1]);
  const questionEl = questionEls[index];
  if (!questionEl) return;

  // ERROR HANDLING: Only log to console, do not show on screen
  if (!answerData.answer || answerData.answer.includes("ERROR")) {
    console.error(`❌ Failed Q${index}:`, answerData.answer);
    return;
  }
  
  // ----- Helper Functions -----
  function findVisualLabel(optNode, labelText) {
    if (!optNode) return null;
    const insideCandidates = optNode.querySelectorAll('span, div, label');
    for (const c of insideCandidates) {
      const t = (c.getAttribute && c.getAttribute('aria-label')) || (c.textContent || '').trim();
      if (!t) continue;
      if (labelText && (t.trim().toLowerCase() === labelText || t.trim().toLowerCase().includes(labelText))) return c;
    }
    const parent = optNode.parentElement;
    if (parent) {
      for (const sib of parent.children) {
        if (sib === optNode) continue;
        const t = (sib.getAttribute && sib.getAttribute('aria-label')) || (sib.textContent || '').trim();
        if (!t) continue;
        if (labelText && (t.trim().toLowerCase() === labelText || t.trim().toLowerCase().includes(labelText))) return sib;
      }
      const sibLabel = parent.querySelector('span, label, div');
      if (sibLabel && (sibLabel.textContent || sibLabel.getAttribute && sibLabel.getAttribute('aria-label'))) return sibLabel;
    }
    return optNode;
  }
  
  function makeIndicator() {
    const dot = document.createElement('span');
    dot.classList.add('nightfury-injected-element', 'nightfury-indicator');
    dot.textContent = '.';
    
    Object.assign(dot.style, {
        color: '#000',
        fontWeight: 'bold',
        fontSize: '14px',
        marginLeft: '10px',
        float: 'right',
        zIndex: '999'
    });
    
    if (!answersVisible) {
      dot.style.display = 'none';
    }
    return dot;
  }
  
  function makeAnswerDiv(text) {
     const div = document.createElement('div');
     div.classList.add('nightfury-injected-element');
     div.textContent = text;
     Object.assign(div.style, { marginTop: '4px', fontSize: '10px', color: '#000', fontFamily: 'Arial, sans-serif' });
     
     if (!answersVisible) {
       div.style.display = 'none';
     }
     return div;
  }
  // ----- End Helper Functions -----

  const answersList = (answerData.answer || '')
    .split(/\r?\n|;|,/)
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.toLowerCase());

  // --------------------
  // MCQ / Checkboxes
  // --------------------
  if (["mcq", "checkboxes"].includes(answerData.type)) {
    const markedContainers = new Set();
    const optionNodes = Array.from(questionEl.querySelectorAll('[role="radio"], [role="checkbox"], [role="option"], label, [data-value]'));
    
    optionNodes.forEach(opt => {
      const labelCandidates = [
        (opt.getAttribute && opt.getAttribute('aria-label')) || '',
        (opt.getAttribute && opt.getAttribute('data-value')) || '',
        (opt.textContent || '').trim()
      ].map(t => (t || '').toString().trim()).filter(Boolean);
      const labelText = (labelCandidates[0] || labelCandidates[1] || labelCandidates[2] || '').toLowerCase();
      const matched = answersList.some(ans =>
        labelText === ans || labelText.includes(ans) || ans.includes(labelText)
      );

      if (matched) {
        const parentContainer = opt.closest('[role="listitem"], [role="radio"], [role="checkbox"]') || opt.parentElement;
        
        if (markedContainers.has(parentContainer)) {
            return;
        }
        
        markedContainers.add(parentContainer);

        const visual = findVisualLabel(opt, labelText) || opt;
        
        if (!visual.querySelector || !visual.querySelector('.nightfury-indicator')) {
          const indicator = makeIndicator();
          try {
            if (visual.appendChild) visual.appendChild(indicator);
            else if (visual.parentElement) visual.parentElement.insertBefore(indicator, visual.nextSibling);
          } catch (e) {
            if (opt.appendChild) opt.appendChild(indicator);
          }
        }
      }
    });
    return;
  }

  // --------------------
  // Dropdown / Listbox
  // --------------------
  if (["dropdown", "listbox"].includes(answerData.type)) {
    const listContainer = questionEl.querySelector('select, [role="listbox"], [role="list"]');
    if (!listContainer) return;

    const optionEls = Array.from(listContainer.querySelectorAll('[role="option"], [data-value], option'));
    if (optionEls.length) {
      optionEls.forEach(opt => {
        const lab = (opt.getAttribute && (opt.getAttribute('aria-label') || opt.getAttribute('data-value')) ) || opt.textContent || '';
        const labLower = (lab || '').trim().toLowerCase();
        const matched = answersList.some(ans => labLower === ans || labLower.includes(ans) || ans.includes(labLower));
        if (matched) {
          const visual = findVisualLabel(opt, labLower) || opt;
          if (!visual.querySelector || !visual.querySelector('.nightfury-indicator')) {
            const indicator = makeIndicator();
            try { visual.appendChild(indicator); } catch(e) { opt.appendChild(indicator); }
          }
        }
      });
    }
    const txtDiv = makeAnswerDiv(answerData.answer);
    listContainer.parentElement.appendChild(txtDiv);
    return;
  }

  // --------------------
  // Short / Paragraph
  // --------------------
  if (["short_answer", "paragraph"].includes(answerData.type)) {
    const target = questionEl.querySelector('input[type="text"], textarea');
    if (target) {
      const div = makeAnswerDiv(answerData.answer);
      target.parentElement.appendChild(div);
    }
    return;
  }

  // --------------------
  // Fallback
  // --------------------
  const fallbackDiv = makeAnswerDiv(answerData.answer);
  questionEl.appendChild(fallbackDiv);
}


// ---------------------------------------------
// Utilities (Unchanged)
// ---------------------------------------------
function clearInjectedElements() {
  document.querySelectorAll('.nightfury-injected-element').forEach(el => el.remove());
}

function toggleVisibility() {
  if (!storedAnswers) {
    console.warn("Nightfury: No answers to toggle.");
    return;
  }
  answersVisible = !answersVisible; 
  
  document.querySelectorAll('.nightfury-injected-element').forEach(el => {
    el.style.display = answersVisible ? '' : 'none';
  });
}
