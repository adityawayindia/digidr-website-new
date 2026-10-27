/* DigiDr doctor experience. No form collection, payment or automatic outbound request. */
(() => {
  'use strict';
  const page = document.querySelector('[data-doctor-page]');
  const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const formatINR = value => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value));

  if (page) {
    let activeTerm = '6';
    const termButtons = [...page.querySelectorAll('[data-billing-term]')];
    const cards = [...page.querySelectorAll('[data-plan]')];
    const termNote = page.querySelector('#pricing-term-note');
    const sixMonthNote = termNote ? termNote.textContent : '';
    const annualNote = page.dataset.annualNote || 'Annual features are unchanged. Ask DigiDr for a confirmed total and renewal schedule before you pay.';
    const selection = page.querySelector('[data-selected-plan]');
    let selectedPlan = '';

    function updateSelection() {
      if (!selection || !selectedPlan) return;
      const term = selectedPlan === 'Lite' ? 'free plan' : activeTerm === '12' ? '12 month quote' : '6 month term';
      selection.textContent = `Your interest: ${selectedPlan} · ${term}. Share this preference with DigiDr during onboarding.`;
      selection.hidden = false;
    }

    function chooseTerm(term) {
      if (term !== '6' && term !== '12') return;
      activeTerm = term;
      page.dataset.activeTerm = term;
      termButtons.forEach(button => {
        const active = button.dataset.billingTerm === term;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-pressed', String(active));
      });
      cards.forEach(card => {
        if (card.dataset.plan === 'lite') return;
        const annual = term === '12';
        card.querySelector('[data-plan-price]').textContent = annual ? 'Annual quote' : `₹${formatINR(card.dataset.intro)}`;
        card.querySelector('[data-plan-unit]').textContent = annual ? '12 month plan · same features' : '/ month equivalent';
        card.querySelector('[data-plan-billing]').textContent = annual ? 'Confirm the complete annual amount with DigiDr.' : `₹${formatINR(card.dataset.total)} billed for six months`;
        card.querySelector('[data-plan-standard]').textContent = annual ? 'Ask for the introductory period and subsequent pricing in writing.' : `Published subsequent six month rate: ₹${formatINR(card.dataset.standard)}/month.`;
        card.querySelector('[data-select-plan]').textContent = annual ? 'Request annual quote' : card.dataset.cta;
      });
      if (termNote) termNote.textContent = term === '12' ? annualNote : sixMonthNote;
      updateSelection();
    }

    termButtons.forEach(button => button.addEventListener('click', () => chooseTerm(button.dataset.billingTerm)));
    page.querySelectorAll('[data-select-plan]').forEach(button => button.addEventListener('click', () => {
      selectedPlan = button.dataset.selectPlan;
      updateSelection();
    }));

    const preview = page.querySelector('[data-device-preview]');
    page.querySelectorAll('[data-device]').forEach(button => button.addEventListener('click', () => {
      if (!preview || !['desktop', 'mobile'].includes(button.dataset.device)) return;
      preview.dataset.devicePreview = button.dataset.device;
      page.querySelectorAll('[data-device]').forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
    }));

    page.querySelectorAll('a[href="#plan-comparison"]').forEach(link => link.addEventListener('click', () => {
      const comparison = page.querySelector('#plan-comparison');
      if (comparison) comparison.open = true;
    }));

    // Update the section indicator without changing history or forcing scroll.
    const navLinks = [...page.querySelectorAll('.doctor-section-nav a[href^="#"]')];
    const sections = navLinks.map(link => document.getElementById(link.hash.slice(1))).filter(Boolean);
    function updateActiveSection() {
      const boundary = 175;
      const scrollPadding = parseFloat(window.getComputedStyle?.(document.documentElement)?.scrollPaddingTop) || 0;
      let active = sections[0];
      for (const section of sections) {
        const scrollMargin = parseFloat(window.getComputedStyle?.(section)?.scrollMarginTop) || 0;
        // Native anchor positioning combines root scroll padding and section margin.
        if (section.getBoundingClientRect().top <= Math.max(boundary, scrollPadding + scrollMargin + 2)) active = section;
      }
      navLinks.forEach(link => {
        if (active && link.hash === `#${active.id}`) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }
    let scheduled = false;
    window.addEventListener('scroll', () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(() => { updateActiveSection(); scheduled = false; });
    }, { passive: true });
    updateActiveSection();
    chooseTerm('6');
  }

  const sample = document.querySelector('[data-microsite-demo]');
  if (sample) {
    const dialog = document.getElementById('sample-visit-dialog');
    const feedback = document.getElementById('sample-mode-description');
    const messages = {
      clinic: 'In clinic visits would show the practice address, available slots and applicable fees. The patient sees confirmation details before completing a booking.',
      video: 'Video visits would show the practice’s remote consultation options and joining instructions. Only the modes the doctor actually offers should be available.',
      home: 'Home visits would show the service area, availability and applicable visit charges. Availability depends on the practice and its coverage.'
    };
    let opener = null;
    let previousOverflow = '';
    sample.querySelectorAll('[data-open-visit]').forEach(button => button.addEventListener('click', () => {
      if (!dialog || dialog.open) return;
      opener = button;
      previousOverflow = document.body.style.overflow;
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
        document.body.style.overflow = 'hidden';
      } else {
        // A readable inline fallback for browsers without the native dialog API.
        dialog.setAttribute('open', '');
        dialog.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
      }
    }));
    function closeSample() {
      if (!dialog) return;
      if (typeof dialog.close === 'function') dialog.close();
      else { dialog.removeAttribute('open'); restoreFocus(); }
    }
    function restoreFocus() {
      document.body.style.overflow = previousOverflow;
      if (opener && opener.isConnected) opener.focus({ preventScroll: true });
    }
    if (dialog) {
      dialog.querySelectorAll('[data-close-visit]').forEach(button => button.addEventListener('click', closeSample));
      dialog.addEventListener('close', restoreFocus);
      dialog.addEventListener('keydown', event => {
        if (event.key === 'Escape' && typeof dialog.close !== 'function') {
          event.preventDefault();
          closeSample();
          return;
        }
        if (event.key !== 'Tab' || !dialog.hasAttribute('open')) return;
        const focusable = [...dialog.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')]
          .filter(element => element.getClientRects().length && !element.hidden);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      });
      dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const r = dialog.getBoundingClientRect();
        if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeSample();
      });
      dialog.querySelectorAll('[data-visit-mode]').forEach(button => button.addEventListener('click', () => {
        const text = messages[button.dataset.visitMode];
        if (!text) return;
        dialog.querySelectorAll('[data-visit-mode]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        if (feedback) feedback.textContent = text;
      }));
    }
  }
})();
