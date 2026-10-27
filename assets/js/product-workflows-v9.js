/* Short explanatory motion; the selected reading panel never auto-advances. */
(() => {
  'use strict';
  const CASES = {
    allow: ['Approved version: allow within the evaluated scope.', 'The exact version, destination and required authority match the evaluated conditions. This illustrative operation can proceed within that scope.'],
    restrict: ['Limited scope: allow with restrictions.', 'The operation is permitted only for its specified purpose and destination. Reuse outside those limits requires a fresh decision.'],
    review: ['Meaning changed: doctor review required.', 'The current version changes an important qualification. Its earlier approval cannot be reused, so release waits for a new review.'],
    block: ['Permission is missing: block or escalate.', 'The requested use is outside the current actor’s permission. The operation stops or moves to an appropriate accountable route.']
  };

  function createFlowController(adapter) {
    const count = adapter.count;
    let selected = Math.max(0, Math.min(count - 1, adapter.selected || 0));
    let reduced = !!adapter.reduced;
    let timer = null;
    let automaticUsed = reduced;
    let running = false;
    let cursor = -1;
    const state = () => adapter.state?.({ selected, reduced, running, automaticUsed, cursor });
    const stop = () => {
      if (timer !== null) adapter.cancel(timer);
      timer = null;
      running = false;
      cursor = -1;
      adapter.trace(-1);
      state();
    };
    const play = () => {
      automaticUsed = true;
      stop();
      if (reduced || count < 1) return false;
      running = true;
      cursor = 0;
      const tick = () => {
        timer = null;
        if (!running) return;
        if (cursor >= count) { stop(); return; }
        adapter.trace(cursor);
        cursor += 1;
        timer = adapter.schedule(tick, 620);
      };
      state();
      tick();
      return true;
    };
    adapter.select(selected, false);
    state();
    return {
      play,
      pause() { automaticUsed = true; stop(); },
      select(index) {
        if (!Number.isInteger(index) || index < 0 || index >= count) return false;
        automaticUsed = true;
        stop();
        selected = index;
        adapter.select(selected, true);
        state();
        return true;
      },
      visible() { if (!automaticUsed && !reduced) play(); },
      reduced(next) { reduced = !!next; if (reduced) { automaticUsed = true; stop(); } state(); },
      snapshot() { return { selected, reduced, running, automaticUsed, cursor, timerScheduled:timer !== null }; }
    };
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createFlowController, CASES };
    return;
  }
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-v9-workflow]').forEach(root => {
    const steps = [...root.querySelectorAll('[data-v9-workflow-step]')];
    const stages = [...root.querySelectorAll('[data-v9-flow-stage]')];
    const panels = [...root.querySelectorAll('[data-v9-workflow-panel]')];
    const panelGroup = root.querySelector('.v9-flow-panels');
    const toolbar = root.querySelector('[data-v9-workflow-controls]');
    const play = root.querySelector('[data-v9-workflow-play]');
    const pause = root.querySelector('[data-v9-workflow-pause]');
    const status = root.querySelector('[data-v9-workflow-status]');
    if (!steps.length || steps.length !== panels.length || !play || !pause || !toolbar || !panelGroup) return;
    const controller = createFlowController({
      count:steps.length,
      selected:Number(root.dataset.v9WorkflowSelected) || 0,
      reduced:motionQuery.matches,
      schedule:(callback, duration) => window.setTimeout(callback, duration),
      cancel:id => window.clearTimeout(id),
      trace(index) { stages.forEach((stage, i) => stage.classList.toggle('is-travelling', i === index)); },
      select(index, announce) {
        steps.forEach((step, i) => {
          step.setAttribute('aria-pressed', String(i === index));
          stages[i].classList.toggle('is-selected', i === index);
          panels[i].hidden = i !== index;
        });
        if (announce && status) status.textContent = `${steps[index].textContent.trim()}. Details shown below the process.`;
      },
      state({ reduced, running }) {
        play.disabled = reduced;
        pause.disabled = !running;
        root.dataset.v9FlowRunning = String(running);
        play.textContent = reduced ? 'Motion off' : 'Play flow ↗';
        play.setAttribute('aria-label', reduced ? 'Workflow motion disabled by your device preference' : 'Play the workflow direction once');
      }
    });
    panelGroup.dataset.enhanced = 'true';
    toolbar.hidden = false;
    steps.forEach((step, i) => {
      step.disabled = false;
      step.addEventListener('click', () => controller.select(i));
    });
    play.addEventListener('click', () => controller.play());
    pause.addEventListener('click', () => controller.pause());
    root.querySelectorAll('[data-v9-workflow-jump]').forEach(button => {
      button.disabled = false;
      button.addEventListener('click', () => {
        const index = Number(button.dataset.v9WorkflowJump);
        if (controller.select(index)) panels[index].scrollIntoView({ block:'nearest', behavior:motionQuery.matches ? 'auto' : 'smooth' });
      });
    });
    root.addEventListener('focusin', event => {
      if (event.target !== play) controller.pause();
    });
    root.addEventListener('pointerdown', event => {
      if (event.target !== play && !play.contains(event.target)) controller.pause();
    }, { passive:true });
    document.addEventListener('visibilitychange', () => { if (document.hidden) controller.pause(); });
    const onMotion = event => controller.reduced(event.matches);
    if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotion);
    else if (motionQuery.addListener) motionQuery.addListener(onMotion);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio >= .4 && !document.hidden) controller.visible();
          else if (controller.snapshot().running) controller.pause();
        });
      }, { threshold:0.4 });
      observer.observe(root.querySelector('.v9-flow-stages') || root);
    }

    const decision = root.querySelector('[data-v9-decision-board]');
    if (decision) {
      const cases = [...decision.querySelectorAll('[data-v9-decision-case]')];
      const outcomes = [...decision.querySelectorAll('[data-v9-decision-outcome]')];
      const title = decision.querySelector('[data-v9-decision-title]');
      const copy = decision.querySelector('[data-v9-decision-copy]');
      cases.forEach(button => {
        button.disabled = false;
        button.addEventListener('click', () => {
          const key = button.dataset.v9DecisionCase;
          if (!CASES[key] || !title || !copy) return;
          controller.select(steps.length - 1);
          cases.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
          outcomes.forEach(item => item.classList.toggle('is-outcome', item.dataset.v9DecisionOutcome === key));
          title.textContent = CASES[key][0];
          copy.textContent = CASES[key][1];
        });
      });
    }
  });
})();
