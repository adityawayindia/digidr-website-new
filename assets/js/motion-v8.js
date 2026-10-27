/* DigiDr v9: finite demonstrations with readable holds and persistent manual control.
   The retained filename keeps older package entrypoints compatible. */
(() => {
  'use strict';

  const clamp = value => Math.min(100, Math.max(0, Number(value) || 0));
  const ease = value => (1 - Math.cos(Math.PI * value)) / 2;
  function walkerGeometry(width, split) {
    const laneWidth = Math.max(44, Number(width) || 44);
    const pole = laneWidth * clamp(split) / 100;
    const left = Math.max(0, Math.min(laneWidth - 44, pole - 40));
    return { pole, left, grip:Math.max(0, Math.min(44, pole - left)) };
  }

  /* The controller owns one split value. The DOM adapter paints the slider,
     image reveal, pole and walker from that value; input never waits for rAF. */
  function createComparisonMotion(adapter) {
    let value = clamp(adapter.initialValue ?? 50);
    let mode = adapter.reduced ? 'reduced' : 'idle';
    let reduced = !!adapter.reduced;
    let visible = false;
    let hidden = false;
    let automaticUsed = reduced;
    let elapsed = 0;
    let previousTick = null;
    let frame = null;
    let segments = [];
    let duration = 0;
    const capable = adapter.capable !== false;

    const emit = () => adapter.state?.({ mode, value, reduced, capable });
    const paint = (next, moving = false) => {
      const prior = value;
      value = clamp(next);
      adapter.write(value, { moving, direction: value < prior ? -1 : 1 });
    };
    const cancel = () => {
      if (frame !== null) adapter.cancel(frame);
      frame = null;
      previousTick = null;
    };
    const stop = (reason = 'manual') => {
      cancel();
      automaticUsed = true;
      mode = reason;
      paint(value, false);
      emit();
    };
    const queue = () => { frame = adapter.request(tick); };
    function tick(timestamp) {
      frame = null;
      if (mode !== 'playing') return;
      if (previousTick !== null) elapsed += Math.max(0, timestamp - previousTick);
      previousTick = timestamp;
      if (elapsed >= duration) {
        paint(50, false);
        mode = 'complete';
        previousTick = null;
        emit();
        return;
      }
      let remaining = elapsed;
      for (const segment of segments) {
        if (remaining <= segment.duration) {
          const progress = segment.duration ? remaining / segment.duration : 1;
          const moving = segment.from !== segment.to;
          paint(segment.from + (segment.to - segment.from) * ease(progress), moving);
          break;
        }
        remaining -= segment.duration;
      }
      queue();
    }
    const play = () => {
      if (reduced || !capable) return false;
      cancel();
      automaticUsed = true;
      elapsed = 0;
      segments = [
        { from:value, to:value, duration:500 },
        { from:value, to:100, duration:Math.max(1, (100 - value) * 45) },
        { from:100, to:100, duration:6000 },
        { from:100, to:0, duration:4500 },
        { from:0, to:0, duration:6000 },
        { from:0, to:50, duration:2250 }
      ];
      duration = segments.reduce((sum, segment) => sum + segment.duration, 0);
      mode = visible && !hidden ? 'playing' : 'suspended';
      emit();
      if (mode === 'playing') queue();
      return true;
    };
    const environment = updates => {
      if ('visible' in updates) visible = !!updates.visible;
      if ('hidden' in updates) hidden = !!updates.hidden;
      if ((!visible || hidden) && mode === 'playing') {
        cancel();
        mode = 'suspended';
        paint(value, false);
        emit();
      } else if (visible && !hidden && mode === 'suspended' && !reduced) {
        mode = 'playing';
        emit();
        queue();
      } else if (visible && !hidden && mode === 'idle' && !automaticUsed) {
        play();
      }
    };
    const setReduced = next => {
      if (reduced === !!next) return;
      reduced = !!next;
      if (reduced) stop('reduced');
      else {
        mode = 'manual';
        emit();
      }
    };
    paint(value, false);
    emit();
    return {
      environment, play, setReduced,
      pause: () => stop('paused'),
      interrupt: () => stop('manual'),
      input(next) { stop('manual'); paint(next, !reduced); },
      show(next) { stop('manual'); paint(next, false); },
      snapshot: () => ({ value, mode, elapsed, automaticUsed, frameScheduled:frame !== null })
    };
  }

  /* A bounded cue, independent of the comparison's reading pauses. It is only
     eligible after the automatic demonstration ends, and user input permanently
     suppresses it for this page visit. Offscreen time never consumes a wave. */
  function createIdleCue(adapter) {
    let suppressed = !!adapter.reduced;
    let visible = false;
    let hidden = false;
    let eligible = false;
    let count = 0;
    let timer = null;
    let finishTimer = null;
    let waving = false;
    const ready = () => !suppressed && visible && !hidden && eligible;
    const emit = () => adapter.write({ visible:ready() && count > 0, waving:ready() && waving, count, suppressed });
    const cancel = () => {
      if (timer !== null) adapter.cancel(timer);
      if (finishTimer !== null) adapter.cancel(finishTimer);
      timer = finishTimer = null;
      waving = false;
    };
    const schedule = () => {
      if (!ready() || count >= 2 || timer !== null || finishTimer !== null) return;
      timer = adapter.request(() => {
        timer = null;
        if (!ready()) return;
        count += 1;
        waving = true;
        emit();
        finishTimer = adapter.request(() => {
          finishTimer = null;
          waving = false;
          emit();
          schedule();
        }, 1600);
      }, count ? 8000 : 2500);
    };
    return {
      environment(updates) {
        if ('visible' in updates) visible = !!updates.visible;
        if ('hidden' in updates) hidden = !!updates.hidden;
        if ('eligible' in updates) eligible = !!updates.eligible;
        if (!ready()) cancel();
        emit();
        schedule();
      },
      suppress() { suppressed = true; cancel(); emit(); },
      snapshot: () => ({ count, suppressed, waving, scheduled:timer !== null || finishTimer !== null })
    };
  }

  // This export lets the state machine be exercised without a fake browser engine.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createComparisonMotion, createIdleCue, walkerGeometry };
    return;
  }
  if (typeof document === 'undefined' || typeof window === 'undefined') return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const listenMedia = (media, listener) => {
    if (media.addEventListener) media.addEventListener('change', listener);
    else if (media.addListener) media.addListener(listener);
  };

  document.querySelectorAll('[data-v8-compare-demo]').forEach(demo => {
    const compare = demo.querySelector('[data-v8-compare]');
    const range = compare?.querySelector('input[type="range"]');
    const track = demo.querySelector('[data-v8-walk-track]');
    const walker = demo.querySelector('[data-v8-walker]');
    const arm = demo.querySelector('[data-v8-grip-arm]');
    const hand = demo.querySelector('[data-v8-grip-hand]');
    const bubble = demo.querySelector('[data-v9-compare-cue]');
    const pause = demo.querySelector('[data-v8-motion-pause]');
    const replay = demo.querySelector('[data-v8-motion-replay]');
    const controls = demo.querySelector('[data-v8-motion-controls]');
    const status = demo.querySelector('[data-v8-motion-status]');
    const beforeLabel = demo.querySelector('[data-v8-before-label]');
    const afterLabel = demo.querySelector('[data-v8-after-label]');
    if (!compare || !range || !track || !walker || !pause || !replay || !controls) return;
    const capable = 'IntersectionObserver' in window;
    let trackWidth = track.clientWidth;
    let current = clamp(range.value);
    let currentMoving = false;
    let idleCue = null;
    let currentMode = reduced.matches ? 'reduced' : 'idle';
    let promptsSuppressed = reduced.matches;

    const syncPause = () => {
      pause.disabled = !['playing', 'suspended'].includes(currentMode) &&
        !(currentMode === 'complete' && !promptsSuppressed);
    };

    function positionWalker(value, moving) {
      // Keep the entire 44 px figure on screen, including at both full-image ends.
      const { left, grip } = walkerGeometry(trackWidth, value);
      walker.style.transform = `translateX(${left.toFixed(3)}px)`;
      if (bubble) bubble.style.left = `${Math.max(0, Math.min(trackWidth - 132, left + 22 - 66)).toFixed(3)}px`;
      arm?.setAttribute('d', `M22 17 ${((22 + grip) / 2).toFixed(3)} 20 ${grip.toFixed(3)} 24`);
      hand?.setAttribute('cx', grip.toFixed(3));
      const angle = moving && !reduced.matches ? Math.sin(value * Math.PI / 4) * 12 : 0;
      walker.style.setProperty('--v8-step-angle', `${angle.toFixed(3)}deg`);
    }

    const controller = createComparisonMotion({
      initialValue:current,
      reduced:reduced.matches,
      capable,
      request: callback => window.requestAnimationFrame(callback),
      cancel: id => window.cancelAnimationFrame(id),
      write(value, movement) {
        current = value;
        currentMoving = movement.moving;
        // Native input allows fractional positions during motion; keyboard
        // increments below remain a predictable 1% (10% for Page Up/Down).
        range.value = String(value);
        demo.style.setProperty('--v8-split', `${value.toFixed(4)}%`);
        range.setAttribute('aria-valuetext', `${Math.round(value)}% before, ${Math.round(100 - value)}% after`);
        if (beforeLabel) beforeLabel.hidden = value < 12;
        if (afterLabel) afterLabel.hidden = value > 88;
        positionWalker(value, movement.moving);
      },
      state(state) {
        demo.dataset.motionState = state.mode;
        currentMode = state.mode;
        idleCue?.environment({ eligible:state.mode === 'complete' });
        syncPause();
        replay.disabled = state.reduced || !state.capable;
        replay.title = state.reduced ? 'Motion is off in your device settings.' : !state.capable ? 'Use the comparison handle.' : 'Play the comparison again';
        const messages = {
          idle:'Drag the handle to compare before and after DigiDr.',
          playing:'Comparison animation playing. You can pause or drag the handle at any time.',
          suspended:'Comparison animation paused while outside the view.',
          paused:'Comparison paused. Drag the handle or choose Replay.',
          manual:'You control the comparison. Automatic motion has stopped.',
          complete:'Comparison complete. Drag the handle, choose a full view, or replay the demonstration.',
          reduced:'Automatic motion is off. Drag the handle to compare.'
        };
        if (status && status.textContent !== messages[state.mode]) status.textContent = messages[state.mode];
      }
    });
    idleCue = createIdleCue({
      reduced:reduced.matches,
      request:(callback, delay) => window.setTimeout(callback, delay),
      cancel:id => window.clearTimeout(id),
      write(state) {
        promptsSuppressed = state.suppressed;
        demo.classList.toggle('v9-cue-waving', state.waving);
        if (bubble) bubble.hidden = !state.visible;
        syncPause();
      }
    });
    controls.hidden = false;
    const interrupt = () => { idleCue.suppress(); controller.interrupt(); };
    const pauseAll = () => { idleCue.suppress(); controller.pause(); };
    const takeControl = event => {
      if (event.target.closest?.('[data-v8-motion-pause]')) pauseAll();
      else interrupt();
    };
    demo.addEventListener('pointerdown', takeControl, { passive:true });
    demo.addEventListener('touchstart', takeControl, { passive:true });
    range.addEventListener('focus', interrupt);
    range.addEventListener('input', () => { idleCue.suppress(); controller.input(range.value); });
    range.addEventListener('keydown', event => {
      interrupt();
      const moves = { ArrowLeft:-1, ArrowDown:-1, ArrowRight:1, ArrowUp:1, PageDown:-10, PageUp:10 };
      if (event.key in moves) {
        event.preventDefault();
        controller.input(current + moves[event.key]);
      } else if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        controller.input(event.key === 'Home' ? 0 : 100);
      }
    });
    pause.addEventListener('click', pauseAll);
    replay.addEventListener('click', () => controller.play());
    demo.querySelectorAll('[data-v9-compare-show]').forEach(button => {
      button.addEventListener('focus', interrupt);
      button.addEventListener('click', () => {
        idleCue.suppress();
        controller.show(button.dataset.v9CompareShow === 'before' ? 100 : 0);
      });
    });
    // Keyboard focus on either control also stops an unsolicited demonstration;
    // activating Replay explicitly starts a new, single demonstration.
    pause.addEventListener('focus', pauseAll);
    replay.addEventListener('focus', interrupt);
    const resize = () => {
      trackWidth = track.clientWidth;
      positionWalker(current, currentMoving);
    };
    if ('ResizeObserver' in window) new ResizeObserver(resize).observe(track);
    else window.addEventListener('resize', resize, { passive:true });
    controller.environment({ hidden:document.hidden });
    idleCue.environment({ hidden:document.hidden });
    if (capable) {
      const observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === demo);
        if (entry) {
          const visible = entry.isIntersecting && entry.intersectionRatio >= .2;
          controller.environment({ visible });
          idleCue.environment({ visible });
        }
      }, { threshold:[0, .2] });
      observer.observe(demo);
    }
    document.addEventListener('visibilitychange', () => {
      controller.environment({ hidden:document.hidden });
      idleCue.environment({ hidden:document.hidden });
    });
    listenMedia(reduced, event => {
      if (event.matches) idleCue.suppress();
      controller.setReduced(event.matches);
    });
  });

  document.querySelectorAll('[data-v8-pinned-workspace]').forEach(wrapper => {
    const card = wrapper.querySelector('[data-v8-pendulum]');
    const pause = wrapper.parentElement?.querySelector('[data-v9-pendulum-pause]');
    if (!card) return;
    const phone = window.matchMedia('(max-width: 600px)');
    let used = reduced.matches || phone.matches;
    let visible = false;
    const syncControl = () => {
      if (!pause) return;
      pause.hidden = reduced.matches || phone.matches || !('IntersectionObserver' in window);
      pause.disabled = wrapper.dataset.motionState !== 'swinging';
      pause.textContent = wrapper.dataset.motionState === 'swinging' ? 'Pause motion' : 'Motion settled';
    };
    const settle = () => {
      used = true;
      wrapper.dataset.motionState = 'static';
      syncControl();
    };
    const start = () => {
      if (used || !visible || document.hidden || reduced.matches || phone.matches) return;
      used = true;
      wrapper.dataset.motionState = 'swinging';
      syncControl();
    };
    card.addEventListener('animationend', event => {
      if (event.animationName === 'v8-workspace-sway') settle();
    });
    card.addEventListener('pointerenter', settle, { passive:true });
    card.addEventListener('pointerdown', settle, { passive:true });
    card.addEventListener('focusin', settle);
    pause?.addEventListener('click', settle);
    listenMedia(reduced, event => { if (event.matches) settle(); syncControl(); });
    listenMedia(phone, event => { if (event.matches) settle(); syncControl(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) settle(); });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === wrapper);
        if (!entry) return;
        visible = entry.isIntersecting && entry.intersectionRatio >= .35;
        if (visible) start();
        else if (wrapper.dataset.motionState === 'swinging') settle();
      }, { threshold:[0, .35] });
      observer.observe(wrapper);
    }
    syncControl();
  });
})();
