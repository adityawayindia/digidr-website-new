/* Task-specific explanatory diagrams. No records, requests or clinical actions. */
(() => {
  'use strict';
  const ASSISTS = {
    content: {
      name:'ContentAssist', href:'products/contentassist.html',
      context:'Doctor expertise, specialty and intended audience.',
      evidence:'Sources, support and limitations behind each claim.',
      trust:'Doctor review and approval for the exact released version.',
      title:'A draft ready for the doctor to review.',
      description:'Evidence and limitations stay visible. Publication follows approval; an important change returns to review.'
    },
    patient: {
      name:'PatientAssist', href:'products/patientassist.html',
      context:'The patient’s purpose, permitted details and open questions.',
      evidence:'Assessed information for a clear, bounded explanation.',
      trust:'The patient checks the summary. Clinical decisions stay with the doctor.',
      title:'A patient checked summary for the next conversation.',
      description:'The reason for contact, reported changes and open questions stay together, with the appropriate contact or appointment route.'
    },
    doctor: {
      name:'DoctorAssist', href:'products/doctorassist.html',
      context:'Permitted history, recent changes and what remains unknown.',
      evidence:'Relevant sources, disagreement and the limits of the evidence.',
      trust:'The doctor inspects the evidence and retains clinical authority.',
      title:'A focused brief for the doctor to inspect.',
      description:'Relevant context, changes, evidence and uncertainty are assembled for preparation. The doctor makes the clinical judgment.'
    }
  };

  const SOURCE_ORDER = ['doctor','clinic','specialty','patient','evidence','unknowns'];
  const PURPOSES = {
    public: {
      name:'Public education', allowed:['doctor','clinic','specialty','evidence'],
      title:'A public education brief.',
      rows:[
        ['Professional scope','Doctor expertise and teaching preferences'],
        ['Audience','Specialty, intended readers and public purpose'],
        ['Practice context','Relevant clinic and service information'],
        ['Evidence','Assessed support, uncertainty and limitations']
      ],
      note:'Private patient information is outside this purpose.',
      excluded:'Private timelines and personal questions do not enter a public education task.',
      status:'Public education uses professional and assessed evidence context. Private patient details remain excluded.'
    },
    patient: {
      name:'Patient preparation', allowed:['clinic','patient','unknowns'],
      title:'A summary the patient can check.',
      rows:[
        ['Reason for contact','The patient’s stated purpose for this conversation'],
        ['Patient reported context','Timeline and details awaiting confirmation'],
        ['Open questions','What the patient still wants to clarify'],
        ['Next communication','The relevant clinic contact or appointment route']
      ],
      note:'Patient reported details remain distinct from doctor confirmed information.',
      excluded:'Public teaching preferences and broader evidence are not needed for this preparation task.',
      status:'This illustrative preparation uses permitted patient details, open questions and clinic routes. The patient can check the summary.'
    },
    doctor: {
      name:'Doctor review', allowed:['doctor','clinic','patient','evidence','unknowns'],
      title:'A focused brief for the doctor.',
      rows:[
        ['Relevant context','Permitted patient reported details and professional scope'],
        ['Changes and unknowns','Recent changes and points that need clarification'],
        ['Evidence to inspect','Assessed support, disagreement and limitations'],
        ['Practice context','Relevant clinic and follow up information']
      ],
      note:'Permission is assumed only for this illustrative review. Clinical judgment stays with the doctor.',
      excluded:'Public audience targeting is not relevant to this individual review task.',
      status:'This illustrative review assembles permitted context, recent changes, open questions and evidence for the doctor to inspect.'
    }
  };

  function contextState(requestedPurpose, timelineUpdated = false) {
    const purpose = Object.hasOwn(PURPOSES, requestedPurpose) ? requestedPurpose : 'public';
    const definition = PURPOSES[purpose];
    const allowed = [...definition.allowed];
    const rows = definition.rows.map(row => [...row]);
    const excluded = SOURCE_ORDER.filter(key => !allowed.includes(key));
    let status = definition.status;
    if (timelineUpdated) {
      if (purpose === 'public') {
        status = 'The example patient timeline changed. It is still excluded from public education; the public brief does not change.';
      } else if (purpose === 'patient') {
        rows[1][1] = 'A recent change was added · awaiting patient confirmation';
        status = 'The updated patient reported detail appears in the preparation summary. The patient still needs to check it.';
      } else {
        rows[1][1] = 'A patient reported change was added · doctor confirmation pending';
        status = 'The updated patient reported detail is flagged for the doctor. It is not treated as a confirmed clinical finding.';
      }
    }
    return {purpose, name:definition.name, allowed, excluded, rows,
      title:definition.title, note:definition.note, exclusionNote:definition.excluded,
      timelineUpdated:!!timelineUpdated, status};
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {ASSISTS, SOURCE_ORDER, contextState};
    return;
  }
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listenPreference = fn => motion.addEventListener
    ? motion.addEventListener('change', fn) : motion.addListener?.(fn);

  function finiteFlow(root, duration = 3450) {
    let timeout = null;
    let pending = null;
    const stop = () => {
      if (timeout !== null) window.clearTimeout(timeout);
      if (pending !== null) window.cancelAnimationFrame(pending);
      timeout = pending = null;
      root.classList.remove('is-flowing');
    };
    const play = () => {
      stop();
      if (motion.matches || document.hidden) return;
      pending = window.requestAnimationFrame(() => {
        pending = null;
        root.classList.add('is-flowing');
        timeout = window.setTimeout(stop, duration);
      });
    };
    listenPreference(() => { if (motion.matches) stop(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    return {play, stop};
  }

  document.querySelectorAll('[data-v9-architecture]').forEach(root => {
    const choices = [...root.querySelectorAll('[data-v9-assist]')];
    const label = root.querySelector('[data-v9-result-label]');
    const title = root.querySelector('[data-v9-result-title]');
    const description = root.querySelector('[data-v9-result-description]');
    const link = root.querySelector('[data-v9-result-link]');
    const status = root.querySelector('[data-v9-architecture-status]');
    const replay = root.querySelector('[data-v9-architecture-replay]');
    const flow = finiteFlow(root);
    let current = 'content';
    let demonstrated = false;

    function render(key, animate = false) {
      if (!Object.hasOwn(ASSISTS, key)) return;
      current = key;
      const product = ASSISTS[key];
      root.dataset.activeAssist = key;
      choices.forEach(button => {
        const selected = button.dataset.v9Assist === key;
        button.classList.toggle('is-selected', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      for (const engine of ['context','evidence','trust']) {
        const target = root.querySelector(`[data-v9-contribution="${engine}"]`);
        if (target) target.textContent = product[engine];
      }
      label.textContent = `Back to ${product.name}`;
      title.textContent = product.title;
      description.textContent = product.description;
      link.href = product.href;
      link.replaceChildren(document.createTextNode(`Explore ${product.name} `));
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent = '↗';
      link.append(arrow);
      if (animate) {
        demonstrated = true;
        status.textContent = `${product.name}: ${product.title} ${product.description}`;
        flow.play();
      }
    }
    choices.forEach(button => button.addEventListener('click', () => render(button.dataset.v9Assist, true)));
    if (replay) {
      replay.hidden = false;
      replay.disabled = motion.matches;
      replay.addEventListener('click', () => { demonstrated = true; flow.play(); });
      listenPreference(() => { replay.disabled = motion.matches; });
    }
    render(current);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .3) && !demonstrated) {
          demonstrated = true;
          flow.play();
          observer.disconnect();
        }
      }, {threshold:.3});
      observer.observe(root);
    }
  });

  document.querySelectorAll('[data-v9-context]').forEach(root => {
    const stage = root.querySelector('[data-v9-context-stage]');
    const svg = root.querySelector('[data-v9-context-lines]');
    const paths = root.querySelector('[data-v9-context-paths]');
    const eligible = root.querySelector('[data-v9-context-eligible]');
    const excluded = root.querySelector('[data-v9-context-excluded]');
    const engine = root.querySelector('[data-v9-context-engine]');
    const output = root.querySelector('[data-v9-context-output]');
    const outputTitle = root.querySelector('[data-v9-context-output-title]');
    const outputList = root.querySelector('[data-v9-context-output-list]');
    const outputNote = root.querySelector('[data-v9-context-output-note]');
    const exclusionNote = root.querySelector('[data-v9-context-exclusion-note]');
    const excludedCount = root.querySelector('[data-v9-excluded-count]');
    const enginePurpose = root.querySelector('[data-v9-engine-purpose]');
    const status = root.querySelector('[data-v9-context-status]');
    const update = root.querySelector('[data-v9-context-update]');
    const choices = [...root.querySelectorAll('[data-v9-purpose]')];
    const sources = new Map([...root.querySelectorAll('[data-v9-source]')].map(node => [node.dataset.v9Source,node]));
    if (!stage || !svg || !paths || !eligible || !excluded || !engine || !output) return;
    root.classList.add('is-enhanced');
    const flow = finiteFlow(root, 3600);
    let current = 'public';
    let updated = false;
    let drawFrame = null;
    let demonstrated = false;

    function point(rect, box, side) {
      return {
        x: (side === 'left' ? rect.left : side === 'right' ? rect.right : rect.left + rect.width / 2) - box.left,
        y: (side === 'top' ? rect.top : side === 'bottom' ? rect.bottom : rect.top + rect.height / 2) - box.top
      };
    }
    function path(d, key, delay, isOutput = false) {
      const baseline = document.createElementNS('http://www.w3.org/2000/svg','path');
      baseline.setAttribute('d', d);
      baseline.setAttribute('class', `v9-context-path${isOutput ? ' is-output' : ''}`);
      baseline.setAttribute('data-context-connection', key);
      baseline.setAttribute('marker-end','url(#v9-context-arrow)');
      paths.append(baseline);
      const pulse = document.createElementNS('http://www.w3.org/2000/svg','path');
      pulse.setAttribute('d',d);
      pulse.setAttribute('class','v9-context-pulse');
      pulse.setAttribute('pathLength','500');
      pulse.style.setProperty('--v9-delay',`${delay}ms`);
      paths.append(pulse);
    }
    function draw() {
      drawFrame = null;
      const box = stage.getBoundingClientRect();
      if (box.width < 1 || box.height < 1) return;
      svg.setAttribute('viewBox',`0 0 ${box.width} ${box.height}`);
      paths.replaceChildren();
      const engineBox = engine.getBoundingClientRect();
      const outBox = output.getBoundingClientRect();
      const stacked = window.matchMedia('(max-width: 950px)').matches;
      if (stacked) {
        const input = point(eligible.getBoundingClientRect(),box,'bottom');
        const target = point(engineBox,box,'top');
        const middle = (input.y + target.y) / 2;
        path(`M${input.x},${input.y+2} V${middle} H${target.x} V${target.y-4}`,'eligible-sources',0);
        const a = point(engineBox,box,'bottom');
        const b = point(outBox,box,'top');
        path(`M${a.x},${a.y+2} V${(a.y+b.y)/2} H${b.x} V${b.y-4}`,'prepared-context',1050,true);
      } else {
        const target = point(engineBox,box,'left');
        const included = SOURCE_ORDER.filter(key => sources.get(key)?.dataset.included === 'true');
        included.forEach((key,index) => {
          const a = point(sources.get(key).getBoundingClientRect(),box,'right');
          const rail = (a.x + target.x) / 2;
          path(`M${a.x+2},${a.y} H${rail} V${target.y} H${target.x-4}`,key,index*75);
        });
        const a = point(engineBox,box,'right');
        const b = point(outBox,box,'left');
        path(`M${a.x+2},${a.y} H${(a.x+b.x)/2} V${b.y} H${b.x-4}`,'prepared-context',1100,true);
      }
      root.dataset.connectionCount = String(paths.querySelectorAll('[data-context-connection]').length);
    }
    function scheduleDraw() {
      if (drawFrame !== null) window.cancelAnimationFrame(drawFrame);
      drawFrame = window.requestAnimationFrame(draw);
    }
    function render(animate = false) {
      const state = contextState(current,updated);
      root.dataset.contextPurpose = state.purpose;
      root.dataset.timelineUpdated = String(updated);
      choices.forEach(button => {
        const active = button.dataset.v9Purpose === state.purpose;
        button.classList.toggle('is-selected',active);
        button.setAttribute('aria-pressed',String(active));
      });
      SOURCE_ORDER.forEach(key => {
        const node = sources.get(key);
        const included = state.allowed.includes(key);
        node.dataset.included = String(included);
        const detail = node.querySelector('[data-v9-source-detail]');
        const badge = node.querySelector('[data-v9-source-state]');
        if (key === 'patient') {
          node.dataset.updated = String(updated);
          detail.textContent = updated ? 'Recent change · awaiting confirmation' : 'Details awaiting confirmation';
        }
        badge.textContent = key === 'patient' && updated
          ? (included ? 'Updated' : 'Updated · excluded') : (included ? 'Included' : 'Excluded');
        (included ? eligible : excluded).append(node);
      });
      enginePurpose.textContent = state.name;
      outputTitle.textContent = state.title;
      outputList.replaceChildren(...state.rows.map(([label,detail]) => {
        const li = document.createElement('li');
        const strong = document.createElement('strong');
        const span = document.createElement('span');
        strong.textContent = label;
        span.textContent = detail;
        li.append(strong,span);
        return li;
      }));
      outputNote.textContent = state.note;
      exclusionNote.textContent = state.exclusionNote;
      excludedCount.textContent = `${state.excluded.length} ${state.excluded.length === 1 ? 'source' : 'sources'}`;
      status.textContent = state.status;
      scheduleDraw();
      if (animate) {
        demonstrated = true;
        flow.play();
      }
    }
    choices.forEach(button => button.addEventListener('click', () => {
      if (Object.hasOwn(PURPOSES,button.dataset.v9Purpose)) {
        current = button.dataset.v9Purpose;
        render(true);
      }
    }));
    update?.addEventListener('click', () => {
      updated = !updated;
      update.replaceChildren(document.createTextNode(updated ? 'Reset example timeline ' : 'Update example timeline '));
      const arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden','true');
      arrow.textContent = '↻';
      update.append(arrow);
      render(true);
    });
    render();
    if ('ResizeObserver' in window) {
      const observer = new ResizeObserver(scheduleDraw);
      [stage,eligible,engine,output].forEach(node => observer.observe(node));
    } else window.addEventListener('resize',scheduleDraw,{passive:true});
    if (document.fonts?.ready) document.fonts.ready.then(scheduleDraw);
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .25) && !demonstrated) {
          demonstrated = true;
          flow.play();
          observer.disconnect();
        }
      }, {threshold:.25});
      observer.observe(root);
    }
  });
})();
