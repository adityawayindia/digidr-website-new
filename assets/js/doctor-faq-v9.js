/* Native disclosures remain usable without JavaScript. This adds topic filters
   without closing answers, changing their text, or moving keyboard focus. */
(() => {
  'use strict';
  function createFAQFilters(section) {
    const buttons = [...section.querySelectorAll('[data-v9-faq-filter]')];
    const cards = [...section.querySelectorAll('[data-v9-faq-category]')];
    const tools = section.querySelector('[data-v9-faq-tools]');
    const count = section.querySelector('[data-v9-faq-count]');
    if (!buttons.length || !cards.length) return null;
    let active = 'all';
    const apply = category => {
      if (!buttons.some(button => button.dataset.v9FaqFilter === category)) return false;
      active = category;
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.v9FaqFilter === category)));
      let total = 0;
      cards.forEach(card => {
        card.hidden = category !== 'all' && card.dataset.v9FaqCategory !== category;
        if (!card.hidden) total += 1;
      });
      const label = buttons.find(button => button.dataset.v9FaqFilter === category).textContent.trim();
      if (count) count.textContent = `${total} ${total === 1 ? 'question' : 'questions'}${category === 'all' ? '' : ` · ${label}`}`;
      return true;
    };
    buttons.forEach(button => button.addEventListener('click', () => apply(button.dataset.v9FaqFilter)));
    if (tools) tools.hidden = false;
    apply('all');
    return { apply, snapshot:() => ({ active, visible:cards.filter(card => !card.hidden).length }) };
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createFAQFilters };
    return;
  }
  if (typeof document === 'undefined') return;
  document.querySelectorAll('[data-v9-faq-section]').forEach(createFAQFilters);
})();
