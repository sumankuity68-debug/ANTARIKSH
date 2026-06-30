// main.js — app orchestration
const MahakashMain = (() => {
  let currentPhase = 1;
  let seed = 1337;
  let selectedTargetId = null;
  let clockTimer = null;
  let missionStart = Date.now();

  const stage = () => document.getElementById('stage');

  function init() {
    runBootSequence();
    document.getElementById('seedBtn').addEventListener('click', reseedMission);
    document.getElementById('seedInput').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') reseedMission();
    });
    document.querySelectorAll('.phase-btn').forEach((btn) => {
      btn.addEventListener('click', () => goToPhase(Number(btn.dataset.phase)));
    });
    startClock();
  }

  function runBootSequence() {
    const fill   = document.getElementById('bootFill');
    const status = document.getElementById('bootStatus');
    const steps  = [
      'INITIALIZING TELEMETRY LINK…',
      'LOADING LOLA / DIVINER ORBITAL DATASETS…',
      'CALIBRATING DFSAR POLARIMETRIC MODEL…',
      'ESTABLISHING DTN RELAY HANDSHAKE…',
      'MISSION CONSOLE READY — AWAITING OPERATOR',
    ];
    let i = 0;
    const step = () => {
      fill.style.width = `${((i + 1) / steps.length) * 100}%`;
      status.textContent = steps[i];
      i++;
      if (i < steps.length) {
        setTimeout(step, 360);
      } else {
        setTimeout(() => {
          document.getElementById('bootScreen').classList.add('hidden');
          document.getElementById('console').removeAttribute('aria-hidden');
          MissionLog.log('sys', 'Mahakash Antariksh mission console online.');
          MissionLog.log('sys', `Crater field seed ${seed}. Awaiting Phase 1 pipeline convergence.`);
          renderCurrentPhase();
        }, 300);
      }
    };
    step();
  }

  function startClock() {
    const el = document.getElementById('missionClock');
    clearInterval(clockTimer);
    clockTimer = setInterval(() => {
      const ms = Date.now() - missionStart;
      const totalSec = Math.floor(ms / 1000);
      const days = String(Math.floor(totalSec / 86400)).padStart(2, '0');
      const hrs  = String(Math.floor((totalSec % 86400) / 3600)).padStart(2, '0');
      const mins = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
      const secs = String(totalSec % 60).padStart(2, '0');
      el.textContent = `${days}:${hrs}:${mins}:${secs}`;
    }, 1000);
  }

  function goToPhase(phaseNum, carryTargetId) {
    if (carryTargetId) selectedTargetId = carryTargetId;
    currentPhase = phaseNum;

    document.querySelectorAll('.phase-btn').forEach((btn) => {
      const n = Number(btn.dataset.phase);
      btn.classList.toggle('active', n === phaseNum);
      const stateEl = btn.querySelector('.phase-state');
      if (n === phaseNum) {
        stateEl.textContent = 'ACTIVE';
        stateEl.dataset.state = 'active';
      } else if (n < phaseNum) {
        stateEl.textContent = 'COMPLETE';
        stateEl.dataset.state = 'done';
      } else {
        stateEl.textContent = 'STANDBY';
        stateEl.dataset.state = 'locked';
      }
    });

    stage().scrollTop = 0;
    renderCurrentPhase();
  }

  function renderCurrentPhase() {
    const container = stage();
    if (currentPhase === 1) {
      Phase1.render(container, seed);
    } else if (currentPhase === 2) {
      if (!selectedTargetId) {
        const t = Phase1.getSelectedTarget && Phase1.getSelectedTarget();
        if (t) selectedTargetId = t.id;
      }
      if (!selectedTargetId) {
        container.innerHTML = `
          <div class="section-heading">
            <h2>HAV Strike Platform</h2>
            <div class="rule"></div>
          </div>
          <div class="locked-msg">
            <div class="glyph">02</div>
            <p>No target cell selected. Return to <b style="color:var(--ink)">Phase 1</b> and
            select a verified ice geofence from the Cost Map before authorizing a strike.</p>
            <button class="btn btn-secondary" id="backToPhase1" style="margin-top:8px;">← BACK TO PHASE 1</button>
          </div>
        `;
        document.getElementById('backToPhase1').addEventListener('click', () => goToPhase(1));
        return;
      }
      Phase2.render(container, seed, selectedTargetId, () => goToPhase(4, selectedTargetId));
    } else if (currentPhase === 3) {
      Phase3.render(container, seed, selectedTargetId);
    } else if (currentPhase === 4) {
      Phase4.render(container, seed, selectedTargetId);
    }
  }

  function reseedMission() {
    const input = document.getElementById('seedInput');
    const val = Number(input.value) || Math.floor(Math.random() * 9000) + 1000;
    seed = val;
    input.value = seed;
    selectedTargetId = null;
    currentPhase = 1;
    missionStart = Date.now();
    MissionLog.reset();
    MissionLog.log('sys', `Mission reseeded. New crater field under seed ${seed}.`);
    goToPhase(1);
  }

  return { goToPhase, reseedMission, init };
})();

window.MahakashMain = MahakashMain;
document.addEventListener('DOMContentLoaded', MahakashMain.init);
