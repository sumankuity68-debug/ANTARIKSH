// phase3.js — Kinetic Dart Deployment Sequence nav entry point.
// The backend combines Phase 2 (HAV) and Phase 3 (dart) into one continuous
// timeline. This module is the nav entry for "Phase 3": if a strike has
// already been run this session it replays the same timeline; otherwise it
// prompts the user back to Phase 1 to select a target.
const Phase3 = (() => {
  function render(container, seed, targetId) {
    if (!targetId) {
      container.innerHTML = `
        <div class="section-heading">
          <h2>Kinetic Dart Deployment Sequence</h2>
          <div class="rule"></div>
        </div>
        <div class="locked-msg">
          <div class="glyph">03</div>
          <p>No target cell has been struck yet. Return to <b style="color:var(--ink)">Phase 1</b>
          to converge on a verified ice deposit, then run the strike from
          <b style="color:var(--ink)">Phase 2</b> — the dart's descent, impact, and subsurface
          scan will appear here automatically.</p>
          <button class="btn btn-secondary" id="backToPhase1" style="margin-top:8px;">← BACK TO PHASE 1</button>
        </div>
      `;
      document.getElementById('backToPhase1').addEventListener('click', () => window.MahakashMain.goToPhase(1));
      return;
    }
    StrikeSequence.render(container, seed, targetId, () => window.MahakashMain.goToPhase(4, targetId));
  }
  return { render };
})();
