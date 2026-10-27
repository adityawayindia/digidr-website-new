(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const behavior = () => reduced.matches ? 'auto' : 'smooth';
  const dropdowns = $$('[data-nav-dropdown]');
  const closeDropdowns = (except = null) => dropdowns.forEach(dropdown => {
    if (dropdown === except) return;
    dropdown.open = false;
    $('summary', dropdown)?.setAttribute('aria-expanded', 'false');
  });
  dropdowns.forEach(dropdown => {
    const summary = $('summary', dropdown);
    const firstLink = $('a', dropdown);
    if (!summary) return;
    dropdown.addEventListener('toggle', () => {
      summary.setAttribute('aria-expanded', String(dropdown.open));
      if (dropdown.open) closeDropdowns(dropdown);
    });
    summary.addEventListener('keydown', event => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        dropdown.open = true;
        summary.setAttribute('aria-expanded', 'true');
        firstLink?.focus();
      }
    });
    dropdown.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !dropdown.open) return;
      event.preventDefault();
      event.stopPropagation();
      dropdown.open = false;
      summary.setAttribute('aria-expanded', 'false');
      summary.focus();
    });
    dropdown.addEventListener('click', event => {
      if (event.target.closest('a')) closeDropdowns();
    });
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('[data-nav-dropdown]')) closeDropdowns();
  });
  document.addEventListener('focusin', event => {
    dropdowns.forEach(dropdown => {
      if (!dropdown.contains(event.target)) {
        dropdown.open = false;
        $('summary', dropdown)?.setAttribute('aria-expanded', 'false');
      }
    });
  });
  const menu = $('.menu-btn'), nav = $('.nav-links');
  if (menu && nav) {
    const close = (restore = false) => {
      closeDropdowns();
      nav.classList.remove('open'); menu.setAttribute('aria-expanded', 'false'); menu.setAttribute('aria-label', 'Open navigation');
      if (restore) menu.focus();
    };
    menu.addEventListener('click', () => {
      const open = !nav.classList.contains('open'); nav.classList.toggle('open', open);
      menu.setAttribute('aria-expanded', String(open)); menu.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    nav.addEventListener('click', e => { if (e.target.closest('a')) close(); });
    document.addEventListener('click', e => { if (!e.target.closest('.site-header')) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && nav.classList.contains('open')) { e.preventDefault(); close(true); } });
    window.matchMedia('(min-width: 1121px)').addEventListener('change', e => { if (e.matches) close(); });
  }
  $$('.compare').forEach(compare => {
    if (compare.getAttribute('data-v8-compare') !== null) return;
    const range = $('input[type="range"]', compare); if (!range) return;
    const update = () => {
      const value = Math.min(100, Math.max(0, Number(range.value)));
      compare.style.setProperty('--split', `${value}%`); range.setAttribute('aria-valuetext', `${value}% before, ${100-value}% after`);
    };
    range.addEventListener('input', update); update();
  });
  if (window.matchMedia('(hover: hover)').matches && !reduced.matches) {
    $$('.magic-card').forEach(card => card.addEventListener('pointermove', e => {
      const r = card.getBoundingClientRect(); card.style.setProperty('--mx', `${e.clientX-r.left}px`); card.style.setProperty('--my', `${e.clientY-r.top}px`);
    }));
  }
  // Content remains visible when scripts or observers are unavailable.
  if ('IntersectionObserver' in window && !reduced.matches) {
    const io = new IntersectionObserver(entries => entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('revealed'); io.unobserve(e.target); }
    }), {threshold:.08});
    $$('[data-reveal]').forEach(el => io.observe(el));
  }
  // Illustrative states: a patient update never changes the purpose boundary.
  const context = $('.context-stage');
  if (context) {
    const modes = {
      public:{label:'Public education',nodes:['doctor','clinic','specialty','evidence']},
      patient:{label:'Patient preparation',nodes:['patient','clinic','purpose','unknowns']},
      doctor:{label:'Doctor review',nodes:['patient','doctor','evidence','unknowns']}
    };
    let current = 'public', updated = false;
    const render = () => {
      const mode = modes[current];
      $$('.context-btn').forEach(b => { const on=b.dataset.mode===current; b.classList.toggle('active',on); b.setAttribute('aria-pressed',String(on)); });
      $$('.ctx-node',context).forEach(n => {
        const eligible=mode.nodes.includes(n.dataset.node); n.classList.toggle('active',eligible);
        n.setAttribute('aria-label',`${n.textContent.trim()}: ${eligible?'included for this purpose':'excluded for this purpose'}`);
      });
      const title=$('.context-core strong',context); if(title) title.textContent=mode.label;
      const note=$('#context-note');
      if(note) note.textContent=current==='public'
        ? (updated?'The illustrative patient timeline changed. It remains excluded from public education; only an eligible patient or doctor view may use it.':'Public education uses professional and evidence context. Private patient context stays outside this purpose.')
        : `${mode.label} includes only the highlighted context. ${updated?'The patient reported timeline carries an update for review.':'Unanswered questions remain visible as unknowns.'}`;
    };
    $$('.context-btn').forEach(b=>b.addEventListener('click',()=>{ if(modes[b.dataset.mode]){current=b.dataset.mode;render();} }));
    $('#context-update')?.addEventListener('click',()=>{
      updated=!updated; const label=$('.ctx-node[data-node="patient"] b',context);
      if(label)label.textContent=updated?'Timeline updated · patient reported':'Patient reported timeline'; render();
    }); render();
  }
  const evidence=$('#evidence-change'); let evidenceChanged=false;
  evidence?.addEventListener('click',()=>{
    evidenceChanged=!evidenceChanged;
    $$('#evidence-demo .demo-chip').forEach(c=>c.classList.toggle('active',evidenceChanged));
    $('#evidence-status').textContent=evidenceChanged?'Illustration: source changed → reassess the claim → review dependent content before reuse.':'Illustration: the source and dependent content are in a stable evidence state.';
    evidence.textContent=evidenceChanged?'Reset evidence example':'Source materially changes'; evidence.setAttribute('aria-pressed',String(evidenceChanged));
  });
  const trust=$('#trust-change'); let trustChanged=false;
  trust?.addEventListener('click',()=>{
    trustChanged=!trustChanged; const chips=$$('#trust-demo .demo-chip');
    chips.forEach((c,i)=>c.classList.toggle('active',trustChanged?i===1:i===0));
    if(chips[1])chips[1].textContent=trustChanged?'Review required':'Approved';
    if(chips[2])chips[2].textContent=trustChanged?'Release blocked':'Release';
    $('#trust-status').textContent=trustChanged?'Illustration: medical meaning changed. The old approval cannot authorize release; the doctor must review this version.':'Illustration: current approval matches this version of the content.';
    trust.textContent=trustChanged?'Reset approval example':'Change medical meaning'; trust.setAttribute('aria-pressed',String(trustChanged));
  });
  const rail=$('#research-rail');
  if(rail){
    const section=rail.closest('section');
    $$('.filter-chip',section).forEach(b=>b.addEventListener('click',()=>{
      $$('.filter-chip',section).forEach(o=>{const on=o===b;o.classList.toggle('active',on);o.setAttribute('aria-pressed',String(on));});
      $$('.research-card',rail).forEach(c=>{c.hidden=b.dataset.filter!=='all'&&!c.dataset.category.split(' ').includes(b.dataset.filter);});
      rail.scrollTo({left:0,behavior:'auto'}); const status=$('#research-filter-status');
      if(status)status.textContent=`${$$('.research-card:not([hidden])',rail).length} research sources shown`;
    }));
    const move=d=>{const card=$('.research-card:not([hidden])',rail);if(card)rail.scrollBy({left:d*(card.getBoundingClientRect().width+18),behavior:behavior()});};
    $('#research-prev')?.addEventListener('click',()=>move(-1)); $('#research-next')?.addEventListener('click',()=>move(1));
  }
  // Accessible tabs with selected state and roving keyboard focus.
  $$('.tabs').forEach((tabs,index)=>{
    const list=$('.tab-list',tabs);if(!list)return;
    const buttons=$$('.tab-btn',list),panels=$$('.tab-panel',tabs);list.setAttribute('role','tablist');
    const select=(b,focus=false)=>{
      buttons.forEach((o,i)=>{
        const on=o===b;o.id||=`tabs-${index}-${i}`;o.setAttribute('role','tab');o.setAttribute('aria-selected',String(on));o.tabIndex=on?0:-1;o.classList.toggle('active',on);
        const p=panels.find(p=>p.dataset.panel===o.dataset.tab);
        if(p){p.id||=`panel-${index}-${i}`;o.setAttribute('aria-controls',p.id);p.setAttribute('aria-labelledby',o.id);p.setAttribute('role','tabpanel');p.hidden=!on;p.tabIndex=0;}
      });if(focus)b.focus();
    };
    buttons.forEach((b,i)=>{
      b.addEventListener('click',()=>select(b));b.addEventListener('keydown',e=>{
        const target=e.key==='ArrowRight'?(i+1)%buttons.length:e.key==='ArrowLeft'?(i+buttons.length-1)%buttons.length:e.key==='Home'?0:e.key==='End'?buttons.length-1:null;
        if(target!==null){e.preventDefault();select(buttons[target],true);}
      });
    });if(buttons.length)select(buttons.find(b=>b.classList.contains('active'))||buttons[0]);
  });
  const finish=el=>{el.textContent=`${el.dataset.target}${el.dataset.suffix||''}`;};
  const animate=el=>{
    if(reduced.matches)return finish(el);const target=Number(el.dataset.target),digits=(String(target).split('.')[1]||'').length,start=performance.now();
    const frame=now=>{const t=Math.min(1,(now-start)/1100);el.textContent=`${(target*(1-Math.pow(1-t,3))).toFixed(digits)}${el.dataset.suffix||''}`;if(t<1)requestAnimationFrame(frame);else finish(el);};requestAnimationFrame(frame);
  };
  $$('[data-target]').forEach(finish);
  if('IntersectionObserver'in window&&!reduced.matches){
    const observer=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){observer.unobserve(e.target);animate(e.target);}}),{threshold:.4});
    $$('[data-target]').forEach(el=>observer.observe(el));
  }
  // Dialog containment, inert background, Escape and focus return.
  const modal=$('#global-modal'),body=$('#modal-body');
  if(modal&&body){
    let returnFocus=null,oldOverflow='',inertState=[];
    const controls=()=>$$('button,a[href],input,select,textarea,[tabindex="0"]',modal).filter(el=>!el.disabled&&!el.hidden&&el.getClientRects().length>0);
    const close=()=>{
      if(!modal.classList.contains('open'))return;modal.classList.remove('open');modal.setAttribute('aria-hidden','true');
      inertState.forEach(([el,before])=>{el.inert=before;});inertState=[];document.body.style.overflow=oldOverflow;
      if(returnFocus?.isConnected)returnFocus.focus();
    };
    $$('[data-modal-title]').forEach(trigger=>trigger.addEventListener('click',e=>{
      e.preventDefault();returnFocus=trigger;oldOverflow=document.body.style.overflow;body.replaceChildren();
      const eyebrow=document.createElement('div');eyebrow.className='eyebrow';eyebrow.textContent=trigger.dataset.modalEyebrow||'DigiDr approach';
      const title=document.createElement('h2');title.id='dialog-title';title.textContent=trigger.dataset.modalTitle;
      const copy=document.createElement('p');copy.textContent=trigger.dataset.modalText||'';body.append(eyebrow,title,copy);
      inertState=[...document.body.children].filter(el=>el!==modal&&!['SCRIPT','STYLE'].includes(el.tagName)).map(el=>[el,el.inert]);inertState.forEach(([el])=>{el.inert=true;});
      document.body.style.overflow='hidden';modal.setAttribute('aria-hidden','false');modal.classList.add('open');($('.modal-close',modal)||$('.modal-card',modal)).focus();
    }));
    $$('.modal-close',modal).forEach(b=>b.addEventListener('click',close));let backdropDown=false;
    modal.addEventListener('pointerdown',e=>{backdropDown=e.target===modal;});modal.addEventListener('click',e=>{if(e.target===modal&&backdropDown)close();backdropDown=false;});
    modal.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();close();}if(e.key!=='Tab')return;
      const items=controls(),first=items[0],last=items.at(-1);
      if(!first){e.preventDefault();$('.modal-card',modal)?.focus();}
      else if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
  }
  // Local research search: query text is never transmitted.
  const index=$('[data-research-index]');
  if(index){
    const cards=$$('[data-research-item]',index),query=$('#research-query'),category=$('#research-category'),sort=$('#research-sort'),result=$('#research-results');
    const update=()=>{
      const term=(query?.value||'').toLocaleLowerCase().trim(),selected=category?.value||'all';let shown=0;
      const ordered=[...cards].sort((a,b)=>sort?.value==='az'?a.dataset.title.localeCompare(b.dataset.title):Number(a.dataset.order)-Number(b.dataset.order));
      ordered.forEach(c=>{c.hidden=!((selected==='all'||c.dataset.category===selected)&&(!term||c.textContent.toLocaleLowerCase().includes(term)));if(!c.hidden)shown++;index.append(c);});
      if(result)result.textContent=`${shown} ${shown===1?'article':'articles'}${term?' matching your search':' to explore'}`;
      const empty=$('#research-empty');if(empty)empty.hidden=shown>0;
    };
    [query,category,sort].filter(Boolean).forEach(el=>el.addEventListener(el===query?'input':'change',update));update();
  }
  // Optional first-party analytics adapter: event names, never personal values.
  document.addEventListener('click',e=>{
    const link=e.target.closest('[data-track]');if(!link)return;const event=link.dataset.track;
    if(!['register_interest','open_app','download_android','view_plans','view_demo'].includes(event))return;
    window.dispatchEvent(new CustomEvent('digidr:interaction',{detail:{event}}));
    if(typeof window.gtag==='function')window.gtag('event',event,{site_section:'premium_website'});
  });
})();
