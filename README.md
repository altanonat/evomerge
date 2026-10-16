# 🧬 Evolution Game — Web Edition

Playable web port of `Oyun (Evolution Game)/Oyun.py` (Kivy). No build step — pure `index.html` + `styles.css` + `app.js`, ready for **GitHub Pages**. Highest scores are tracked **locally in the browser** (no server needed).

## Play it

- **Local preview:** open `index.html` in a browser, or run `python3 -m http.server` in this folder and visit `http://localhost:8000`.
- Click any empty cell → random **M** or **A** spawns → matching orthogonal neighbours merge: **M+M → A**, **A+A → H**. **H** never merges.
- Score = `M×1 + A×2 + H×5`. Game ends when the 6×6 board is full. Enter your name → **Save Score**.

## Files

| File | Purpose |
|---|---|
| `index.html` | Page + board + leaderboard UI |
| `styles.css` | Styling (responsive, mobile-friendly) |
| `app.js` | Game logic (1:1 port of `Oyun.py`) + local scores |
| `Oyun (Evolution Game)/Oyun.py` | Original Python/Kivy source (kept for reference) |

## 1. Upload to GitHub

```bash
cd "Oyun Web Sayfası"
git init
git add index.html styles.css app.js README.md .nojekyll .gitignore
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

## How scores work (local only)

- **Best:** max score on this browser (`localStorage evo_best`), updates live.
- **Top 10:** name + score entries on this browser (`evo_local_top`). One save per game. **Clear scores** wipes them.
- Scores differ per device/browser — there is no shared server. Perfect for a simple GitHub Pages game.

## Game-rules fidelity (`Oyun.py` → `app.js`)

- Start: shuffled pool `[M,M,M,A,A,H]` on 6 random cells ✅
- Click empty → `random.choice([M,A])` ✅
- `resolve_merges`: skips `H`, scans orthogonal neighbours up/down/left/right in order, merges first equal neighbour into `type+1` on a random survivor cell, clears the other, recurses ✅
- Score: `M=1, A=2, H=5` summed over the board ✅
- Additions for web only: game-over when board full, New Game, SVG figures, pop animation, name input, local leaderboard. Core evolution math is unchanged.
