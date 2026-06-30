# महाकाश अंतरिक्ष — Mahakash Antariksh

**Lunar South Pole Subsurface Ice Detection & Extraction — Mission Console**

A fully working, full-stack simulation of the four-phase ice-hunting architecture
described in the mission report: the Multi-Sensor Convergence Funnel, the HAV
orbital strike platform, the Kinetic Dart deployment sequence, and the ISRU
Digital Twin / propellant outpost.

## Running it

```bash
npm install
npm start
```

Then open `http://localhost:3000`. No build step, no external services, no API
keys — everything is server-rendered data consumed by a vanilla JS frontend.

## What's actually real here

This isn't a mockup with canned numbers. The backend genuinely computes the
simulation:

- **`server/simEngine.js`** procedurally generates a 42×42 cell crater floor
  (illumination, temperature, hydrogen signal, radar backscatter, slope,
  dielectric constant, InSAR coherence, thermal inertia — all spatially
  correlated with planted "true" ice pockets and decoy rock clusters) from a
  seed, then runs the actual 8-step filtering pipeline from the report against
  it: each step's survivor count is the live result of filtering the previous
  step's output, not a scripted number.
- **`server/missionEngine.js`** builds a deterministic event timeline for the
  HAV strike + Kinetic Dart sequence once a target geofence is chosen,
  including derived values (impact speed, purity, density, contaminants) seeded
  from the target's own sensor readings.
- **`server/index.js`** is a small Express API exposing all of this:
  `/api/field/:seed`, `/api/pipeline/:seed`, `/api/targets/:seed`,
  `/api/target/:seed/:id`, `POST /api/strike`, `POST /api/digital-twin`.

Changing the seed in the console genuinely regenerates a different crater, with
different pocket locations, different survivor counts at each pipeline step,
and a different ranked target list.

## Design

- **Theme**: a restrained, professional deep-space mission control terminal —
  graphite black backgrounds, cool slate instrument panels, a single
  disciplined signal-blue accent for primary/active states, desaturated
  steel-cyan for data readouts, and muted terracotta reserved for genuine
  warnings only.
- **Layout**: a persistent phase rail (the four phases genuinely are an
  ordered sequence, so numbering is meaningful), a central instrument stage,
  and a live mission-log terminal that narrates every backend event as it
  streams in.
- **Signature element**: the Cost Map canvas in Phase 1 — a real rendering of
  the simulated crater grid, colour-coded by which pipeline step a cell
  survived, that you click directly to select a strike target.

## Project structure

```
server/
  index.js          Express server + API routes
  simEngine.js       Crater field generation + 8-step Phase 1 pipeline
  missionEngine.js   Phase 2/3 strike timeline generator
public/
  index.html         Console shell
  css/console.css    Design system
  js/
    api.js           Backend client
    terminal.js       Mission log feed
    starfield.js       Ambient background
    phase1.js          Convergence Funnel + Cost Map canvas
    phase2.js          HAV strike + Kinetic Dart timeline (shared renderer)
    phase3.js          Phase 3 nav entry point
    phase4.js          Digital Twin + ISRU dashboard
    main.js            Boot sequence, phase routing, mission clock
```
