// phase2.js — HAV Strike Platform + Kinetic Dart Sequence (shared timeline renderer)
const StrikeSequence = (() => {
  let timeline = null;
  let target = null;
  let revealIndex = 0;
  let revealTimer = null;
  let onComplete = null;

  function render(container, seed, targetId, completeCallback) {
    onComplete = completeCallback;
    container.innerHTML = `
      <div class="section-heading">
        <h2>HAV Strike &amp; Kinetic Dart Sequence</h2>
        <div class="rule"></div>
      </div>
      <p class="lede">
        The High Altitude Vehicle executes a Macro/Micro-Geofence handshake, predictive gimbal
        scheduling, and a Hybrid Gauss ejection. The Kinetic Dart then falls, impacts at
        hyper-velocity, and scans the buried ice — all as one continuous telemetry stream.
      </p>

      <div class="strike-layout">
        <div class="card">
          <div class="card-head">
            <span class="card-title">Mission Timeline</span>
            <span class="card-sub" id="strikeProgress">QUEUED</span>
          </div>
          <div class="timeline-list" id="timelineList"></div>
        </div>

        <div class="hav-side">
          <div class="card">
            <div class="card-head"><span class="card-title">Target Cell</span></div>
            <div class="readout-grid">
              <div class="readout">
                <div class="readout-label">GEOFENCE ID</div>
                <div class="readout-value" style="font-size:15px;">${targetId}</div>
              </div>
              <div class="readout">
                <div class="readout-label">ICE YIELD SCORE</div>
                <div class="readout-value" id="telIceYield">—</div>
              </div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><span class="card-title">Live Telemetry</span></div>
            <div class="readout-grid">
              <div class="readout">
                <div class="readout-label">PHASE</div>
                <div class="readout-value accent" id="telPhase">2 · ORBITAL</div>
              </div>
              <div class="readout">
                <div class="readout-label">VELOCITY</div>
                <div class="readout-value" id="telVel">6,000 <span class="readout-unit">km/h</span></div>
              </div>
              <div class="readout">
                <div class="readout-label">ALTITUDE</div>
                <div class="readout-value" id="telAlt">20 <span class="readout-unit">km</span></div>
              </div>
              <div class="readout">
                <div class="readout-label">CURRENT EVENT</div>
                <div class="readout-value" id="telEvent" style="font-size:12px; line-height:1.3;">STANDBY</div>
              </div>
            </div>
          </div>
          <div class="card hav-schematic">
            <svg id="havSchematic" width="100%" height="170" viewBox="0 0 280 170"></svg>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn" id="proceedToTwin" disabled>PROCEED TO DIGITAL TWIN →</button>
        <button class="btn btn-secondary" id="replayStrike">↻ REPLAY SEQUENCE</button>
      </div>
    `;

    document.getElementById('replayStrike').addEventListener('click', () => load(seed, targetId));
    document.getElementById('proceedToTwin').addEventListener('click', () => {
      if (onComplete) onComplete();
    });

    drawHavSchematic(2, '');
    load(seed, targetId);
  }

  async function load(seed, targetId) {
    clearTimeout(revealTimer);
    revealIndex = 0;
    MissionLog.log('p2', `Macro-Geofence handshake requested for target ${targetId}.`);

    const result = await MahakashAPI.runStrike(seed, targetId);
    timeline = result.timeline;
    target = result.target;

    const iceEl = document.getElementById('telIceYield');
    if (iceEl) iceEl.textContent = target.iceYieldScore;

    document.getElementById('proceedToTwin').disabled = true;
    document.getElementById('strikeProgress').textContent = 'IN PROGRESS';
    renderTimelineSkeleton();
    revealEvents();
  }

  function renderTimelineSkeleton() {
    const list = document.getElementById('timelineList');
    list.innerHTML = timeline.map((e, i) => `
      <div class="timeline-event" data-i="${i}">
        <div class="event-t">+${(e.t / 1000).toFixed(1)}s</div>
        <div class="event-rail">
          <div class="event-dot"></div>
          ${i < timeline.length - 1 ? '<div class="event-line"></div>' : ''}
        </div>
        <div class="event-body">
          <div class="event-title">
            ${e.title}
            <span class="phase-badge p${e.phase}">PHASE ${e.phase}</span>
          </div>
          <div class="event-detail">${e.detail}</div>
          <div class="event-data" data-data-row></div>
        </div>
      </div>`).join('');
  }

  function revealEvents() {
    const els = document.querySelectorAll('.timeline-event');
    function tick() {
      if (revealIndex > 0) els[revealIndex - 1].classList.remove('current');
      if (revealIndex >= timeline.length) {
        document.getElementById('strikeProgress').textContent = 'SEQUENCE COMPLETE';
        document.getElementById('telEvent').textContent = 'DTN BUNDLE RELAYED';
        document.getElementById('proceedToTwin').disabled = false;
        MissionLog.log('p3', 'DTN bundle handoff confirmed. Strike sequence complete.');
        return;
      }

      const e = timeline[revealIndex];
      const el = els[revealIndex];
      el.classList.add('revealed', 'current');

      if (e.data) {
        const row = el.querySelector('[data-data-row]');
        row.innerHTML = Object.entries(e.data)
          .filter(([, v]) => v !== null && v !== undefined)
          .map(([k, v]) => `<span class="event-data-chip">${formatKey(k)}: ${formatVal(v)}</span>`)
          .join('');
      }

      el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      updateTelemetry(e);
      MissionLog.log(e.phase === 2 ? 'p2' : 'p3', `${e.title} — ${e.detail}`);
      drawHavSchematic(e.phase, e.title);

      revealIndex++;
      const delay = e.title.includes('Sublimation') ? 1500
                  : e.title.includes('Descent')     ? 1600
                  : 950;
      revealTimer = setTimeout(tick, delay);
    }
    tick();
  }

  function formatKey(k) {
    return k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim().toUpperCase();
  }
  function formatVal(v) {
    if (typeof v === 'boolean') return v ? 'YES' : 'NO';
    if (Array.isArray(v)) return v.length ? v.join(', ') : 'NONE';
    return v;
  }

  function updateTelemetry(e) {
    const phaseEl = document.getElementById('telPhase');
    const velEl   = document.getElementById('telVel');
    const altEl   = document.getElementById('telAlt');
    const eventEl = document.getElementById('telEvent');
    if (!phaseEl) return;

    eventEl.textContent = e.title.toUpperCase();

    if (e.phase === 2) {
      phaseEl.textContent = '2 · ORBITAL';
      phaseEl.className = 'readout-value accent';
      velEl.innerHTML = '6,000 <span class="readout-unit">km/h</span>';
      altEl.innerHTML = '20 <span class="readout-unit">km</span>';
    } else {
      phaseEl.textContent = '3 · DART';
      phaseEl.className = 'readout-value';
      if (e.title.includes('Impact')) {
        velEl.innerHTML = `${(e.data?.impactSpeed || 6000).toLocaleString()} <span class="readout-unit">km/h</span>`;
        altEl.innerHTML = '0 <span class="readout-unit">km (surface)</span>';
      } else if (e.title.includes('Descent') || e.title.includes('Brake')) {
        velEl.innerHTML = '0 <span class="readout-unit">km/h (lateral)</span>';
        altEl.innerHTML = '~2 <span class="readout-unit">km falling</span>';
      } else {
        velEl.innerHTML = '0 <span class="readout-unit">km/h</span>';
        altEl.innerHTML = '-1.5 <span class="readout-unit">m subsurface</span>';
      }
    }
  }

  function drawHavSchematic(phase, eventTitle) {
    const svg = document.getElementById('havSchematic');
    if (!svg) return;
    const isDart = phase === 3;
    svg.innerHTML = `
      <g stroke="#2A313D" stroke-width="1" fill="none">
        <ellipse cx="140" cy="140" rx="90" ry="14" stroke-dasharray="3 4"/>
      </g>
      <text x="140" y="158" text-anchor="middle" fill="#6F7A8C" font-family="JetBrains Mono" font-size="9">PSR BASIN FLOOR</text>
      ${isDart ? dartSvg(eventTitle) : havSvg(eventTitle)}
    `;
  }

  function havSvg(eventTitle) {
    const firing = eventTitle && (eventTitle.includes('Ejection') || eventTitle.includes('Firing'));
    return `
      <g transform="translate(140,46)">
        <rect x="-46" y="-10" width="92" height="20" rx="4" fill="#171C25" stroke="#4C8DFF" stroke-width="1.3"/>
        <rect x="-58" y="-3" width="14" height="6" fill="#12161D" stroke="#2A313D"/>
        <rect x="44"  y="-3" width="14" height="6" fill="#12161D" stroke="#2A313D"/>
        <circle cx="0" cy="0" r="3" fill="${firing ? '#4C8DFF' : '#2A313D'}">
          ${firing ? '<animate attributeName="r" values="3;6;3" dur="0.6s" repeatCount="2"/>' : ''}
        </circle>
        <line x1="0" y1="10" x2="0" y2="${firing ? 80 : 22}"
          stroke="${firing ? '#4C8DFF' : '#2A313D'}" stroke-width="1.5" stroke-dasharray="2 3">
        </line>
      </g>
      <text x="140" y="72" text-anchor="middle" fill="#4C8DFF" font-family="JetBrains Mono" font-size="9">HAV · 20 km ORBIT · 1.67 km/s</text>
    `;
  }

  function dartSvg(eventTitle) {
    const buried = eventTitle && !['Impact','Descent','Brake','Flywheel','Compensation'].some(w => eventTitle.includes(w));
    const y = buried ? 128 : 90;
    return `
      <g transform="translate(140,${y})">
        <polygon points="0,-16 6,8 -6,8" fill="#5FA8D3" stroke="#2D4E63" stroke-width="1"/>
        ${buried ? `<circle cx="0" cy="2" r="20" fill="none" stroke="#5FA8D3" stroke-width="0.6" opacity="0.4">
          <animate attributeName="r" values="10;24;10" dur="2.4s" repeatCount="indefinite"/>
        </circle>` : ''}
      </g>
      <text x="140" y="${y + 28}" text-anchor="middle" fill="#5FA8D3" font-family="JetBrains Mono" font-size="9">
        ${buried ? 'DART BURIED · SCANNING' : 'DART IN FLIGHT'}
      </text>
    `;
  }

  return { render };
})();

const Phase2 = StrikeSequence;
