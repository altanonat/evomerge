# 🧬 Evolution Game — Web Edition

Playable web port of `Oyun (Evolution Game)/Oyun.py` (Kivy). No build step — pure `index.html` + `styles.css` + `app.js`, ready for **GitHub Pages**. Scores work **locally out of the box**, plus an optional **global Top 10 via Supabase** (free).

## Play it

- **Local preview:** run `python3 -m http.server` in this folder and visit `http://localhost:8000` (don't just double-click `index.html` — `file://` can block the global fetch).
- Click any empty cell → random **M** or **A** spawns → matching orthogonal neighbours merge: **M+M → A**, **A+A → H**. **H** never merges.
- Score = `M×1 + A×2 + H×5`. Game ends when the 6×6 board is full. Enter your name → **Save Score**.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page + board + leaderboard UI |
| `styles.css` | Styling (responsive, mobile-friendly) |
| `app.js` | Game logic (1:1 port of `Oyun.py`) + local + global scores |
| `config.js` | Your Supabase URL + anon key (empty = local-only mode) |
| `supabase-setup.sql` | One-time SQL to create the global `scores` table |
| `Oyun (Evolution Game)/Oyun.py` | Original Python/Kivy source (kept for reference) |

## 1. Upload to GitHub

```bash
cd "Oyun Web Sayfası"
git init
git add index.html styles.css app.js config.js supabase-setup.sql README.md .nojekyll .gitignore
git commit -m "Add Evolution Game web edition"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

## 2. Turn on GitHub Pages (free hosting)

1. GitHub repo → **Settings → Pages**
2. **Source:** `Deploy from a branch` → branch `main`, folder `/ (root)` → **Save**
3. Wait ~1 min → your game is live at `https://<you>.github.io/<repo>/`

## 3. Enable the 🌍 global leaderboard (Supabase, ~5 min, free)

You need this only once. Without it the game still works locally.

**A. Create the project**
1. Go to https://supabase.com → Sign up/in → **New project**
2. Name: `evomerge` (anything), set a database password (save it), region: closest to you → **Create project** (wait ~2 min)

**B. Create the table**
1. Left menu → **SQL Editor** → **New query**
2. Open `supabase-setup.sql` in this repo, copy everything, paste into the query box → **Run**
3. Left menu → **Table Editor** → confirm you see a `scores` table with columns `id, name, score, created_at`

**C. Get the 2 keys**
1. **Project Settings (gear) → API**
2. Copy **Project URL** (looks like `https://xyzcompany.supabase.co`)
3. Copy **anon public** key (long `eyJhbG...` string — NOT the `service_role` secret key)

**D. Connect the game**
1. Open `config.js` and paste:
   ```js
   window.EVO_CONFIG = {
     SUPABASE_URL: "https://xyzcompany.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
     LEADERBOARD_LIMIT: 10
   };
   ```
2. Save → `git add config.js && git commit -m "Connect Supabase" && git push`
3. Open your Pages URL → hard-refresh (Cmd/Ctrl+Shift+R) → **🌍 Global Top 10** should say “Connected! No global scores yet”
4. Play → enter name → **Save Score** → Refresh → your entry appears. Open the site on your phone to confirm it's shared.

**If it still says offline / error:** press **F12 → Console** and check: 1) URL has no trailing `/`, 2) you used the **anon** key, 3) SQL actually ran (table exists), 4) you pushed `config.js`, 5) you're on `http(s)://`, not `file://`.

## How scores work

- **Best (you):** max on this browser (`localStorage evo_best`), live.
- **Your Top 10:** this browser only (`evo_local_top`), Clear local wipes it.
- **Global Top 10:** Supabase `scores` table via REST `fetch`. Every save writes locally always, plus globally when configured. One save per game.

## Game-rules fidelity (`Oyun.py` → `app.js`)

- Start: shuffled pool `[M,M,M,A,A,H]` on 6 random cells ✅
- Click empty → `random.choice([M,A])` ✅
- `resolve_merges`: skips `H`, scans orthogonal neighbours up/down/left/right in order, merges first equal neighbour into `type+1` on a random survivor cell, clears the other, recurses ✅
- Score: `M=1, A=2, H=5` summed over the board ✅
