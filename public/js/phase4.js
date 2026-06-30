// phase4.js — Digital Twin Engine & ISRU Outpost Foundation
const Phase4 = (() => {
  function render(container, seed, targetId) {
    if (!targetId) {
      container.innerHTML = `
        <div class="section-heading">
          <h2>Outpost Foundation — Digital Twin &amp; ISRU</h2>
          <div class="rule"></div>
        </div>
        <div class="locked-msg">
          <div class="glyph">04</div>
          <p>The Digital Twin Engine requires a completed DTN data bundle. Converge on a target
          in <b style="color:var(--ink)">Phase 1</b> and complete the HAV strike in
          <b style="color:var(--ink)">Phase 2</b> first.</p>
          <button class="btn btn-secondary" id="backToPhase1">← BACK TO PHASE 1</button>
        </div>
      `;
      document.getElementById('backToPhase1').addEventListener('click', () => window.MahakashMain.goToPhase(1));
      return;
    }

    container.innerHTML = `
      <div class="section-heading">
        <h2>Lunar Digital Twin</h2>
        <div class="rule"></div>
      </div>
      <p class="lede">
        The DTN bundle from cell ${targetId} has been fused into a unified material dataset —
        muon tomography density matrices layered with Terahertz, Raman, and LIBS spectral
        signatures — and rendered as a 3D holographic subsurface model.
      </p>

      <div class="twin-layout">
        <div class="card">
          <div class="card-head">
            <span class="card-title">3D Holographic Subsurface Rendering</span>
            <span class="card-sub">FUSION MATRIX · CELL ${targetId}</span>
          </div>
          <div style="aspect-ratio:16/9; background:var(--void); border-radius:3px; border:1px solid var(--panel-edge); overflow:hidden;">
            <svg id="twinSvg" width="100%" height="100%" viewBox="0 0 600 340"></svg>
          </div>
          <div class="contaminant-key">
            <div class="contaminant-row"><span class="contaminant-dot" style="background:#5FA8D3"></span>Blue — high-yield pristine H₂O (extraction target)</div>
            <div class="contaminant-row"><span class="contaminant-dot" style="background:#D8643F"></span>Red — toxin zone (heavy metals, filtration risk)</div>
            <div class="contaminant-row"><span class="contaminant-dot" style="background:#7FE07F"></span>Green — entrapped volatile gases (secondary resource)</div>
          </div>
        </div>

        <div class="hav-side">
          <div class="card">
            <div class="card-head"><span class="card-title">Material Verdict</span></div>
            <div class="readout-grid" id="materialReadout">
              <div class="readout"><div class="readout-label">LOADING…</div><div class="readout-value">—</div></div>
            </div>
          </div>
          <div class="card">
            <div class="card-head"><span class="card-title">ISRU Propellant Estimate</span></div>
            <div class="propellant-tank" id="propellantTank">
              <p style="font-size:11px;color:var(--ink-dim);">Computing…</p>
            </div>
          </div>
        </div>
      </div>

      <div class="section-heading">
        <h2>ISRU Extraction Lander Configuration</h2>
        <div class="rule"></div>
      </div>
      <div class="card">
        <div class="readout-grid">
          <div class="readout"><div class="readout-label">LANDING SITE</div><div class="readout-value" style="font-size:14px;">CELL ${targetId}</div></div>
          <div class="readout"><div class="readout-label">DRILL SYSTEM</div><div class="readout-value" style="font-size:13px;">THERMAL-ACOUSTIC</div></div>
          <div class="readout"><div class="readout-label">REFINERY</div><div class="readout-value" style="font-size:13px;">SOLAR HYDROLYSIS</div></div>
          <div class="readout"><div class="readout-label">PRIMARY OUTPUT</div><div class="readout-value" style="font-size:13px;">LH2 / LOX</div></div>
          <div class="readout"><div class="readout-label">POWER SOURCE</div><div class="readout-value" style="font-size:13px;">FISSION + SOLAR</div></div>
          <div class="readout"><div class="readout-label">MISSION TYPE</div><div class="readout-value" style="font-size:13px;">ISRU INDUSTRIAL</div></div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-secondary" id="newMission">↻ START NEW MISSION — CHANGE SEED</button>
      </div>
    `;

    document.getElementById('newMission').addEventListener('click', () => window.MahakashMain.reseedMission());
    load(seed, targetId);
  }

  async function load(seed, targetId) {
    MissionLog.log('p4', `Digital Twin Engine ingesting DTN bundle for cell ${targetId}…`);

    const target = await MahakashAPI.getTarget(seed, targetId);
    const purity = Math.min(99.5, 90 + target.dielectric * 2.6);
    const density = 0.85 + (target.dielectric - 2.7) * 0.18;
    const contaminants = target.hazardScore > 40 ? ['trace regolith silicate'] : [];

    const twin = await MahakashAPI.getDigitalTwin(
      seed, targetId,
      Number(purity.toFixed(1)),
      Number(density.toFixed(3)),
      contaminants
    );

    renderMaterialReadout(twin);
    renderPropellantTank(twin);
    drawTwinSvg(target, twin);

    MissionLog.log('p4', `Classification: ${twin.classification.toUpperCase()} ZONE · H2O purity ${twin.purity}% · density ${twin.density} g/cm³`);
    MissionLog.log('p4', `Propellant yield estimate: ${twin.propellantEstimate.lh2Kg.toLocaleString()} kg LH2 / ${twin.propellantEstimate.loxKg.toLocaleString()} kg LOX per 30-sol cycle.`);
  }

  function renderMaterialReadout(twin) {
    const el = document.getElementById('materialReadout');
    const zoneColor = twin.classification === 'blue' ? '' : 'warn';
    el.innerHTML = `
      <div class="readout">
        <div class="readout-label">H2O PURITY</div>
        <div class="readout-value">${twin.purity}<span class="readout-unit">%</span></div>
      </div>
      <div class="readout">
        <div class="readout-label">DENSITY</div>
        <div class="readout-value">${twin.density}<span class="readout-unit">g/cm³</span></div>
      </div>
      <div class="readout">
        <div class="readout-label">ZONE CLASS</div>
        <div class="readout-value ${zoneColor}" style="font-size:14px;">${twin.classification.toUpperCase()}</div>
      </div>
      <div class="readout">
        <div class="readout-label">CONTAMINANTS</div>
        <div class="readout-value" style="font-size:12px; line-height:1.3;">
          ${twin.contaminants.length ? twin.contaminants.join(', ') : 'NONE DETECTED'}
        </div>
      </div>
    `;
  }

  function renderPropellantTank(twin) {
    const el = document.getElementById('propellantTank');
    el.innerHTML = `
      <div class="tank-row">
        <span class="tank-label">LH2</span>
        <div class="tank-track"><div class="tank-fill lh2" id="lh2Fill"></div></div>
        <span class="tank-value">${twin.propellantEstimate.lh2Kg.toLocaleString()} kg</span>
      </div>
      <div class="tank-row">
        <span class="tank-label">LOX</span>
        <div class="tank-track"><div class="tank-fill lox" id="loxFill"></div></div>
        <span class="tank-value">${twin.propellantEstimate.loxKg.toLocaleString()} kg</span>
      </div>
      <p style="font-size:11px; color:var(--ink-dim); line-height:1.55; margin-top:8px;">
        ${twin.propellantEstimate.note}
      </p>
    `;
    requestAnimationFrame(() => {
      const lh2 = document.getElementById('lh2Fill');
      const lox = document.getElementById('loxFill');
      if (lh2) lh2.style.width = '62%';
      if (lox) lox.style.width = '88%';
    });
  }

  function drawTwinSvg(target, twin) {
    const svg = document.getElementById('twinSvg');
    if (!svg) return;
    const color = twin.classification === 'blue' ? '#5FA8D3' : '#D8643F';
    const layers = 6;
    let rects = '';
    const labelDepths = ['0 m', '−0.8 m', '−1.6 m', '−2.4 m', '−3.2 m', '−4.0 m'];
    for (let i = 0; i < layers; i++) {
      const y = 55 + i * 36;
      const op = 0.1 + (i / layers) * 0.55;
      rects += `
        <rect x="100" y="${y}" width="400" height="28" rx="2"
          fill="${color}" opacity="${op.toFixed(2)}" stroke="${color}" stroke-width="0.5">
          <animate attributeName="opacity"
            values="${(op*0.35).toFixed(2)};${op.toFixed(2)};${(op*0.35).toFixed(2)}"
            dur="${(2.8 + i * 0.3).toFixed(1)}s" repeatCount="indefinite"/>
        </rect>
        <text x="94" y="${y + 18}" text-anchor="end" fill="#6F7A8C"
          font-family="JetBrains Mono" font-size="9">${labelDepths[i]}</text>
      `;
    }
    const lastY = 55 + layers * 36;
    svg.innerHTML = `
      <text x="300" y="28" text-anchor="middle" fill="#C4C9D2"
        font-family="JetBrains Mono" font-size="11" letter-spacing="0.06em">
        SUBSURFACE DENSITY MATRIX — CELL ${target.id} · DIELECTRIC ε ${target.dielectric.toFixed(3)}
      </text>
      <line x1="100" y1="48" x2="100" y2="${lastY}" stroke="#2A313D" stroke-width="1"/>
      ${rects}
      <text x="300" y="${lastY + 20}" text-anchor="middle" fill="#6F7A8C"
        font-family="JetBrains Mono" font-size="9">
        ICE YIELD SCORE ${target.iceYieldScore} · COHERENCE ${target.coherence.toFixed(2)} · THERMAL INERTIA ${target.thermalInertia.toFixed(2)}
      </text>
    `;
  }

  return { render };
})();
