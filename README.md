Here is a professional and comprehensive `README.md` for your project. You can create a file named `README.md` in your root folder and paste this content in.

-----

# 🦊 Nightfury - AI Google Forms Assistant

**Nightfury** is a powerful Chrome Extension that leverages Google's **Gemini AI** to analyze Google Forms and suggest answers in real-time. Designed for productivity and educational purposes, it parses form questions and unobtrusively marks the correct options directly on the page.

## ✨ Features

  * **🤖 AI-Powered:** Uses the latest Google Gemini Pro models to analyze questions.
  * **⚡ broad Support:** Handles various question types:
      * Multiple Choice (Radio buttons)
      * Checkboxes (Multiple answers)
      * Dropdowns
      * Linear Grids / Matrix questions
      * Short Answer / Paragraphs
  * **🎯 Precision UI:** Marks answers with a clean, non-intrusive dot (**●**) at the end of the correct option line.
  * **👀 Stealth Mode:** Toggle answer visibility instantly to keep your screen clean.
  * **🚀 Fast & Lightweight:** Asynchronous fetching with retry logic ensures the browser doesn't freeze.
  * **🔒 Secure:** Your API Key is stored locally in your browser via `chrome.storage.sync`.

## 🛠️ Prerequisites

1.  **Google Chrome** (or any Chromium-based browser like Brave, Edge).
2.  A **Google Gemini API Key**. You can get one for free at [Google AI Studio](https://aistudio.google.com/).

## 📥 Installation

Since this extension is in developer mode, you will need to load it manually:

1.  **Clone or Download** this repository to your computer.
2.  Open Chrome and navigate to `chrome://extensions/`.
3.  Toggle **Developer mode** in the top right corner.
4.  Click **Load unpacked** in the top left.
5.  Select the folder where you saved the Nightfury files.

## ⚙️ Configuration

Before using the extension, you must provide your API credentials:

1.  Click the **Nightfury extension icon** in your Chrome toolbar (you may need to pin it first).
2.  Select **Options** (or right-click the icon and choose "Options").
3.  Paste your **Gemini API Key** into the input field.
4.  Click **Save**.

## 🎮 Usage

1.  Open any **Google Form**.
2.  Use the following keyboard shortcuts:

| Shortcut | Action | Description |
| :--- | :--- | :--- |
| **Ctrl + Q** | **Load Answers** | Scans the form, sends questions to AI, and injects answers. |
| **Ctrl + X** | **Toggle Visibility** | Hides or shows the injected answer dots instantly. |

> **Note:** If the form is long, give the AI a few seconds to process all questions. Answers will appear sequentially.

## 🏗️ Technical Architecture

  * **Manifest V3:** Built using the latest Chrome Extension standards.
  * **Content Script:** DOM traversal to identify complex Google Forms structures (nested divs, grids, and dynamic class names).
  * **Background Service Worker:** Handles secure API calls to Google Generative Language API to prevent CORS issues.
  * **Error Handling:** Includes exponential backoff for API rate limits and silent failure modes to keep the UI clean.

## ⚠️ Disclaimer

**For Educational Purposes Only.**
This tool is designed to demonstrate the capabilities of Large Language Models (LLMs) in DOM parsing and context understanding. The developers are not responsible for any misuse of this tool in academic or professional assessments. Please use responsibly.

## 📄 License

[MIT License](https://www.google.com/search?q=LICENSE)
