# 🤖 Galaxia AI Bots - Code Directory Overview

This folder contains the source code for the three independent AI chatbot assistants. It has been organized here to let you clearly view the logic, prompt instructions, and service pipelines for each bot.

---

## 📂 Folder Contents

### 1. Bot Entry Wrappers
These files demonstrate how each specific bot initializes, isolates its memory, and calls the central AI services with its own constraints:
* **[Bot1_DigitalDiaries_Assistant.js](file:///C:/Users/krish/OneDrive/Desktop/FINAL%20PROJ/GLX2CB/AI_Bots_Code/Bot1_DigitalDiaries_Assistant.js)**: Configures the Digital Diaries Wadala movie screenings assistant. Refuses staycation questions.
* **[Bot2_AmstelNest_Assistant.js](file:///C:/Users/krish/OneDrive/Desktop/FINAL%20PROJ/GLX2CB/AI_Bots_Code/Bot2_AmstelNest_Assistant.js)**: Configures the Amstel Nest Primary stays assistant. Boosts Amstel Nest search results.
* **[Bot3_Staycation_Assistant.js](file:///C:/Users/krish/OneDrive/Desktop/FINAL%20PROJ/GLX2CB/AI_Bots_Code/Bot3_Staycation_Assistant.js)**: Configures the general staycation assistant for all Karjat properties.

### 2. Core Service Libraries (Copies)
The shared engine components that power the bots:
* **[Core_ChatbotService.js](file:///C:/Users/krish/OneDrive/Desktop/FINAL%20PROJ/GLX2CB/AI_Bots_Code/Core_ChatbotService.js)**: Handles exact-match caching, bogus query filter, RAG search routing, and LLM completions.
* **[Core_PromptBuilder.js](file:///C:/Users/krish/OneDrive/Desktop/FINAL%20PROJ/GLX2CB/AI_Bots_Code/Core_PromptBuilder.js)**: Assembles the LLM prompts and enforces the strict tone rules (no emojis/slang, Hindi/Hinglish switching, non-coding support).
* **[Core_ConversationService.js](file:///C:/Users/krish/OneDrive/Desktop/FINAL%20PROJ/GLX2CB/AI_Bots_Code/Core_ConversationService.js)**: Separates session data in the database and runs context summarization.
* **[Core_KnowledgeService.js](file:///C:/Users/krish/OneDrive/Desktop/FINAL%20PROJ/GLX2CB/AI_Bots_Code/Core_KnowledgeService.js)**: Scans files from the Obsidian Vault (`GALAXIA1`) and implements the offline keyword search fallback.

---

## 🛠️ Where is the Active Code Running?
The active server code that runs when you launch the chatbot (via `pm2` or `node server.js`) is saved inside the Whatsapp Bot project directory:
👉 `C:\Users\krish\OneDrive\Desktop\FINAL PROJ\GLX2CB\galaxia-whatsapp-bot23\galaxia-whatsapp-bot2\services\ai\`

The server listens to the `/chat` endpoint and reads the `botType` request parameter to load the correct wrapper and context dynamically:
- `botType: "digital_diaries"` (or `"celebration"`) -> Triggers **Bot 1** logic.
- `botType: "amstel_nest"` -> Triggers **Bot 2** logic.
- `botType: "staycation"` -> Triggers **Bot 3** logic.
