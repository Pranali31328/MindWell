# Migrate AI Mental Health Chatbot to Full Stack Web App

We are upgrading the "MindWell - AI based Mental Health Chatbot for working professionals" from a single-file, client-side-only prototype into a fully functional, robust Full-Stack Web Application. 

To achieve "database and all", we will replace the current `localStorage` storage mechanism with a real backend and a robust database so you can persist user accounts, chat logs, and emotional analytics over time.

> [!NOTE]
> The current project consists of `index.html`, `styles.css`, and a bulky 1970-line `app.txt`. We will completely modernize this architecture.

## User Review Required

> [!IMPORTANT]
> Please review the chosen technology stack. I propose the following to provide a great balance of modern features and ease of use:
> - **Frontend**: React (via Vite) for a blazing fast UI, separating components logically.
> - **Backend**: Express.js (Node.js) for handling API requests.
> - **Database**: SQLite (via Prisma ORM) because it requires zero complex setup (no external server required), making it perfect for your academic project.
> - **AI Integration**: Would you like to connect a real LLM (like Gemini, Groq, or OpenAI) for the backend, or should we continue to use the current simulated/mock AI responses in the chatbot? 

## Proposed Changes

---

### Phase 1: Project Initialization & Re-structuring

We will convert the current directory into a modern Node.js workspace.

#### [NEW] Vite React Frontend
- We'll initialize a new Vite project in the directory `e:\MINOR`.
- The current `app.txt` will be broken down and migrated into modular React components under `src/components/` (e.g., `ChatInterface.jsx`, `Dashboard.jsx`, `Onboarding.jsx`, `LoadingScreen.jsx`).
- The existing `styles.css` will be integrated and polished up to ensure premium UI/UX.

#### [NEW] Backend Infrastructure
- `server/index.js`: Main Express backend server.
- `server/routes/...`: API routes for User Authentication, Chat Messages, and Analytics tracking.

---

### Phase 2: Database Layer

#### [NEW] `prisma/schema.prisma`
We will define the database structure using Prisma ORM. Models will include:
1. **User**: Storing name, profession, stress factors, and personality metrics.
2. **ChatSession**: To group messages by session.
3. **ChatMessage**: Individual messages in the chat.
4. **EmotionMetric**: To log mood tracking data (Risk scores, Typing speed analysis).

---

### Phase 3: AI Backend Integration

#### [MODIFY] Chat Interface Logic
Instead of processing all the typing analytics and bot responses in the browser component, we will send messages to our backend API endpoints. The backend can evaluate the crisis score and return meaningful responses.

---

## Open Questions

> [!WARNING]
> Please let me know your thoughts on the following before we proceed:
> 1. **Framework Choice**: Are you okay with Vite (React) + Express + SQLite? (This is highly recommended for academic projects).
> 2. **Actual AI API**: Do you have API keys (e.g., OpenAI or Gemini) to plug into the backend for actual generation of responses, or should we keep the pre-defined mock responses for the chatbot?
> 3. **The current file `app.txt`**: Did you manually copy `app.js` code into `app.txt`, or was `app.js` lost? (I can seamlessly parse `app.txt` anyway).

## Verification Plan

### Automated/Manual Verification
- Install all Node dependencies and verify both the frontend (`npm run dev`) and backend servers run properly.
- Open the resulting application in a web browser, go through the Onboarding flow -> Dashboard -> Chat Interface.
- Verify that users, metrics, and chat logs are correctly saved to the SQLite database.
