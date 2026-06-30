// missionEngine.js
// Stateful simulation of Phase 2 (HAV strike) and Phase 3 (Kinetic Dart)
// for a single selected target cell. Produces a deterministic timeline of
// events with real elapsed-time gating, so the frontend can play it back
// like genuine telemetry rather than a canned animation.

function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Builds the full event timeline (timestamps in ms from mission start)
function buildStrikeTimeline(target, seed) {
  const rng = mulberry32(seed ^ (target.x * 9301 + target.y * 49297));
  const events = [];
  let t = 0;

  const push = (delay, phase, title, detail, data) => {
    t += delay;
    events.push({ t, phase, title, detail, data: data || null });
  };

  // --- Phase 2: HAV orbital strike sequence ---
  push(0, 2, 'Macro-Geofence Handshake',
    `HAV ingests Cost Map burst from Tier-1 recon satellite. Target cell (${target.x}, ${target.y}) flagged Ice Yield ${target.iceYieldScore}.`);

  push(800, 2, 'Orbital Insertion Confirmed',
    'HAV stable in 20 km circular orbit, velocity 1.67 km/s. Flight corridor re-tasked to intersect target sector.');

  push(1200, 2, '5-Layer Micro-Geofence Lock', 'Parallel sensor barrage executing over PSR basin.', {
    nir: Number((0.6 + rng() * 0.35).toFixed(2)),
    gpr_overburden_m: Number((0.4 + rng() * 1.6).toFixed(2)),
    cpr_ratio: Number((1.02 + rng() * 0.6).toFixed(2)),
    mir_3um: Number((0.55 + rng() * 0.4).toFixed(2)),
    mir_6um: Number((0.5 + rng() * 0.4).toFixed(2)),
    lidar_roughness_cm: Number((1 + rng() * 8).toFixed(1)),
  });

  push(900, 2, 'Geofence-Lock Authorized',
    'All 5 layers concur. Terrain Relative Navigation zeroes drift against macro DEM. Thermal perimeter clear of secondary sublimation risk.');

  const reload = rng() > 0.5;
  push(700, 2, 'Predictive Scheduler Resolution',
    reload
      ? 'Gimbal Nozzle 1 projected in reload cycle at strike timestamp — target reassigned to Nozzle 2.'
      : 'Gimbal Nozzle 1 clear at strike timestamp. No reassignment required.',
    { reassigned: reload });

  push(600, 2, 'Firing Token Granted',
    'Mutex lock acquired by firing nozzle. Collision matrix clear. Closed-loop joint telemetry nominal.');

  push(500, 2, 'Hybrid Gauss Ejection',
    'Coilgun applies 15% magnetic push. Dart clears barrel at 250 m/s relative velocity. Zero measurable recoil on HAV bus.');

  // --- Phase 3: Kinetic Dart sequence ---
  push(400, 3, 'Gravitational Pre-Compensation',
    'GRAIL mascon model applied. Ejection vector offset to cancel predicted lateral drift.');

  push(300, 3, 'Flywheel Spin-Up',
    'Internal titanium flywheel reaches 20,000 RPM. Gyroscopic stabilization nominal — zero tumble.');

  push(600, 3, 'Orbital Brake Ignition',
    'Solid-fuel kick motor burns to depletion, shedding 1.416 km/s of residual orbital velocity.');

  push(1571, 3, 'Unpowered Descent — 157s Fall',
    'Lateral velocity at zero. Dart falls in silence; mascon-curved trajectory tracking nominal toward micro-geofence center.', {
      fallSeconds: 157,
    });

  const impactSpeed = 6000 + Math.round((rng() - 0.5) * 80);
  push(300, 3, 'Hyper-Velocity Impact',
    `Tungsten Mosquito Architecture sheath strikes surface at ${impactSpeed.toLocaleString()} km/h. Acoustic Routing diverts shock around payload bay. Woodpecker CNT suspension and auxetic foam absorb residual core lurch.`, {
      impactSpeed,
    });

  push(900, 3, 'Solid-State Latch Release',
    'Nitinol retaining ring reaches transition temperature, releasing nose cap without pyrotechnics.');

  push(500, 3, 'Labrum Actuation',
    'Nitinol actuator drives sensor tube downward; outer petals peel back, plunging sapphire window into ice matrix.');

  push(60200, 3, 'Sublimation Delay Enforced',
    '60-second flash-freeze window observed. Impact-melt liquid water re-crystallizes before any scan begins.', {
      delaySeconds: 60,
    });

  push(500, 3, 'RHU Thermal Stabilization',
    'Plutonium-238 Radioisotope Heater Unit holds internal bus within safe operating margin against -230°C ambient.');

  const purity = Number((92 + rng() * 7).toFixed(1));
  const density = Number((0.91 + rng() * 0.08).toFixed(3));
  const contaminants = rng() > 0.7 ? ['trace perchlorate'] : rng() > 0.5 ? ['trace ammonia ice'] : [];
  push(1400, 3, 'Subsurface Molecular Scan Complete',
    'Muon/neutron backscatter and Terahertz/LIBS/Raman spectrometry converge on a unified material reading.', {
      purity,
      density,
      contaminants,
    });

  push(800, 3, 'DTN Bundle Packaged',
    'Scientific payload encrypted and queued as a passive Delay-Tolerant-Networking store node.');

  push(1200, 3, 'HAV Relay Handoff',
    'Mother-ship completes orbital lap, overhead handshake detected. DTN bundle transmitted to relay and queued for Earth downlink.', {
      relayComplete: true,
      purity,
      density,
      contaminants,
      iceYieldScore: target.iceYieldScore,
    });

  return events;
}

module.exports = { buildStrikeTimeline };
