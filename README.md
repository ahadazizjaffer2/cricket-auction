# Cricket-style Player Auction

Live auction app: 4 captains bid from their phones, guests watch a live board,
players come up automatically one after another with a countdown timer.

No database — everything lives in the server's memory while it runs, seeded
from a CSV of players. Results can be exported to CSV/JSON at any time.

## How it's structured, and why

```
/server   Node + Express + Socket.io — the auction engine (all state, all rules)
/client   Next.js — pure frontend, talks to /server over Socket.io
```

Socket.io needs one continuous, always-on process to hold live connections
and run the auto-advancing timer. Vercel's serverless functions spin up per
request and don't reliably keep that alive — so:

- **`/server` → Render, Railway, or Heroku** (any free tier is plenty for this scale)
- **`/client` → Vercel**, as you planned. It's just React talking to the server's URL.

## 1. Set up your players CSV

`server/data/players.sample.csv` has 28 placeholder players — replace it with
your real list, same columns:

```csv
name,category,basePrice
Virat,Batsman,2
Bumrah,Bowler,2
Player X,All-Rounder,1
```

- `category` is free text (Batsman/Bowler/All-Rounder/Wicketkeeper, or anything you like) — shown on screen, not used in any rule.
- `basePrice` is optional per player; defaults to 1 if left blank.
- You can also paste/replace the CSV live from the Admin screen once the app is running, no redeploy needed — as long as it's before you click "Start auction."
- **Player count:** with 4 teams and a squad size of 8 (1 captain + 7 bought), you need **28 players** in the auction pool for every team to fill up exactly. Fewer/more is fine too — the app just won't force an exact fit; adjust "Squad size" in Setup accordingly.

## 2. Configure teams, PINs, and the admin password

Edit `server/config.json`:

```json
{
  "adminPassword": "changeme123",
  "budgetTotal": 50,
  "squadSize": 8,
  "timerSeconds": 12,
  "minIncrement": 1,
  "basePriceDefault": 1,
  "teams": [
    { "id": "team1", "name": "Team Falcons", "pin": "1111" },
    ...
  ]
}
```

**Change the PINs and admin password before your event.** Send each captain
their team name + PIN privately (WhatsApp, etc.) — that's their whole "login."
Guests need nothing at all.

All the numbers here (budget, squad size, timer, increment) can also be
tweaked live from the Admin → Setup screen before you hit Start.

### The reserve rule

So a team can't blow its whole budget and end up unable to fill its squad:
a captain's max allowed bid on the current player is capped at

```
budgetRemaining − (slotsStillNeededAfterThisOne × basePriceDefault)
```

i.e. it always keeps at least `basePriceDefault` points aside for every
remaining empty slot. The app enforces this automatically and disables/limits
bids that would break it.

## 3. Run it locally

```bash
# terminal 1
cd server
npm install
cp .env.example .env      # edit if needed
npm start                 # http://localhost:4000

# terminal 2
cd client
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
npm run dev                        # http://localhost:3000
```

Open `/admin` (enter the admin password), `/captain` (pick a team + PIN),
and `/guest` (no login) in different tabs to try the full flow.

## 4. Deploy

**Server → Render (recommended, free tier works):**
1. Push this repo to GitHub.
2. New Web Service on Render → point at `/server` as the root directory.
3. Build command: `npm install`. Start command: `npm start`.
4. Env vars: `CLIENT_ORIGIN` = your Vercel URL (set this after step 2 below; `*` works temporarily).
5. Deploy → copy the resulting URL, e.g. `https://your-auction.onrender.com`.

**Client → Vercel:**
1. New Project on Vercel → point at `/client` as the root directory.
2. Env var: `NEXT_PUBLIC_SOCKET_URL` = your Render URL from above.
3. Deploy → copy the resulting URL, e.g. `https://your-auction.vercel.app`.
4. Go back to Render and set `CLIENT_ORIGIN` to that Vercel URL, redeploy the server.

Share `/guest` with everyone, `/captain` with the 4 captains, keep `/admin` to yourself.

**Note on Render's free tier:** it can spin down after inactivity and take
~30s to wake on the first request. Open the admin page a couple minutes
before you start so it's warm, or use a paid instance for the event.

## 5. Running the auction

1. Open `/admin`, log in, review Setup (config + players), click **Start auction**.
2. Players come up automatically in order. Each gets a countdown that resets
   on every new bid; it sells to the highest bidder when time runs out.
3. A player with **zero bids** goes to the retry pool and comes back after
   the first full pass — repeating until everyone's sold (or you override it).
4. Admin can **Pause/Resume**, **force-sell** to a specific team, **skip to
   pool**, or **permanently mark unsold** for edge cases (e.g. nobody wants a
   player after several rounds).
5. When the pool empties, the auction marks itself **Complete**. Export
   results as CSV or JSON any time from the Admin screen.

## Known limitations (by design, given "no DB")

- State lives in the server's memory: if the server process restarts mid-auction, progress is lost. Export regularly if that's a concern, or just don't restart it mid-event.
- One auction at a time per deployed server.
- CSV parsing is minimal (fine for typical name/category text; wrap any field containing a comma in double quotes).
