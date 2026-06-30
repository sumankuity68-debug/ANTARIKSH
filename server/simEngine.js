// simEngine.js
// Deterministic but pseudo-random simulation of the Phase 1 Multi-Sensor
// Convergence Funnel. Generates a synthetic crater grid (mimicking the
// Shackleton crater floor), then actually executes each of the 8 software
// filtering steps in sequence, narrowing the surviving cell set the way the
// mission document describes it.

const GRID_SIZE = 42;

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dist(x1, y1, x2, y2) {
  return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

function buildCraterField(seed) {
  const rng = mulberry32(seed);
  const cx = GRID_SIZE / 2 + (rng() - 0.5) * 4;
  const cy = GRID_SIZE / 2 + (rng() - 0.5) * 4;
  const craterR = GRID_SIZE * 0.42;

  const truePockets = [];
  const pocketCount = 3 + Math.floor(rng() * 2);
  for (let i = 0; i < pocketCount; i++) {
    const ang = rng() * Math.PI * 2;
    const r = rng() * craterR * 0.55;
    truePockets.push({
      x: cx + Math.cos(ang) * r,
      y: cy + Math.sin(ang) * r,
      radius: 1.4 + rng() * 1.6,
      strength: 0.75 + rng() * 0.25,
    });
  }

  const decoyClusters = [];
  const decoyCount = 4 + Math.floor(rng() * 4);
  for (let i = 0; i < decoyCount; i++) {
    const ang = rng() * Math.PI * 2;
    const r = rng() * craterR * 0.85;
    decoyClusters.push({
      x: cx + Math.cos(ang) * r,
      y: cy + Math.sin(ang) * r,
      radius: 1.0 + rng() * 1.8,
      strength: 0.6 + rng() * 0.35,
    });
  }

  const cells = [];
  for (let y = 0; y < GRID_SIZE; y++) {
    for (let x = 0; x < GRID_SIZE; x++) {
      const dC = dist(x, y, cx, cy);
      const inCrater = dC < craterR;

      const rimFalloff = Math.max(0, (dC - craterR * 0.48) / (craterR * 0.52));
      const illumination = inCrater
        ? Math.max(0, Math.pow(Math.min(1, rimFalloff), 3) - rng() * 0.01)
        : 0.55 + rng() * 0.45;

      const baseTemp = inCrater ? 35 + Math.pow(Math.min(1, rimFalloff), 1.8) * 220 + rng() * 4 : 180 + rng() * 100;
      const maxTemp = baseTemp + (illumination > 0 ? illumination * 50 : rng() * 2);

      let decoyInfluence = 0;
      for (const d2 of decoyClusters) {
        const dd = dist(x, y, d2.x, d2.y);
        decoyInfluence += d2.strength * Math.exp(-(dd * dd) / (2 * d2.radius * d2.radius));
      }
      decoyInfluence = Math.min(1, decoyInfluence);
      const isDecoyRock = decoyInfluence > 0.45;

      let hydrogen = rng() * 0.12;
      for (const p of truePockets) {
        const d = dist(x, y, p.x, p.y);
        hydrogen += p.strength * Math.exp(-(d * d) / (2 * p.radius * p.radius));
      }
      hydrogen = Math.min(1, hydrogen);

      let radar = 0.06 + rng() * 0.08;
      for (const p of truePockets) {
        const d = dist(x, y, p.x, p.y);
        radar += p.strength * Math.exp(-(d * d) / (2 * p.radius * p.radius));
      }
      radar += decoyInfluence * 0.85;
      radar = Math.min(1, radar);

      const wallProximity = Math.abs(dC - craterR);
      const slope = inCrater
        ? Math.max(0, 12 - wallProximity * 1.4) + rng() * 4 + decoyInfluence * 14
        : rng() * 25;
      const roughness = Math.min(1, decoyInfluence * 0.9 + rng() * 0.25);

      let dielectric = 2.55 + rng() * 0.15;
      for (const p of truePockets) {
        const d = dist(x, y, p.x, p.y);
        dielectric += 0.62 * p.strength * Math.exp(-(d * d) / (2 * p.radius * p.radius));
      }
      dielectric -= decoyInfluence * 0.1;

      let coherence = 0.35 + rng() * 0.2;
      for (const p of truePockets) {
        const d = dist(x, y, p.x, p.y);
        coherence += 0.58 * p.strength * Math.exp(-(d * d) / (2 * p.radius * p.radius));
      }
      coherence -= decoyInfluence * 0.22;
      coherence = Math.min(0.99, Math.max(0.05, coherence));

      let thermalInertia = 0.12 + rng() * 0.08;
      for (const p of truePockets) {
        const d = dist(x, y, p.x, p.y);
        thermalInertia += 0.62 * p.strength * Math.exp(-(d * d) / (2 * p.radius * p.radius));
      }
      thermalInertia = Math.min(1, thermalInertia);

      cells.push({
        id: `${x}_${y}`,
        x, y,
        inCrater,
        illumination: Number(illumination.toFixed(3)),
        maxTemp: Number(maxTemp.toFixed(1)),
        hydrogen: Number(hydrogen.toFixed(3)),
        radar: Number(radar.toFixed(3)),
        slope: Number(slope.toFixed(2)),
        roughness: Number(roughness.toFixed(3)),
        dielectric: Number(dielectric.toFixed(3)),
        coherence: Number(coherence.toFixed(3)),
        thermalInertia: Number(thermalInertia.toFixed(3)),
        isDecoyRock,
      });
    }
  }
  return { cells, cx, cy, craterR, truePockets };
}

function runPipeline(field) {
  const steps = [];
  let pool = field.cells;
  const total = pool.length;

  let survivors = pool.filter((c) => c.illumination <= 0.001 && c.maxTemp <= 95);
  steps.push({
    step: 1,
    name: 'Thermodynamic Prism',
    description: 'Binary LOLA/Diviner mask: illumination = 0 AND max temp ≤ 95K',
    survivors: survivors.length,
    total,
    rejectedPct: Number((100 - (survivors.length / total) * 100).toFixed(1)),
  });
  pool = survivors;

  survivors = pool.filter((c) => c.hydrogen >= 0.25);
  steps.push({
    step: 2,
    name: 'Geo-statistical Downscaling',
    description: 'LEND neutron-suppression probability fused to LOLA micro-relief (hydrogen ≥ 0.25)',
    survivors: survivors.length,
    total,
    rejectedPct: Number((100 - (survivors.length / total) * 100).toFixed(1)),
  });
  pool = survivors;

  survivors = pool.filter((c) => c.radar >= 0.3 && c.slope <= 10 && c.roughness <= 0.5);
  steps.push({
    step: 3,
    name: 'Object-Oriented Region Growing',
    description: 'DFSAR Wishart-distance growth, halted at slope >10° or high-roughness "glass walls"',
    survivors: survivors.length,
    total,
    rejectedPct: Number((100 - (survivors.length / total) * 100).toFixed(1)),
  });
  pool = survivors;

  survivors = pool.filter((c) => c.dielectric >= 2.95);
  steps.push({
    step: 4,
    name: 'Quantitative Dielectric Inversion',
    description: 'Campbell Dielectric Inversion on S/L-band DFSAR (ε ≥ 2.95, ice reference ≈ 3.15)',
    survivors: survivors.length,
    total,
    rejectedPct: Number((100 - (survivors.length / total) * 100).toFixed(1)),
  });
  pool = survivors;

  survivors = pool.filter((c) => c.coherence >= 0.55);
  steps.push({
    step: 5,
    name: 'InSAR Phase Coherence',
    description: 'Temporal Chandrayaan-2 SAR pair comparison — coherence ≥ 0.55 confirms rigid permafrost',
    survivors: survivors.length,
    total,
    rejectedPct: Number((100 - (survivors.length / total) * 100).toFixed(1)),
  });
  pool = survivors;

  survivors = pool.filter((c) => c.thermalInertia >= 0.45);
  steps.push({
    step: 6,
    name: 'Thermal Decay Inversion',
    description: 'IIRS dusk thermal-inertia tracking — confirms deep volumetric ice vs. surface frost',
    survivors: survivors.length,
    total,
    rejectedPct: Number((100 - (survivors.length / total) * 100).toFixed(1)),
  });
  pool = survivors;

  survivors = pool.filter((c) => {
    const confidence = (c.hydrogen + c.radar + (c.dielectric - 2.7) / 0.6 + c.coherence + c.thermalInertia) / 5;
    return confidence >= 0.45;
  });
  steps.push({
    step: 7,
    name: 'Multi-Spectrum Surface Verification',
    description: 'LAMP far-UV frost absorption + OHRC lobate-rim geomorphology ground-truth check',
    survivors: survivors.length,
    total,
    rejectedPct: Number((100 - (survivors.length / total) * 100).toFixed(1)),
  });
  pool = survivors;

  const scored = pool.map((c) => {
    const iceYield = Math.min(
      100,
      Math.round(((c.hydrogen + c.radar + (c.dielectric - 2.7) / 0.6 + c.coherence + c.thermalInertia) / 5) * 100)
    );
    const hazard = Math.min(100, Math.round((c.slope / 25) * 60 + c.roughness * 40));
    const energy = Math.min(100, Math.round((c.slope / 25) * 100));
    return { ...c, iceYieldScore: iceYield, hazardScore: hazard, energyScore: energy };
  });
  scored.sort((a, b) => b.iceYieldScore - a.iceYieldScore);

  steps.push({
    step: 8,
    name: 'Dynamic Adaptive Quadtree Geofencing',
    description: 'Scored Cost Map generated: Ice Yield / Hazard / Energy per geofenced cell',
    survivors: scored.length,
    total,
    rejectedPct: Number((100 - (scored.length / total) * 100).toFixed(1)),
  });

  return { steps, targets: scored };
}

module.exports = { buildCraterField, runPipeline, GRID_SIZE };
