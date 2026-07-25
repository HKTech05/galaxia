# Project Guidelines & Rules for GLX2CB

## Primary Project & Architecture Context
- **Chatbot V2 Engine & Widget**: Located at `mainchatbotgalaxia/`.
  - Main Server: `server.js` (Express API for `/chat`, `/webhook`, `/widget`).
  - Client Test Interface: `widget/test.html` (served at root `/` or `/widget/test.html`).
  - Widget Engine: `widget/galaxia-chat.js` and `widget/galaxia-chat.css`.

## Deployment Rules
- **Testing Interface Deployment**:
  - When the user asks to deploy the chatbot or test interface for client testing, ALWAYS deploy `mainchatbotgalaxia/`.
  - The live Vercel project is `galaxia-whatsapp-bot2` (`https://galaxia-whatsapp-bot2.vercel.app`).
  - Root URL (`/`) MUST render `widget/test.html` directly without any login or authentication screens.
- **Scope Restriction**:
  - DO NOT deploy or touch the Next.js admin app in `GLX2/FRONTEND/galaxia` unless the user explicitly asks for the full Next.js property management portal.
