(() => {
  const C = window.CELEBS, POOL = window.POOL;
  const $ = (id) => document.getElementById(id);
  const input = $("guess"), list = $("options"), grid = $("grid"), statusEl = $("status");
  const norm = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9 ]/g, "");

  const PH = window.PHOTOS || {};
  function avatar(n) {
    const src = PH[n];
    if (src) { const i = document.createElement("img"); i.className = "av"; i.src = src; i.alt = ""; i.loading = "lazy"; return i; }
    const s = document.createElement("span"); s.className = "av ini";
    s.textContent = n.split(" ").map((w) => w[0]).slice(0, 2).join(""); return s;
  }

  // ----- state -----
  const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
  const hash = (s) => { let h = 2166136261; for (const ch of s) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  let mode = "daily", answer, guesses = [], done = false, hints = { pro: false, ini: false };
  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  };
  function dailyAnswer() { return C[POOL[hash("ballroomdle-" + dayKey()) % POOL.length]]; }

  function start(m) {
    mode = m;
    $("mode-btn").textContent = m === "daily" ? "Daily" : "Practice";
    guesses = []; done = false; hints = { pro: false, ini: false }; $("end").hidden = true; $("again").hidden = m === "daily";
    grid.querySelectorAll(".row:not(.head)").forEach((r) => r.remove());
    statusEl.textContent = "";
    if (m === "daily") {
      answer = dailyAnswer();
      const saved = store.get("bd-daily");
      if (saved && saved.day === dayKey()) { hints = Object.assign(hints, saved.hints || {}); saved.names.forEach((n) => addGuess(C.find((c) => c.n === n), false)); }
    } else {
      answer = C[POOL[Math.floor(Math.random() * POOL.length)]];
    }
    updateHints();
  }

  // ----- comparison -----
  function num(g, a, close) {
    const cls = g === a ? "g" : Math.abs(g - a) <= close ? "y" : "n";
    return { cls, text: g + (g < a ? " ▲" : g > a ? " ▼" : "") };
  }
  function compare(g) {
    const shared = g.p.filter((x) => answer.p.includes(x)).length;
    const same = g.p.length === answer.p.length && shared === g.p.length;
    return [
      { cls: g.n === answer.n ? "g" : "n", text: g.n, name: true },
      num(g.s, answer.s, 2),
      { cls: same ? "g" : shared ? "y" : "n", text: g.p.join(" / ") },
      { cls: g.g === answer.g ? "g" : "n", text: g.g },
      num(g.a, answer.a, 5),
      num(g.pl, answer.pl, 2),
      { cls: g.sn === answer.sn ? "g" : "n", text: g.sn },
    ];
  }
  function addGuess(g, animate = true) {
    guesses.push(g);
    updateHints();
    const row = document.createElement("div"); row.className = "row";
    compare(g).forEach((c, i) => {
      const d = document.createElement("div");
      d.className = c.cls + (c.name ? " name" : "") + (animate ? " flip" : "");
      d.style.setProperty("--i", i);
      if (c.name) { d.appendChild(avatar(g.n)); const t = document.createElement("span"); t.textContent = c.text; d.appendChild(t); }
      else d.textContent = c.text;
      row.appendChild(d);
    });
    grid.querySelector(".head").after(row);
    if (g === answer) finish(true);
  }
  function emoji(g) { return compare(g).slice(1).map((c) => ({ g: "🟩", y: "🟨", n: "⬜" })[c.cls]).join(""); }

  function finish(won) {
    done = true; $("end").hidden = false; updateHints();
    // daily streak, read by The Daily Station's Originals page (same site, same storage)
    if (mode === "daily") {
      const st = store.get("bd-stats") || { last: null, streak: 0 };
      if (st.last !== dayKey()) {
        const y = new Date(); y.setDate(y.getDate() - 1);
        const yKey = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
        st.streak = st.last === yKey ? st.streak + 1 : 1; st.last = dayKey(); store.set("bd-stats", st);
      }
    }
    $("end-title").textContent = won ? "You found them!" : "";
    $("end-text").textContent = `${answer.n}: season ${answer.s}, finished ${answer.pl === 1 ? "1st (Mirrorball champion)" : "#" + answer.pl}. Solved in ${guesses.length} guess${guesses.length === 1 ? "" : "es"}.`;
    input.disabled = true;
  }

  // ----- hints -----
  const PRO_AT = 5, INI_AT = 10;
  function initials(n) {
    const words = n.replace(/"[^"]*"/g, " ").replace(/\./g, ". ").trim().split(/\s+/).filter(Boolean);
    return words.map((w) => Array.from(w)[0].toUpperCase() + ".").join(" ");
  }
  function saveDaily() { if (mode === "daily") store.set("bd-daily", { day: dayKey(), names: guesses.map((x) => x.n), hints, done }); }
  function paintHint(btn, shown, at, label, value) {
    const left = at - guesses.length;
    btn.classList.toggle("on", shown); btn.classList.toggle("ready", !shown && left <= 0 && !done);
    if (shown) { btn.disabled = true; btn.innerHTML = `<span>${label}</span><strong></strong>`; btn.querySelector("strong").textContent = value; }
    else if (left > 0) { btn.disabled = true; btn.innerHTML = `<span>${label} hint</span><small>unlocks in ${left} guess${left === 1 ? "" : "es"}</small>`; }
    else { btn.disabled = done; btn.innerHTML = `<span>${label} hint</span><small>${done ? "game over" : "tap to reveal"}</small>`; }
  }
  function updateHints() {
    paintHint($("hint-pro"), hints.pro, PRO_AT, "Pro partner", answer.pro);
    paintHint($("hint-ini"), hints.ini, INI_AT, "Initials", initials(answer.n));
  }
  $("hint-pro").addEventListener("click", () => { if (guesses.length >= PRO_AT && !done) { hints.pro = true; updateHints(); saveDaily(); } });
  $("hint-ini").addEventListener("click", () => { if (guesses.length >= INI_AT && !done) { hints.ini = true; updateHints(); saveDaily(); } });

  // ----- autocomplete -----
  let matches = [], sel = -1;
  function render() {
    const q = norm(input.value.trim());
    const used = new Set(guesses.map((g) => g.n));
    matches = q ? C.filter((c) => !used.has(c.n) && norm(c.n).includes(q))
      .sort((a, b) => (norm(a.n).startsWith(q) ? 0 : 1) - (norm(b.n).startsWith(q) ? 0 : 1) || a.n.localeCompare(b.n)).slice(0, 8) : [];
    list.innerHTML = ""; sel = matches.length ? 0 : -1;
    matches.forEach((m, i) => {
      const li = document.createElement("li"); li.setAttribute("role", "option"); li.setAttribute("aria-selected", i === sel);
      li.innerHTML = `<span class="who"><b></b></span><small>S${m.s}</small>`; li.querySelector(".who").prepend(avatar(m.n)); li.querySelector("b").textContent = m.n;
      li.addEventListener("mousedown", (e) => { e.preventDefault(); submit(m); });
      list.appendChild(li);
    });
    list.hidden = !matches.length; input.setAttribute("aria-expanded", !list.hidden);
  }
  function highlight(d) {
    if (!matches.length) return; sel = (sel + d + matches.length) % matches.length;
    [...list.children].forEach((li, i) => li.setAttribute("aria-selected", i === sel));
  }
  function submit(g) {
    if (done || !g) { if (!g) statusEl.textContent = "Pick a name from the list."; return; }
    input.value = ""; render(); statusEl.textContent = "";
    addGuess(g);
    if (mode === "daily") saveDaily();
  }
  input.addEventListener("input", render);
  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); highlight(1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); highlight(-1); }
    else if (e.key === "Escape") { list.hidden = true; }
  });
  input.addEventListener("blur", () => setTimeout(() => (list.hidden = true), 100));
  $("guess-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const q = norm(input.value.trim());
    const exact = C.find((c) => norm(c.n) === q && !guesses.includes(c));
    submit(exact || matches[sel]);
  });

  // ----- buttons -----
  $("help-btn").addEventListener("click", () => $("help").showModal());
  $("mode-btn").addEventListener("click", () => { input.disabled = false; start(mode === "daily" ? "practice" : "daily"); });
  $("again").addEventListener("click", () => { input.disabled = false; start("practice"); });
  $("share").addEventListener("click", async () => {
    const text = `DWTStardles ${mode === "daily" ? dayKey() : "(practice)"} ${guesses.length} guesses\n` + [...guesses].map(emoji).join("\n") + "\nthedailystation.com/dwtstardles";
    try { await navigator.clipboard.writeText(text); statusEl.textContent = "Copied!"; } catch { statusEl.textContent = text; }
  });

  start("daily"); updateHints();
  if (!store.get("bd-seen")) { store.set("bd-seen", 1); $("help").showModal(); }
})();
