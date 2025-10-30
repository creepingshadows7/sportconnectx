# SportsConnect App

This project combines a React + Vite client with a lightweight Node/Express API backed by SQLite for account storage.

## Getting started

1. Install dependencies: `npm install`
2. Start the API (creates `server/data/accounts.sqlite` on first run): `npm run server`
3. In a second terminal, start the front-end: `npm run dev`
4. Visit the Vite URL shown in the console (default `http://localhost:5173`)

By default the client talks to `http://localhost:4000/api`. In other environments set `VITE_API_BASE_URL` so the front-end can reach the API, and optionally set `CORS_ORIGINS` (comma-separated list) before launching `npm run server`.

## Tech stack

- React 19 + Vite for the UI
- Express 5 + better-sqlite3 for the API layer
- Passwords are stored using scrypt-based hashes

## Linting

Run `npm run lint` to execute the configured ESLint rules.
