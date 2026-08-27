# SmartInbox Agent

SmartInbox Agent automates email classification and workflows by integrating Gmail, Google GenAI (Gemini), and a MySQL backend. It provides OAuth-based Gmail access, message classification, and lightweight APIs to manage email processing.

## Features
- OAuth login with Google for accessing Gmail
- Email classification using Google GenAI (Gemini)
- Stores users and tokens in MySQL
- Small Express + TypeScript API and utility services

## Tech Stack
- Node.js + TypeScript
- Express
- Google APIs: `googleapis`, `@google/genai`
- MySQL (`mysql2`)

## Quick Start

Prerequisites:

- Node.js 18+ installed
- A MySQL server (or Docker) and ability to run SQL scripts
- Google Cloud project with OAuth 2.0 credentials

Install dependencies:

```bash
npm install
```

Create a `.env` file in the project root with the values below (example):

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Gemini / GenAI
GEMINI_API_KEY=your_gemini_api_key

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=password
DB_NAME=smartinbox

# JWT
JWT_SECRET=change_this_to_a_long_random_secret

# Optional
NODE_ENV=development
```

Initialize the database schema:

```bash
# Run the SQL in database/init.sql against your MySQL server
```

Run in development:

```bash
npm run dev
```

The server starts using `src/index.ts` and exposes the auth and email routes (see `src/routes/`).

## Google OAuth Setup

1. In Google Cloud Console create OAuth 2.0 credentials (Web application).
2. Add the redirect URI used in `.env` (e.g. `http://localhost:3000/auth/google/callback`).
3. Copy the Client ID and Client Secret into `.env`.

## Environment Variables
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- `GEMINI_API_KEY`
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`

## Project Structure (high level)

- `src/index.ts` — app entry and server
- `src/config/` — config for Google, Gemini, DB
- `src/controllers/` — route controllers (auth, email)
- `src/services/` — core services (gmail, gemini, db)
- `src/routes/` — Express route definitions
- `database/init.sql` — initial SQL schema

## Helpful Files
- Database schema: [database/init.sql](database/init.sql)
- Server entry: [src/index.ts](src/index.ts)
- Google config: [src/config/google.ts](src/config/google.ts)
- Gemini config: [src/config/gemini.ts](src/config/gemini.ts)

## Contributing
PRs welcome — open issues for feature requests or bugs. Keep changes small and focused.

## License
This project is provided as-is. Check `package.json` for the declared license.
