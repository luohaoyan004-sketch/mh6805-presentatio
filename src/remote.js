(() => {
'use strict';
// TITLES and NOTES are injected by build.py from the deck's own template and script.
const $ = s => document.querySelector(s);
const qs = new URLSearchParams(location.search);
const RELAY = qs.get('relay') || 'https://ntfy.sh';
const pad2 = n => String(n).padStart(2, '0');
const N = TITLES.length;
let room = (qs.get('room') || '').toLowerCase().replace(/[^a-z0-9]/g, '');
let es = null, state = null, lastSeen = 0, helloT = 0;

/* ---------- join ---------- */
let started = false;
$('#joinForm').addEventListener('submit', e => {
  e.preventDefault();
  const c = $('#code').value.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (c.length !== 6) { $('#code').focus(); $('#code').select(); return; }
  const u = new URL(location.href); u.searchParams.set('room', c);
  history.replaceState(null, '', u); room = c; start();
});
function showJoin() {
  if (es) { es.close(); es = null; }
  clearTimeout(helloT); state = null;
  $('#remote').hidden = true; $('#join').hidden = false;
  const u = new URL(location.href); u.searchParams.delete('room'); history.replaceState(null, '', u);
  const inp = $('#code'); inp.value = room.toUpperCase(); inp.focus(); inp.select();
}
if (!room) $('#join').hidden = false; else start();

/* ---------- remote ---------- */
function start() {
  $('#join').hidden = true; $('#remote').hidden = false;
  $('#roomCode').textContent = room.toUpperCase();
  $('#total').textContent = N;
  $('#nowN').textContent = '--'; $('#nowTitle').textContent = 'Waiting for the deck…'; $('#pips').innerHTML = ''; $('#stepline').innerHTML = '&nbsp;';
  connect();
  if (started) return;
  started = true;
  $('#room').addEventListener('click', showJoin);
  $('#slides').innerHTML = TITLES.map((t, i) => `<li><button type="button" data-s="${i}"><span class="n">${pad2(i + 1)}</span><span>${t}</span></button></li>`).join('');
  $('#slides').addEventListener('click', e => { const b = e.target.closest('button[data-s]'); if (b) { send({ a: 'go', s: +b.dataset.s, st: 0 }, +b.dataset.s, 0); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  $('#prev').addEventListener('click', () => send({ a: 'prev' }, ...step(-1)));
  $('#next').addEventListener('click', () => send({ a: 'next' }, ...step(1)));
  setInterval(() => { if (state && Date.now() - lastSeen > 45000) setStatus('', 'Deck quiet. Tap a button to check.'); }, 5000);
}

function connect() {
  setStatus('', 'Connecting…');
  es = new EventSource(`${RELAY}/mh6805deck-${room}/sse`);
  es.onopen = () => { setStatus('', 'Looking for the deck…'); hello(); };
  es.onerror = () => setStatus('bad', 'Connection lost. Retrying…');
  es.onmessage = ev => {
    let j, m; try { j = JSON.parse(ev.data); m = JSON.parse(j.message); } catch (e) { return; }
    if (j.event && j.event !== 'message') return;
    if (!m || m.t !== 'state') return;
    clearTimeout(helloT);
    state = m; lastSeen = Date.now();
    setStatus('ok', 'Connected to the deck');
    render();
  };
}
let tries = 0;
function hello() {
  post({ t: 'cmd', a: 'hello' });
  clearTimeout(helloT);
  helloT = setTimeout(() => {
    if (state) return;
    tries++;
    setStatus('bad', `No deck with code ${room.toUpperCase()} yet. Wrong code? Tap Change.`);
    hello();
  }, 3500);
}
function post(msg) {
  return fetch(`${RELAY}/mh6805deck-${room}`, { method: 'POST', body: JSON.stringify(msg) })
    .then(r => { if (!r.ok) setStatus('bad', `Relay refused the message (HTTP ${r.status}).`); })
    .catch(() => setStatus('bad', 'This phone cannot send to the relay.'));
}

// predicted position, so the phone answers instantly; the deck's own report then confirms it
function step(d) {
  if (!state) return [null, null];
  let { cur, step: st, steps } = state;
  if (d > 0) { if (st < steps[cur] - 1) st++; else if (cur < N - 1) { cur++; st = 0; } }
  else { if (st > 0) st--; else if (cur > 0) { cur--; st = steps[cur] - 1; } }
  return [cur, st];
}
function send(cmd, cur, st) {
  post(Object.assign({ t: 'cmd' }, cmd));
  try { navigator.vibrate && navigator.vibrate(8); } catch (e) {}
  if (state && cur != null) { state = Object.assign({}, state, { cur, step: st }); render(); }
  keepAwake();
}

function render() {
  const { cur, step: st, steps } = state;
  const n = steps[cur] || 1;
  $('#nowN').textContent = pad2(cur + 1);
  $('#nowTitle').textContent = TITLES[cur];
  $('#pips').innerHTML = n > 1 ? Array.from({ length: n }, (_, i) => `<i class="${i <= st ? 'on' : ''}${i === st ? ' cur' : ''}"></i>`).join('') : '';
  $('#stepline').textContent = n > 1 ? `Step ${st + 1} of ${n}` : 'Single step';
  const p = NOTES[cur].p;
  $('#say').textContent = p[Math.min(st, p.length - 1)];
  $('#cue').textContent = st < n - 1 ? `Next press reveals step ${st + 2}.` : (cur < N - 1 ? `Next press goes to: ${TITLES[cur + 1]}` : 'Last slide.');
  $('#prev').disabled = cur === 0 && st === 0;
  $('#next').disabled = cur === N - 1 && st === n - 1;
  document.querySelectorAll('#slides button').forEach((b, i) => b.setAttribute('aria-current', i === cur ? 'true' : 'false'));
}
function setStatus(kind, text) {
  const s = $('#status'); s.classList.toggle('ok', kind === 'ok'); s.classList.toggle('bad', kind === 'bad');
  s.querySelector('span').textContent = text;
}

// keep the phone screen on while presenting (where the browser allows it)
let lock = null;
async function keepAwake() { try { if (!lock && navigator.wakeLock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch (e) {} }
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') { if (lock === null && state) keepAwake(); if (es && room) hello(); } });
})();
