// terminal.js — mission log feed
const MissionLog = (() => {
  const body = document.getElementById('terminalBody');
  let bootTime = Date.now();

  function elapsed() {
    const ms = Date.now() - bootTime;
    const s = Math.floor(ms / 1000);
    const mm = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `T+${mm}:${ss}`;
  }

  const labels = { sys: 'SYS', p1: 'PH1', p2: 'PH2', p3: 'PH3', p4: 'PH4', warn: 'WARN' };

  function log(tag, message) {
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `
      <span class="log-time">${elapsed()}</span>
      <span class="log-tag ${tag}">${labels[tag] || tag.toUpperCase()}</span>
      <span class="log-msg">${escapeHtml(message)}</span>
    `;
    body.appendChild(line);
    body.scrollTop = body.scrollHeight;
    while (body.children.length > 400) body.removeChild(body.firstChild);
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function reset() {
    bootTime = Date.now();
    body.innerHTML = '';
  }

  return { log, reset };
})();
