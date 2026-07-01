// index.js — Mahakash Antariksh mission console backend
const express = require('express');
const cors = require('cors');
const path = require('path');
const { buildCraterField, runPipeline, GRID_SIZE } = require('./simEngine');
const { buildStrikeTimeline } = require('./missionEngine');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// In-memory mission state. A fresh "field" (crater) is generated per session
// seed so each visitor gets their own deterministic but distinct crater.
const sessions = new Map();

function getSession(seed) {
  const key = String(seed);
  if (!sessions.has(key)) {
    const field = buildCraterField(Number(seed) || 1337);
    const pipeline = runPipeline(field);
    sessions.set(key, { field, pipeline, createdAt: Date.now() });
  }
  return sessions.get(key);
}

// --- API: crater field metadata (for canvas rendering) ---
app.get('/api/field/:seed', (req, res) => {
  const session = getSession(req.params.seed);
  res.json({
    gridSize: GRID_SIZE,
    crater: { cx: session.field.cx, cy: session.field.cy, radius: session.field.craterR },
    cells: session.field.cells,
  });
});

// --- API: run / fetch the Phase 1 pipeline result for a session ---
app.get('/api/pipeline/:seed', (req, res) => {
  const session = getSession(req.params.seed);
  res.json({
    steps: session.pipeline.steps,
    targetCount: session.pipeline.targets.length,
  });
});

// --- API: top-N targets from the Cost Map (post quadtree scoring) ---
app.get('/api/targets/:seed', (req, res) => {
  const session = getSession(req.params.seed);
  const limit = Math.min(50, Number(req.query.limit) || 12);
  const targets = session.pipeline.targets.slice(0, limit).map((t) => ({
    id: t.id,
    x: t.x,
    y: t.y,
    iceYieldScore: t.iceYieldScore,
    hazardScore: t.hazardScore,
    energyScore: t.energyScore,
    dielectric: t.dielectric,
    coherence: t.coherence,
  }));
  res.json({ targets });
});

// --- API: get a specific target's full sensor readout ---
app.get('/api/target/:seed/:id', (req, res) => {
  const session = getSession(req.params.seed);
  const target = session.pipeline.targets.find((t) => t.id === req.params.id);
  if (!target) return res.status(404).json({ error: 'TARGET_NOT_FOUND' });
  res.json(target);
});

// --- API: build the Phase 2/3 strike timeline for a chosen target ---
app.post('/api/strike', (req, res) => {
  const { seed, targetId } = req.body;
  const session = getSession(seed);
  const target = session.pipeline.targets.find((t) => t.id === targetId);
  if (!target) return res.status(404).json({ error: 'TARGET_NOT_FOUND' });
  const strikeSeed = Number(seed) * 7919 + target.x * 13 + target.y;
  const timeline = buildStrikeTimeline(target, strikeSeed);
  res.json({ target, timeline });
});

// --- API: digital twin summary (Phase 4) once a strike has resolved ---
app.post('/api/digital-twin', (req, res) => {
  const { seed, targetId, purity, density, contaminants } = req.body;
  const session = getSession(seed);
  const target = session.pipeline.targets.find((t) => t.id === targetId);
  if (!target) return res.status(404).json({ error: 'TARGET_NOT_FOUND' });

  const classification =
    contaminants && contaminants.length > 0
      ? 'amber'
      : purity >= 97
      ? 'blue'
      : 'blue';

  const lh2EstimateKg = Math.round(target.iceYieldScore * 8.4);
  const lox_estimateKg = Math.round(target.iceYieldScore * 66.7);

  res.json({
    target,
    classification,
    purity,
    density,
    contaminants,
    propellantEstimate: {
      lh2Kg: lh2EstimateKg,
      loxKg: lox_estimateKg,
      note: 'Projected stoichiometric hydrolox yield per 30-sol extraction cycle at this geofence.',
    },
  });
});

app.listen(PORT, () => {
  console.log(`Mahakash Antariksh mission console running on port ${PORT}`);
});

module.exports = app;
