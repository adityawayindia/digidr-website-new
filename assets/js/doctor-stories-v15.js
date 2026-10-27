/* Manual doctor stories. Homepage display is selected in the editable registry. */
(function () {
  'use strict';
  document.querySelectorAll('[data-doctor-stories]').forEach(function (root) {
    const slides = Array.from(root.querySelectorAll('[data-story-slide]'));
    const dots = Array.from(root.querySelectorAll('[data-story-position]'));
    const previous = root.querySelector('[data-story-prev]');
    const next = root.querySelector('[data-story-next]');
    const stage = root.querySelector('[data-story-stage]');
    const count = root.querySelector('[data-story-count]');
    const status = root.querySelector('[data-story-status]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!slides.length || !previous || !next || !stage || !count || !status) return;
    let active = 0;
    let touchStart = null;
    function show(index) {
      if (index < 0 || index >= slides.length || index === active) return;
      const direction = index > active ? 1 : -1;
      active = index;
      slides.forEach(function (slide, i) { slide.hidden = i !== active; });
      dots.forEach(function (dot, i) { dot.setAttribute('aria-current', String(i === active)); });
      previous.disabled = active === 0;
      next.disabled = active === slides.length - 1;
      count.textContent = String(active + 1).padStart(2, '0');
      const name = slides[active].querySelector('.v15-story-person strong');
      status.textContent = 'Story ' + (active + 1) + ' of ' + slides.length + '. ' + (name ? name.textContent : '');
      if (!motion.matches && typeof slides[active].animate === 'function') {
        slides[active].animate([{transform:'translateX(' + direction * 12 + 'px)',opacity:.7},{transform:'translateX(0)',opacity:1}],{duration:180,easing:'ease-out'});
      }
    }
    previous.addEventListener('click', function () { show(active - 1); });
    next.addEventListener('click', function () { show(active + 1); });
    dots.forEach(function (dot, index) { dot.addEventListener('click', function () { show(index); }); });
    root.addEventListener('keydown', function (event) {
      if (!event.target.closest('[data-story-position], [data-story-prev], [data-story-next]')) return;
      if (event.key === 'ArrowRight') { event.preventDefault(); show(active + 1); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); show(active - 1); }
    });
    stage.addEventListener('touchstart', function (event) {
      touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX,y:event.touches[0].clientY} : null;
    }, {passive:true});
    stage.addEventListener('touchend', function (event) {
      if (!touchStart || !event.changedTouches.length) return;
      const dx = event.changedTouches[0].clientX - touchStart.x;
      const dy = event.changedTouches[0].clientY - touchStart.y;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.4) show(active + (dx < 0 ? 1 : -1));
      touchStart = null;
    }, {passive:true});
    stage.addEventListener('touchcancel', function () { touchStart = null; }, {passive:true});
  });
})();
