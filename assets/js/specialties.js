(() => {
  'use strict';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-specialty-carousel]').forEach(carousel => {
    const rail = carousel.querySelector('.specialty-rail'); if (!rail) return;
    const slides = [...rail.querySelectorAll('.specialty-slide')];
    const filters = [...carousel.querySelectorAll('[data-specialty-filter]')];
    const search = document.querySelector(`[data-specialty-search="${carousel.id}"]`);
    const prev = carousel.querySelector('[data-specialty-prev]'), next = carousel.querySelector('[data-specialty-next]');
    const status = carousel.querySelector('[data-specialty-status]'), progress = carousel.querySelector('[data-specialty-progress]');
    const empty = carousel.querySelector('.specialty-empty');
    let category = 'all', activeIndex = 0, visible = slides;
    const announce = carousel.querySelector('[data-specialty-announcement]');
    const renderState = () => {
      if (!visible.length) { if (status) status.textContent = '00 / 00'; if (progress) progress.style.width = '0%'; if (prev) prev.disabled = true; if (next) next.disabled = true; return; }
      const left = rail.getBoundingClientRect().left + parseFloat(getComputedStyle(rail).paddingLeft || '0');
      const atEnd = rail.scrollWidth - rail.clientWidth - rail.scrollLeft < 4;
      activeIndex = visible.reduce((closest, slide, index) => Math.abs(slide.getBoundingClientRect().left - left) < Math.abs(visible[closest].getBoundingClientRect().left - left) ? index : closest, 0);
      if (status) status.textContent = `${String(activeIndex + 1).padStart(2, '0')} / ${String(visible.length).padStart(2, '0')}`;
      if (progress) progress.style.width = `${atEnd ? 100 : Math.max(5, (activeIndex + 1) / visible.length * 100)}%`;
      if (prev) prev.disabled = rail.scrollLeft < 4;
      if (next) next.disabled = atEnd;
    };
    const go = (index, focus = false) => {
      if (!visible.length) return;
      const target = Math.min(visible.length - 1, Math.max(0, index));
      const padding = parseFloat(getComputedStyle(rail).paddingLeft || '0');
      const left = visible[target].getBoundingClientRect().left - rail.getBoundingClientRect().left + rail.scrollLeft - padding;
      rail.scrollTo({ left, behavior: reduced.matches ? 'auto' : 'smooth' });
      if (focus) visible[target].querySelector('a')?.focus({ preventScroll: true });
      if (announce) announce.textContent = `${visible[target].dataset.name}, ${target + 1} of ${visible.length}`;
    };
    prev?.addEventListener('click', () => go(activeIndex - 1));
    next?.addEventListener('click', () => go(activeIndex + 1));
    rail.addEventListener('keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      const focused = visible.indexOf(e.target.closest('.specialty-slide'));
      const index = focused < 0 ? activeIndex : focused;
      e.preventDefault(); go(e.key === 'Home' ? 0 : e.key === 'End' ? visible.length - 1 : index + (e.key === 'ArrowRight' ? 1 : -1), true);
    });
    const applyFilter = () => {
      const query = (search?.value || '').toLocaleLowerCase().trim();
      slides.forEach(slide => {
        slide.hidden = !((category === 'all' || slide.dataset.category === category) && (!query || `${slide.dataset.name} ${slide.dataset.search}`.toLocaleLowerCase().includes(query)));
      });
      visible = slides.filter(slide => !slide.hidden);
      filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.specialtyFilter === category)));
      if (empty) empty.hidden = visible.length > 0;
      activeIndex = 0;
      rail.scrollTo({ left: 0, behavior: 'auto' });
      // Keep the count and navigation in the same state as the filtered cards,
      // including when animation frames are deferred in a background surface.
      renderState();
      if (announce) announce.textContent = `${visible.length} ${visible.length === 1 ? 'specialty' : 'specialties'} available to explore`;
      requestAnimationFrame(renderState);
    };
    filters.forEach(button => button.addEventListener('click', () => { category = button.dataset.specialtyFilter; applyFilter(); }));
    search?.addEventListener('input', applyFilter);
    let pending = false;
    rail.addEventListener('scroll', () => { if (!pending) { pending = true; requestAnimationFrame(() => { renderState(); pending = false; }); } }, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(renderState).observe(rail);
    else window.addEventListener('resize', renderState);
    renderState();
  });
})();
