/* Manual research rails. Source text stays in the document; no network calls. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root && root.document) api.init(root.document, root);
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  function stopsFor(positions, maximum) {
    const max = Math.max(0, Number(maximum) || 0);
    return [...new Set([0, ...positions.map(value => Math.max(0, Math.min(max, Number(value) || 0))), max])]
      .sort((a, b) => a - b)
      .filter((value, index, all) => !index || Math.abs(value - all[index - 1]) > 1);
  }

  function nextStop(stops, current, direction) {
    if (!stops.length) return 0;
    if (direction > 0) return stops.find(stop => stop > current + 2) ?? stops.at(-1);
    return [...stops].reverse().find(stop => stop < current - 2) ?? stops[0];
  }

  function stateFor(cards, current, viewport, maximum) {
    const x = Math.max(0, Math.min(Number(maximum) || 0, Number(current) || 0));
    const intersecting = cards.map((card, index) => ({...card, index}))
      .filter(card => card.left + card.width > x + 2 && card.left < x + viewport - 2);
    const complete = intersecting.filter(card => card.left >= x - 2 && card.left + card.width <= x + viewport + 2);
    const visible = complete.length ? complete : intersecting;
    return {
      first: visible.length ? visible[0].index + 1 : 0,
      last: visible.length ? visible.at(-1).index + 1 : 0,
      previousDisabled: x <= 2,
      nextDisabled: maximum - x <= 2,
      progress: maximum > 1 ? Math.min(1, (x + viewport) / (maximum + viewport)) : 1,
    };
  }

  function positionLabel(state, total) {
    const first = String(state.first || 1).padStart(2, '0');
    const last = String(state.last || state.first || 1).padStart(2, '0');
    return first + (state.last > state.first ? ' to ' + last : '') + ' / ' + String(total).padStart(2, '0');
  }

  function init(document, window) {
    const carousels = [...document.querySelectorAll('[data-v13-research-carousel]')];
    if (!carousels.length) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const behavior = () => motion.matches ? 'auto' : 'smooth';
    const instances = [];

    carousels.forEach(shell => {
      if (shell.dataset.v13Ready === 'true') return;
      shell.dataset.v13Ready = 'true';
      const track = shell.querySelector('[data-v13-research-track]');
      if (!track) return;
      const cards = [...track.querySelectorAll(':scope > [data-v13-research-card]')];
      const previous = shell.querySelector('[data-v13-research-prev]');
      const next = shell.querySelector('[data-v13-research-next]');
      const position = shell.querySelector('[data-v13-research-position]');
      const progress = shell.querySelector('[data-v13-research-progress]');
      const status = shell.querySelector('[data-v13-research-status]');
      const label = shell.dataset.v13Label || 'Research';
      let geometry = [], stops = [0], max = 0, frame = 0, settleTimer = 0;
      const visible = () => track.clientWidth > 0 && track.getClientRects().length > 0;
      const measure = () => {
        if (!visible()) return;
        const start = track.getBoundingClientRect().left;
        geometry = cards.map(card => {
          const rect = card.getBoundingClientRect();
          return {left: rect.left - start + track.scrollLeft, width: rect.width};
        });
        max = Math.max(0, track.scrollWidth - track.clientWidth);
        stops = stopsFor(geometry.map(card => card.left), max);
        update(false);
      };
      const update = announce => {
        if (!visible()) return;
        const state = stateFor(geometry, track.scrollLeft, track.clientWidth, max);
        if (previous) previous.disabled = state.previousDisabled;
        if (next) next.disabled = state.nextDisabled;
        if (position) position.textContent = positionLabel(state, cards.length);
        if (progress) progress.style.width = String(Math.round(state.progress * 100)) + '%';
        if (announce && status) {
          status.textContent = label + ': ' + (state.first === state.last ? 'card ' + state.first : 'cards ' + state.first + ' to ' + state.last) + ' of ' + cards.length + '.';
        }
      };
      const go = target => {
        track.scrollTo({left: Math.max(0, Math.min(max, target)), behavior: behavior()});
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => update(true), motion.matches ? 0 : 220);
      };
      previous?.addEventListener('click', () => {measure(); go(nextStop(stops, track.scrollLeft, -1));});
      next?.addEventListener('click', () => {measure(); go(nextStop(stops, track.scrollLeft, 1));});
      track.addEventListener('keydown', event => {
        if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey) return;
        let target;
        if (event.key === 'ArrowRight') target = nextStop(stops, track.scrollLeft, 1);
        else if (event.key === 'ArrowLeft') target = nextStop(stops, track.scrollLeft, -1);
        else if (event.key === 'Home') target = 0;
        else if (event.key === 'End') target = max;
        else return;
        event.preventDefault();
        go(target);
      });
      track.addEventListener('scroll', () => {
        if (!frame) frame = window.requestAnimationFrame(() => {frame = 0; update(false);});
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(() => update(true), 160);
      }, {passive: true});
      track.addEventListener('focusin', event => {
        const card = event.target.closest?.('[data-v13-research-card]');
        if (!card || !track.contains(card)) return;
        const rect = card.getBoundingClientRect(), rail = track.getBoundingClientRect();
        if (rect.left < rail.left - 1 || rect.right > rail.right + 1) {
          const idx = cards.indexOf(card);
          track.scrollTo({left: Math.min(max, geometry[idx]?.left || 0), behavior: 'auto'});
        }
      });
      shell.querySelector('[data-v13-research-controls]')?.removeAttribute('hidden');
      if (window.ResizeObserver) new window.ResizeObserver(measure).observe(track);
      else window.addEventListener('resize', measure, {passive: true});
      const panel = shell.closest('.tab-panel');
      if (panel && window.MutationObserver) {
        new window.MutationObserver(() => window.requestAnimationFrame(measure))
          .observe(panel, {attributes: true, attributeFilter: ['hidden']});
      }
      measure();
      instances.push({track, cards, measure});
    });

    const revealHash = () => {
      let id;
      try {id = decodeURIComponent(window.location.hash.slice(1));} catch (_) {return;}
      if (!id.startsWith('evidence-')) return;
      const card = document.getElementById(id);
      const instance = instances.find(item => item.cards.includes(card));
      if (!instance) return;
      instance.measure();
      card.scrollIntoView({behavior: 'auto', block: 'nearest', inline: 'start'});
    };
    window.addEventListener('hashchange', revealHash);
    window.requestAnimationFrame(revealHash);
    document.fonts?.ready.then(() => {instances.forEach(instance => instance.measure()); revealHash();});

    const studies = [...document.querySelectorAll('[data-v13-study-details]')];
    if (studies.length && typeof window.HTMLDialogElement !== 'undefined') {
      const dialog = document.createElement('dialog');
      dialog.className = 'v13-study-dialog';
      dialog.setAttribute('data-v13-study-dialog', '');
      dialog.setAttribute('aria-labelledby', 'v13-study-dialog-title');
      const header = document.createElement('div');
      header.className = 'v13-study-dialog-header';
      const kicker = document.createElement('p');
      kicker.className = 'v13-study-dialog-kicker';
      kicker.textContent = 'Study scope and limitations';
      const title = document.createElement('h2');
      title.className = 'v13-study-dialog-title';
      title.id = 'v13-study-dialog-title';
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'v13-study-dialog-close';
      close.setAttribute('aria-label', 'Close study details');
      close.textContent = '×';
      const body = document.createElement('div');
      body.className = 'v13-study-dialog-body';
      header.append(kicker, title, close);
      dialog.append(header, body);
      document.body.append(dialog);
      let returnFocus = null;
      studies.forEach(details => {
        const summary = details.querySelector('summary');
        if (!summary) return;
        summary.setAttribute('aria-haspopup', 'dialog');
        summary.addEventListener('click', event => {
          event.preventDefault();
          returnFocus = summary;
          title.textContent = details.dataset.v13StudyTitle || 'Study details';
          body.replaceChildren(...[...details.children].filter(node => node.tagName !== 'SUMMARY').map(node => node.cloneNode(true)));
          dialog.showModal();
          close.focus({preventScroll: true});
        });
      });
      close.addEventListener('click', () => dialog.close());
      dialog.addEventListener('close', () => returnFocus?.focus({preventScroll: true}));
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
      });
    }
  }

  return {stopsFor, nextStop, stateFor, positionLabel, init};
});
