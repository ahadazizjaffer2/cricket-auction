# Cricket-style Player Auction — Physical Bidding Edition

This is the "physical bidding" branch: bidding itself happens live in the
room, not on captains' phones. There's no captain view or login at all.

- **Admin**: draws a random player from the pool, then — once the room's
  physical bidding on that player is done — types in who won and for how
  much. Also controls pause/skip/mark-unsold and everything else.
- **Guests**: watch a live board — who's currently up, the result once
  confirmed, live team budgets/squads, and an activity log. No bid amounts
  shown live, since there's nothing digital happening during the bidding
  itself.

No database — everything lives in the server's memory while it runs, seeded
from a CSV of players. Results can be exported to CSV/JSON at any time.

## How it's structured, and why

```
/server   Node + Express + Socket.io — the auction engine (all state, all rules)
/client   Next.js — pure frontend, talks to /server over Socket.io
```

Socket.io needs one continuous, always-on process to hold live connections —
Vercel's serverless functions don't reliably keep that alive, so:

- **`/server` → Render, Railway, or Heroku** (any free tier is plenty for this scale)
- **`/client` → Vercel**

## 1. Set up your players CSV

`server/data/players.sample.csv` has 28 placeholder players — replace it with
your real list, same columns:

```csv
name,category,basePrice
Virat,Batsman,2
Bumrah,Bowler,2
Player X,All-Rounder,1
```

`basePrice` is shown on screen as a reference for the room; it isn't enforced
by the app since bidding itself happens physically. You can also paste/replace
the CSV live from the Admin screen, any time before you click "Start auction."

## 2. Configure teams and the admin password

Edit `server/config.json`:

```json
{
  "adminPassword": "changeme123",
  "budgetTotal": 50,
  "teams": [
    { "id": "team1", "name": "Team Falcons" },
    ...
  ]
}
```

**Change the admin password before your event.** There are no captain PINs
in this version — guests need nothing, and there's no captain login at all.
Team names and the budget figure can also be edited live from Admin → Setup,
any time before you click "Start auction."

### Squad size is automatic

There's no separate "squad size" setting — it's derived from however many
players you load, split as evenly as possible across your 4 teams (e.g. 25
players → three teams of 6, one of 7). The Setup screen shows the exact split
live, based on whatever's currently loaded.

### About the 50-point budget

Each team starts at the configured budget (default 50) and it's just tracked,
not enforced — if the room's bidding takes a team past 50, the admin can
still confirm that sale. The team's remaining budget then shows as a negative
number (highlighted) everywhere it's displayed, so it's always visible, never
silently allowed to look fine. The one thing that *is* blocked is trying to
sell a player to a team whose squad is already full — that's a hard error.

## 3. Run it locally

```bash
# terminal 1
cd server
npm install
cp .env.example .env
npm start                 # http://localhost:4000

# terminal 2
cd client
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_SOCKET_URL=http://localhost:4000
npm run dev                        # http://localhost:3000
```

Open `/admin` (enter the admin password) and `/guest` (no login) in different
tabs to try the full flow.

## 4. Deploy

**Server → Render (recommended, free tier works):**
1. Push this repo/branch to GitHub.
2. New Web Service on Render → point at `/server` as the root directory.
3. Build command: `npm install`. Start command: `npm start`.
4. Env var: `CLIENT_ORIGIN` = your Vercel URL (`*` works temporarily).
5. Deploy → copy the resulting URL.

**Client → Vercel:**
1. New Project on Vercel → point at `/client` as the root directory.
2. Env var: `NEXT_PUBLIC_SOCKET_URL` = your Render URL from above.
3. Deploy → copy the resulting URL.
4. Go back to Render, set `CLIENT_ORIGIN` to that real Vercel URL, redeploy.

Share `/guest` with everyone, keep `/admin` to yourself and whoever's running
the show.

## 5. Running the auction

1. Open `/admin`, log in, review Setup (config, teams, players, squad-split
   preview), click **Start auction**.
2. Click **Next player** — a random player from the pool is drawn and shown
   to everyone. Bidding then happens physically in the room.
3. Once the room settles on a winner, pick the **winning team** and type in
   the **final price**, then **Confirm sale**. That result (or **Skip** /
   **Mark permanently unsold**) stays on screen until you click **Next
   player** again.
   - **Skip** returns the player to the pool — they can come up again at any
     later random draw.
   - **Mark permanently unsold** removes them for good.
4. **Pause** freezes the board (e.g. for a break) — guests see "Auction
   paused" and no admin actions are available until you **Resume**.
5. When the pool empties, the auction marks itself **Complete**. Export
   results as CSV or JSON any time from the Admin screen.

## Known limitations (by design, given "no DB")

- State lives in the server's memory: if the server process restarts mid-auction, progress is lost. Export regularly if that's a concern.
- One auction at a time per deployed server.
- CSV parsing is minimal (fine for typical name/category text; wrap any field containing a comma in double quotes).
