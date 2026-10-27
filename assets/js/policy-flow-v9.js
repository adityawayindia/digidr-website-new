/* Short, replayable explanatory traces. The labelled connections remain static. */
(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-v9-policy-flow]').forEach(diagram => {
    let timer = null;
    const replay = diagram.querySelector('[data-policy-replay]');
    const result = diagram.querySelector('[data-policy-result]');
    const choices = [...diagram.querySelectorAll('[data-policy-state]')];
    const stop = () => {
      window.clearTimeout(timer);
      diagram.classList.remove('is-tracing');
    };
    const trace = () => {
      stop();
      if (reduced.matches) return;
      void diagram.offsetWidth;
      diagram.classList.add('is-tracing');
      timer = window.setTimeout(stop, 2200);
    };
    if (replay) {
      replay.hidden = reduced.matches;
      replay.addEventListener('click', trace);
    }
    const controls = diagram.querySelector('.v9-policy-controls');
    if (controls) controls.hidden = false;
    choices.forEach(button => button.addEventListener('click', () => {
      const changed = button.dataset.policyState === 'changed';
      choices.forEach(choice => choice.setAttribute('aria-pressed', String(choice === button)));
      if (result) {
        result.dataset.state = changed ? 'review' : 'approved';
        result.textContent = changed
          ? 'Review required: the changed communication cannot reuse the earlier approval.'
          : 'Illustrative state: the reviewed version may proceed within its approved scope.';
      }
      trace();
    }));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .35)) {trace();observer.disconnect();}
      }, {threshold:.35});
      observer.observe(diagram);
    }
    const motionChanged = () => {stop();if(replay)replay.hidden=reduced.matches;};
    if (reduced.addEventListener) reduced.addEventListener('change', motionChanged);
    else if (reduced.addListener) reduced.addListener(motionChanged);
    document.addEventListener('visibilitychange', () => {if(document.hidden)stop();});
  });
})();
