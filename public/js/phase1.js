// phase1.js — Multi-Sensor Convergence Funnel
const Phase1 = (() => {
  let fieldData = null;
  let pipelineSteps = null;
  let targets = [];
  let revealedCount = 0;
  let revealTimer = null;
  let selectedTargetId = null;

  function render(container, seed) {
    container.innerHTML = `
      <div class="section-heading">
        <h2>Multi-Sensor Convergence Funnel</h2>
        <div class="rule"></div>
      </div>
      <p class="lede">
        An 8-step computational pipeline forces independent physical disciplines — thermodynamics,
        cosmic-ray neutron physics, radar polarimetry, dielectric inversion, and temporal
        interferometry — to corroborate one another over a simulated 42×42 cell Shackleton crater
        floor. Each gate runs live against fresh data and only forwards cells that survive every
        prior test.
      </p>

      <div class="card">
        <div class="card-head">
          <span class="card-title">Filtering Pipeline</span>
          <span class="card-sub" id="pipelineSummary">RUNNING…</span>
        </div>
        <div class="pipeline-list" id="pipelineList"></div>
      </div>

      <div class="section-heading">
        <h2>Cost Map &amp; Target Geofences</h2>
        <div class="rule"></div>
      </div>
      <p class="lede">
        Step 8's Dynamic Adaptive Quadtree fractures the survivor field into geofenced cells,
        each scored for Ice Yield, Hazard, and Energy cost. Click a highlighted cell or row
        to select it for the HAV strike sequence.
      </p>

      <div class="crater-stage">
        <div>
          <div class="crater-canvas-wrap">
            <canvas id="craterCanvas" width="600" height="600"></canvas>
          </div>
          <div class="crater-legend">
            <div class="legend-item"><span class="legend-swatch" style="background:#0d1a28"></span>Sunlit / rejected</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#2D4E63"></span>PSR survivor</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#5FA8D3"></span>High ice-yield geofence</div>
            <div class="legend-item"><span class="legend-swatch" style="background:#4C8DFF"></span>Selected target</div>
          </div>
        </div>
        <div>
          <div class="card-sub" style="margin-bottom:10px;">TOP GEOFENCED CELLS — RANKED BY ICE YIELD</div>
          <div class="target-list" id="targetList"></div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn" id="proceedToHav" disabled>PROCEED TO HAV STRIKE →</button>
        <button class="btn btn-secondary" id="rerunPipeline">↻ RE-RUN PIPELINE</button>
      </div>
    `;

    document.getElementById('rerunPipeline').addEventListener('click', () => load(seed));
    document.getElementById('proceedToHav').addEventListener('click', () => {
      if (selectedTargetId) window.MahakashMain.goToPhase(2, selectedTargetId);
    });

    load(seed);
  }

  async function load(seed) {
    clearTimeout(revealTimer);
    revealedCount = 0;
    selectedTargetId = null;
    MissionLog.log('p1', `Requesting orbital dataset fusion for crater seed ${seed}…`);

    const [field, pipeline, targetData] = await Promise.all([
      MahakashAPI.getField(seed),
      MahakashAPI.getPipeline(seed),
      MahakashAPI.getTargets(seed, 14),
    ]);

    fieldData = field;
    pipelineSteps = pipeline.steps;
    targets = targetData.targets;

    renderPipelineSkeleton();
    revealSteps();
    drawCraterMap();
    renderTargetList();
  }

  function renderPipelineSkeleton() {
    const list = document.getElementById('pipelineList');
    list.innerHTML = pipelineSteps.map((s) => `
      <div class="pipeline-step" data-step="${s.step}">
        <div class="step-num">${String(s.step).padStart(2, '0')}</div>
        <div class="step-body">
          <div class="step-title">${s.name}</div>
          <div class="step-desc">${s.description}</div>
        </div>
        <div class="step-metrics">
          <div class="step-bar-track"><div class="step-bar-fill" style="width:0%"></div></div>
          <div class="step-count">— / ${s.total}</div>
        </div>
      </div>`).join('');
    document.getElementById('pipelineSummary').textContent = 'RUNNING…';
  }

  function revealSteps() {
    const stepEls = document.querySelectorAll('.pipeline-step');
    function tick() {
      if (revealedCount > 0) {
        stepEls[revealedCount - 1].classList.remove('current');
        stepEls[revealedCount - 1].classList.add('complete');
      }
      if (revealedCount >= pipelineSteps.length) {
        document.getElementById('pipelineSummary').textContent =
          `COMPLETE · ${pipelineSteps[pipelineSteps.length - 1].survivors} GEOFENCED CELLS`;
        MissionLog.log('p1', `Pipeline converged: ${pipelineSteps[pipelineSteps.length - 1].survivors} verified targets from ${pipelineSteps[0].total} candidate cells.`);
        return;
      }
      const s = pipelineSteps[revealedCount];
      const el = stepEls[revealedCount];
      el.classList.add('revealed', 'current');
      const pct = (s.survivors / s.total) * 100;
      el.querySelector('.step-bar-fill').style.width = `${pct}%`;
      el.querySelector('.step-count').innerHTML = `<b>${s.survivors}</b> / ${s.total} · ${s.rejectedPct}% rejected`;
      MissionLog.log('p1', `Step ${s.step} — ${s.name}: ${s.survivors} cells survive (${s.rejectedPct}% cumulative rejection).`);
      revealedCount++;
      revealTimer = setTimeout(tick, 520);
    }
    tick();
  }

  function drawCraterMap() {
    const canvas = document.getElementById('craterCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { gridSize, cells } = fieldData;
    const cellPx = canvas.width / gridSize;
    const topTargetIds = new Set(targets.map((t) => t.id));

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#040608';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const c of cells) {
      const px = c.x * cellPx;
      const py = c.y * cellPx;
      let color = c.inCrater ? '#0e1a27' : '#090d13';

      if (c.illumination <= 0.001 && c.maxTemp <= 95) {
        const yieldGuess = Math.min(1, (c.hydrogen + c.radar) / 2);
        color = lerpColor('#1c2e3f', '#2D4E63', yieldGuess);
      }
      if (topTargetIds.has(c.id)) {
        const t = targets.find((tg) => tg.id === c.id);
        const strength = t.iceYieldScore / 100;
        color = lerpColor('#3d6f8f', '#5FA8D3', strength);
      }
      if (c.id === selectedTargetId) color = '#4C8DFF';

      ctx.fillStyle = color;
      ctx.fillRect(px, py, Math.ceil(cellPx), Math.ceil(cellPx));
    }

    // crater rim outline
    ctx.strokeStyle = 'rgba(76,141,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(
      fieldData.crater.cx * cellPx,
      fieldData.crater.cy * cellPx,
      fieldData.crater.radius * cellPx,
      0, Math.PI * 2
    );
    ctx.stroke();

    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const gx = Math.floor(((e.clientX - rect.left) * scaleX) / cellPx);
      const gy = Math.floor(((e.clientY - rect.top)  * scaleY) / cellPx);
      const id = `${gx}_${gy}`;
      if (topTargetIds.has(id)) selectTarget(id);
    };
  }

  function lerpColor(a, b, t) {
    const pa = hexToRgb(a), pb = hexToRgb(b);
    return `rgb(${Math.round(pa.r+(pb.r-pa.r)*t)},${Math.round(pa.g+(pb.g-pa.g)*t)},${Math.round(pa.b+(pb.b-pa.b)*t)})`;
  }
  function hexToRgb(hex) {
    const v = hex.replace('#','');
    return { r: parseInt(v.slice(0,2),16), g: parseInt(v.slice(2,4),16), b: parseInt(v.slice(4,6),16) };
  }

  function renderTargetList() {
    const list = document.getElementById('targetList');
    list.innerHTML = targets.map((t) => `
      <div class="target-row" data-id="${t.id}">
        <span class="target-row-id">CELL ${t.id}</span>
        <span class="target-row-score">ICE ${t.iceYieldScore}</span>
        <span class="target-row-meta">Hazard ${t.hazardScore} · ε ${t.dielectric.toFixed(2)} · Coherence ${t.coherence.toFixed(2)}</span>
      </div>`).join('');
    list.querySelectorAll('.target-row').forEach((row) => {
      row.addEventListener('click', () => selectTarget(row.dataset.id));
    });
  }

  function selectTarget(id) {
    selectedTargetId = id;
    document.querySelectorAll('.target-row').forEach((r) =>
      r.classList.toggle('selected', r.dataset.id === id));
    document.getElementById('proceedToHav').disabled = false;
    drawCraterMap();
    const t = targets.find((tg) => tg.id === id);
    MissionLog.log('p1', `Target cell ${id} selected: Ice Yield ${t.iceYieldScore}, Hazard ${t.hazardScore}, ε ${t.dielectric.toFixed(2)}.`);
  }

  function getSelectedTarget() {
    return targets.find((t) => t.id === selectedTargetId) || null;
  }

  return { render, getSelectedTarget };
})();
