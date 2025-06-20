# TinyJourney

Tiny Journey is a dynamic, AI-powered web tool designed to help users create personalized micro-adventures. The application generates themed quests based on location, user interests, time availability, and desired difficulty. Each quest can include hints, optional evidence submission, and scoring. Completed journeys are stored for later review and can be shared.

## Key Features
- **Journey Configuration:** Input a location or use current geolocation, select interests, choose an adventure theme, set time and difficulty. The "Surprise Me" button now fills most fields for quick setup.
- **AI-Powered Quest Generation:** Utilizes the OpenAI API to create three unique quests with titles, descriptions, tasks, durations, points, and optional local lore.
- **Journey Progression:** Quests are displayed one by one, tracking completion and score updates.
- **Hint System:** Up to three hints per quest are generated using the OpenAI API.
- **Evidence Submission:** Upload an image and caption for the active quest if desired.
- **Journey Completion & Archiving:** Completed journeys are saved to local storage with a final score and evidence journal. A share button copies a text summary to your clipboard.
- **Past Journey Viewing:** Access an archive of past journeys with their original settings and evidence. Click any entry to view its details.
- **Localization:** Supports English and French UI, including AI-generated content using the selected language.
- **Sharing:** A "Copy Summary" button lets you quickly share the adventure text.
- **State Persistence:** The current journey state is saved to local storage to allow resuming later.

## Technical Notes
Tiny Journey is a client-side single page application written in TypeScript. It uses the OpenAI API for generating quests and hints, the browser Geolocation API for location, and localStorage for persistence. Reverse geocoding is handled with the Nominatim service.

In a production deployment, calls to the OpenAI API should be proxied through a backend service to keep the API key secure.

## Setup
1. Clone the repository and open `app.js`.
2. Replace the empty `OPENAI_API_KEY` string with your OpenAI API key.
3. Serve `index.html` via any static file server and open it in your browser.
4. Optionally explore the archive of past journeys after completing a quest. Click an entry to view its details.
5. Use the "Copy Summary" button when a journey completes to share your adventure.
