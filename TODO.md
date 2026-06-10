# TODO - MindWell Full-Stack Upgrade

## Step 1: Inspect & identify frontend API wiring bugs
- [x] Inspect frontend (`app.js`) routes being called for chat sync
- [x] Inspect backend (`server/index.js`) correct routes (`/api/chat/send`, sessions, analytics)

## Step 2: Fix chatbot response source-of-truth
- [x] Update `ChatInterface` to call `POST /api/chat/send`
- [x] Render `botMessage.text` from backend response
- [x] Update crisis/mood UI from backend `analysis`



## Step 3: Fix route mismatches / missing history loading
- [x] Update frontend calls to correct endpoints (therapyMethod in api.js)
- [x] Load session history via `GET /api/chat/session/:sessionId`



## Step 4: Wire analytics page to real backend data
- [x] Replace dummy analytics with `GET /api/analytics/:userId` + stress/crisis trends


## Step 5: Improve UI (less dark themed)
- [x] Obsidian Nebula (dark) + Ethereal Aurora (light) themes
- [x] Chat bubble gradients + floating therapy gear

## Step 6: Basic stability & error handling
- [x] User/session fallback on missing IDs
- [x] Toast when Gemini fallback / API errors

## Advanced (2026-05-22)
- [x] Journal persistence (`POST/GET /api/journal/:userId`)
- [x] Goals + mood streak (`/api/wellness/*`)
- [x] Multi-mode breathing (4-7-8, box, equal)
- [x] Wellness Hub modal: insights + Save + Start exercise

