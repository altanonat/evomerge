/* Evolution Game — web port of Oyun.py (Kivy), local + optional Supabase global scores
 * Rules kept 1:1:
 *  - 6x6, start with 3x MICRO, 2x ANIMAL, 1x HUMAN on 6 random cells
 *  - click empty -> random MICRO/ANIMAL, then resolve_merges (orthogonal, first match, random survivor, chain)
 *  - HUMAN never merges. Score = M*1 + A*2 + H*5
 * Scores: best + top 10 in localStorage always; global Top 10 via Supabase when config.js is filled.
 */
(function () {
  "use strict";

  var GRID_SIZE = 6;
  var EMPTY = 0, MICRO = 1, ANIMAL = 2, HUMAN = 3;

  var POINTS = {};
  POINTS[EMPTY] = 0; POINTS[MICRO] = 1; POINTS[ANIMAL] = 2; POINTS[HUMAN] = 5;

  var CLASS = {};
  CLASS[EMPTY] = "empty"; CLASS[MICRO] = "micro"; CLASS[ANIMAL] = "animal"; CLASS[HUMAN] = "human";
  var TEXT = {};
  TEXT[EMPTY] = ""; TEXT[MICRO] = "M"; TEXT[ANIMAL] = "A"; TEXT[HUMAN] = "H";
  var FULL_NAME = {};
  FULL_NAME[MICRO] = "Micro"; FULL_NAME[ANIMAL] = "Animal"; FULL_NAME[HUMAN] = "Human";

  // Simple inline SVG figures (no external files, Pages-friendly).
  var SVG = {};
  SVG[MICRO] =
    '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">' +
    '<path d="M6 7 C9 10, 10 12, 11 14"/>' +
    '<path d="M26 7 C23 10, 22 12, 21 14"/>' +
    '<circle cx="16" cy="19" r="8"/>' +
    "</g>" +
    '<g fill="currentColor"><circle cx="13.5" cy="18" r="1.6"/><circle cx="18.5" cy="18" r="1.6"/><circle cx="16" cy="22" r="1.6"/></g>' +
    "</svg>";
  SVG[ANIMAL] =
    '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<g fill="currentColor">' +
    '<ellipse cx="16" cy="21" rx="7" ry="5.2"/>' +
    '<circle cx="8.5" cy="13.5" r="2.6"/><circle cx="16" cy="11" r="2.6"/><circle cx="23.5" cy="13.5" r="2.6"/>' +
    "</g></svg>";
  SVG[HUMAN] =
    '<svg viewBox="0 0 32 32" aria-hidden="true">' +
    '<g fill="currentColor"><circle cx="16" cy="9.5" r="4.6"/>' +
    '<path d="M8 27c0-5.2 3.6-8.4 8-8.4s8 3.2 8 8.4c0 .8-.7 1.5-1.5 1.5h-13C8.7 28.5 8 27.8 8 27z"/>' +
    "</g></svg>";

  // ---------- state ----------
  var board = [];
  var cellEls = [];
  var gameOver = false;
  var gameId = 0;
  var lastSavedGameId = -1;
  var activeTab = "global";

  // ---------- dom ----------
  var gridEl = document.getElementById("grid");
  var scoreEl = document.getElementById("score");
  var bestEl = document.getElementById("best");
  var globalBestEl = document.getElementById("globalBest");
  var statusEl = document.getElementById("status");
  var nameInput = document.getElementById("playerName");
  var leaderboardEl = document.getElementById("leaderboard");
  var configNotice = document.getElementById("configNotice");

  var cfg = (window.EVO_CONFIG || {});
  var SUPABASE_URL = (cfg.SUPABASE_URL || "").replace(/\/$/, "");
  var SUPABASE_ANON_KEY = cfg.SUPABASE_ANON_KEY || "";
  var LIMIT = cfg.LEADERBOARD_LIMIT || 10;
  var globalConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

  // ---------- storage keys (local only) ----------
  var LS_BEST = "evo_best";
  var LS_TOP = "evo_local_top";
  var LS_NAME = "evo_name";

  function getBest() {
    return parseInt(localStorage.getItem(LS_BEST) || "0", 10) || 0;
  }
  function setBest(v) {
    localStorage.setItem(LS_BEST, String(v));
    bestEl.textContent = String(v);
  }
  function getLocalTop() {
    try { return JSON.parse(localStorage.getItem(LS_TOP) || "[]"); }
    catch (e) { return []; }
  }
  function addLocalScore(name, score) {
    var top = getLocalTop();
    top.push({ name: name, score: score, date: new Date().toISOString() });
    top.sort(function (a, b) { return b.score - a.score; });
    top = top.slice(0, 10);
    localStorage.setItem(LS_TOP, JSON.stringify(top));
    return top;
  }

  function setStatus(msg) { statusEl.textContent = msg; }

  // ---------- core game (port of Oyun.py) ----------
  function shuffled(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  function startGame() {
    board = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      board.push([EMPTY, EMPTY, EMPTY, EMPTY, EMPTY, EMPTY]);
    }
    // _start_game port
    var itemPool = shuffled([MICRO, MICRO, MICRO, ANIMAL, ANIMAL, HUMAN]);
    var allCoords = [];
    for (var rr = 0; rr < GRID_SIZE; rr++)
      for (var cc = 0; cc < GRID_SIZE; cc++) allCoords.push([rr, cc]);
    shuffled(allCoords);
    var starts = allCoords.slice(0, 6);
    for (var i = 0; i < 6; i++) {
      board[starts[i][0]][starts[i][1]] = itemPool[i];
    }
    gameOver = false;
    gameId++;
    buildGrid();
    updateGui();
    setStatus("Place Micro / Animal on any empty cell.");
  }

  function buildGrid() {
    gridEl.innerHTML = "";
    cellEls = [];
    for (var r = 0; r < GRID_SIZE; r++) {
      var row = [];
      for (var c = 0; c < GRID_SIZE; c++) {
        (function (rr, cc) {
          var b = document.createElement("button");
          b.className = "cell empty";
          b.setAttribute("aria-label", "empty cell");
          b.addEventListener("click", function () { onClick(rr, cc); });
          gridEl.appendChild(b);
          row.push(b);
        })(r, c);
      }
      cellEls.push(row);
    }
  }

  function onClick(r, c) {
    if (gameOver) { setStatus("Game over — press New Game or save your score."); return; }
    if (board[r][c] !== EMPTY) return;
    var newItem = Math.random() < 0.5 ? MICRO : ANIMAL;
    board[r][c] = newItem;
    var evolved = [];
    resolveMerges(r, c, evolved);
    updateGui(evolved);
    if (evolved.length) {
      var last = evolved[evolved.length - 1];
      setStatus("Evolved to " + FULL_NAME[last.to] + "! Keep going.");
    }
    checkGameOver();
  }

  // Exact port of resolve_merges: first orthogonal match, random survivor, recurse.
  function resolveMerges(r, c, evolved) {
    var current = board[r][c];
    if (current === HUMAN || current === EMPTY) return;
    var dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (var i = 0; i < dirs.length; i++) {
      var nr = r + dirs[i][0], nc = c + dirs[i][1];
      if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE) continue;
      if (board[nr][nc] === current) {
        var newType = current + 1;
        var keepFirst = Math.random() < 0.5;
        var kr = keepFirst ? r : nr, kc = keepFirst ? c : nc;
        var xr = keepFirst ? nr : r, xc = keepFirst ? nc : c;
        board[kr][kc] = newType;
        board[xr][xc] = EMPTY;
        if (evolved) evolved.push({ r: kr, c: kc, from: current, to: newType, count: 2 });
        resolveMerges(kr, kc, evolved);
        break;
      }
    }
  }

  function calcScore() {
    var s = 0;
    for (var r = 0; r < GRID_SIZE; r++)
      for (var c = 0; c < GRID_SIZE; c++) s += POINTS[board[r][c]];
    return s;
  }

  function updateGui(flash) {
    var s = calcScore();
    scoreEl.textContent = String(s);
    if (s > getBest()) setBest(s);
    for (var r = 0; r < GRID_SIZE; r++) {
      for (var c = 0; c < GRID_SIZE; c++) {
        var v = board[r][c];
        var el = cellEls[r][c];
        el.innerHTML = v === EMPTY ? "" : (SVG[v] + '<span class="cell-tag">' + TEXT[v] + "</span>");
        el.className = "cell " + CLASS[v];
        el.setAttribute("aria-label", v === EMPTY ? "empty cell" : FULL_NAME[v]);
        if (gameOver) el.disabled = true;
      }
    }
    if (flash) {
      flash.forEach(function (f) {
        var el = cellEls[f.r][f.c];
        el.classList.remove("pop");
        void el.offsetWidth;
        el.classList.add("pop");
      });
    }
  }

  function isBoardFull() {
    for (var r = 0; r < GRID_SIZE; r++)
      for (var c = 0; c < GRID_SIZE; c++)
        if (board[r][c] === EMPTY) return false;
    return true;
  }

  function checkGameOver() {
    if (isBoardFull()) {
      gameOver = true;
      for (var r = 0; r < GRID_SIZE; r++)
        for (var c = 0; c < GRID_SIZE; c++) cellEls[r][c].disabled = true;
      var s = calcScore();
      setStatus("🏁 Board full — Game Over! Final score: " + s + ". Enter your name and press Save Score.");
    }
  }

  // ---------- leaderboards (local always, global when configured) ----------
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (m) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[m];
    });
  }

  function renderRows(rows, emptyMsg) {
    leaderboardEl.innerHTML = "";
    if (!rows.length) {
      var li = document.createElement("li");
      li.textContent = emptyMsg;
      leaderboardEl.appendChild(li);
      return;
    }
    rows.forEach(function (row, i) {
      var item = document.createElement("li");
      item.innerHTML = "<span>#" + (i + 1) + " <span class='name'>" +
        escapeHtml(row.name) + "</span></span><span class='pts'>" + row.score + "</span>";
      leaderboardEl.appendChild(item);
    });
  }

  function renderLocal() {
    renderRows(getLocalTop(), "No scores yet.");
  }

  function supabaseHeaders(json) {
    var h = { "apikey": SUPABASE_ANON_KEY, "Authorization": "Bearer " + SUPABASE_ANON_KEY };
    if (json) h["Content-Type"] = "application/json";
    return h;
  }

  function fetchGlobal() {
    if (!globalConfigured) {
      renderRows([], "No scores yet.");
      if (globalBestEl) globalBestEl.textContent = "–";
      return Promise.resolve([]);
    }
    leaderboardEl.innerHTML = "<li>Loading…</li>";
    var url = SUPABASE_URL + "/rest/v1/scores?select=name,score,created_at&order=score.desc,created_at.asc&limit=" + LIMIT;
    return fetch(url, { headers: supabaseHeaders(false) })
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.json();
      })
      .then(function (rows) {
        renderRows(rows, "No scores yet.");
        if (globalBestEl) globalBestEl.textContent = rows.length ? String(rows[0].score) : "–";
        return rows;
      })
      .catch(function (err) {
        renderRows([], "Could not load scores.");
        if (globalBestEl) globalBestEl.textContent = "–";
        return [];
      });
  }

  function submitGlobal(name, score) {
    return fetch(SUPABASE_URL + "/rest/v1/scores", {
      method: "POST",
      headers: Object.assign({ "Prefer": "return=minimal" }, supabaseHeaders(true)),
      body: JSON.stringify({ name: name, score: score })
    }).then(function (res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
    });
  }

  function refreshBoard() {
    if (activeTab === "global") fetchGlobal();
    else renderLocal();
  }

  function saveScore() {
    var score = calcScore();
    if (score <= 0) { setStatus("Score is 0 — play a little first."); return; }
    var name = (nameInput.value || "").trim().slice(0, 20);
    if (!name) { setStatus("Enter your player name first, then Save Score."); nameInput.focus(); return; }
    localStorage.setItem(LS_NAME, name);
    if (lastSavedGameId === gameId) {
      setStatus("Already saved for this game — press New Game for another entry.");
      return;
    }
    addLocalScore(name, score);
    lastSavedGameId = gameId;
    if (!globalConfigured) {
      if (activeTab === "local") renderLocal();
      else fetchGlobal();
      setStatus("Saved: " + name + " — " + score + " pts.");
      return;
    }
    setStatus("Saving…");
    submitGlobal(name, score)
      .then(function () {
        setStatus("Saved: " + name + " — " + score + " pts.");
        refreshBoard();
      })
      .catch(function (err) {
        setStatus("Saved locally.");
        refreshBoard();
      });
  }

  // ---------- wiring ----------
  document.getElementById("newGameBtn").addEventListener("click", function () {
    startGame();
    refreshBoard();
  });
  document.getElementById("saveScoreBtn").addEventListener("click", saveScore);
  document.getElementById("refreshBtn").addEventListener("click", refreshBoard);
  document.getElementById("clearBtn").addEventListener("click", function () {
    localStorage.removeItem(LS_TOP);
    localStorage.setItem(LS_BEST, "0");
    bestEl.textContent = "0";
    if (activeTab === "local") renderLocal();
    setStatus("Local scores cleared.");
  });
  document.getElementById("tabGlobal").addEventListener("click", function () {
    activeTab = "global";
    document.getElementById("tabGlobal").classList.add("active");
    document.getElementById("tabLocal").classList.remove("active");
    fetchGlobal();
  });
  document.getElementById("tabLocal").addEventListener("click", function () {
    activeTab = "local";
    document.getElementById("tabLocal").classList.add("active");
    document.getElementById("tabGlobal").classList.remove("active");
    renderLocal();
  });

  // init
  bestEl.textContent = String(getBest());
  nameInput.value = localStorage.getItem(LS_NAME) || "";
  if (configNotice) configNotice.classList.add("hidden");
  startGame();
  fetchGlobal();
})();
