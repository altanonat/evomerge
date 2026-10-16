# 🧬 Evolution Game — Web Edition

Playable web port of `Oyun (Evolution Game)/Oyun.py` (Kivy). No build step — pure `index.html` + `styles.css` + `app.js`, ready for **GitHub Pages**. Highest scores are tracked **locally** (instant) + **globally** via **Supabase** (free).

## Play it

- **Local preview:** open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit `http://localhost:8000`.
- Click any empty cell → random **M** or **A** spawns → matching orthogonal neighbours merge: **M+M → A**, **A+A → H**. **H** never merges.
- Score = `M×1 + A×2 + H×5`. Game ends when the 6×6 board is full. Enter your name → **Save Score**.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page + board + leaderboard UI |
| `styles.css` | Styling (responsive, mobile-friendly) |
| `app.js` | Game logic (1:1 port of `Oyun.py`) + local/global scores |
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

> Tip: the `._*` AppleDouble files and `.DS_Store` are ignored via `.gitignore` — don't commit them.

## 2. Turn on GitHub Pages (free hosting)

1. GitHub repo → **Settings → Pages**
2. **Source:** `Deploy from a branch` → branch `main`, folder `/ (root)` → **Save**
3. Wait ~1 min → your game is live at `https://<you>.github.io/<repo>/`

## 3. Enable the 🌍 global leaderboard (5 min, free)

Without this step the game still works — best score + top 10 are stored in each player's browser (`localStorage`). Do this once to share one leaderboard across all players:

1. Create a free project at https://supabase.com → **New project**
2. **SQL Editor → New query** → paste the contents of `supabase-setup.sql` → **Run** (creates public `scores` table + safe RLS policies: anyone can read/insert, nobody can delete/update from the web key)
3. **Project Settings → API** → copy the **Project URL** and **anon public key**
4. Paste them into `config.js`:
   ```js
   window.EVO_CONFIG = {
     SUPABASE_URL: "https://xyzcompany.supabase.co",
     SUPABASE_ANON_KEY: "eyJhbGciOi...",
     LEADERBOARD_LIMIT: 10
   };
   ```
5. Commit + push. Reload the Pages site → the notice disappears and **🌍 Global Top 10** loads. Press **Save Score** to test — your entry should appear after refresh.

### How scores work

- **Best (you):** max score on this browser (`localStorage evo_best`), updates live.
- **Your Top 10:** name + score entries on this browser (`evo_local_top`).
- **Global Top 10:** Supabase `scores` table via its REST API (`fetch`, no SDK needed). One save per game (double-saves blocked). Invalid names/scores are rejected by both JS and SQL `CHECK` constraints.

## Game-rules fidelity (`Oyun.py` → `app.js`)

- Start: shuffled pool `[M,M,M,A,A,H]` on 6 random cells ✅
- Click empty → `random.choice([M,A])` ✅
- `resolve_merges`: skips `H`, scans orthogonal neighbours up/down/left/right in order, merges first equal neighbour into `type+1` on a random survivor cell, clears the other, recurses ✅
- Score: `M=1, A=2, H=5` summed over the board ✅
- Additions for web only: game-over when board full, New Game, pop animation, name input, leaderboards. Core evolution math is unchanged.
