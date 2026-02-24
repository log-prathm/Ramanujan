# Ramanujan Retro Arcade

Anonymous arcade platform with:

- No sign-in flow
- Username + local browser identity leaderboard
- MongoDB persistence
- Vercel-ready Next.js app
- Mobile-friendly Flappy Bird as the first game

## Run locally

1. Install packages:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env.local` and set your MongoDB connection string in `MONGODB_URI`.
3. Start dev server:
   ```bash
   npm run dev
   ```

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import project in Vercel.
3. Add environment variable:
   - `MONGODB_URI`
4. Deploy.

## How anonymous identity works

- User picks a public username.
- Browser creates/stores a random local device ID in `localStorage`.
- App attempts local IP detection via WebRTC (best-effort and may be blocked by browser/network).
- The leaderboard keeps only each identity's best score per game.

## Starter routes

- Home: `/`
- Flappy Bird: `/games/flappy`
- Leaderboard API: `/api/leaderboard?game=flappy-bird`
- Score submit API: `POST /api/submit-score`
