// api.js — thin client for the Mahakash Antariksh backend
const MahakashAPI = (() => {
  const BASE = '';

  async function getJSON(url) {
    const res = await fetch(BASE + url);
    if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
    return res.json();
  }

  async function postJSON(url, body) {
    const res = await fetch(BASE + url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Request failed: ${url} (${res.status})`);
    return res.json();
  }

  return {
    getField: (seed) => getJSON(`/api/field/${seed}`),
    getPipeline: (seed) => getJSON(`/api/pipeline/${seed}`),
    getTargets: (seed, limit = 14) => getJSON(`/api/targets/${seed}?limit=${limit}`),
    getTarget: (seed, id) => getJSON(`/api/target/${seed}/${id}`),
    runStrike: (seed, targetId) => postJSON('/api/strike', { seed, targetId }),
    getDigitalTwin: (seed, targetId, purity, density, contaminants) =>
      postJSON('/api/digital-twin', { seed, targetId, purity, density, contaminants }),
  };
})();
