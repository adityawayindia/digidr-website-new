/* DigiDr milestone celebration. One canvas, one frame loop and one gap timer.
   This module is independent of the original hero comparison controller. */
(() => {
  'use strict';

  function createCelebrationController(adapter) {
    const duration = adapter.duration ?? 3500;
    const gap = adapter.gap ?? 4000;
    let visible = false;
    let hidden = false;
    let reduced = !!adapter.reduced;
    let paused = false;
    let destroyed = false;
    let phase = reduced ? 'reduced' : 'idle';
    let frame = null;
    let timer = null;
    let startTime = null;
    let cycles = 0;

    const ready = () => !destroyed && !paused && !reduced && visible && !hidden;
    const snapshot = () => ({phase, paused, reduced, visible, hidden, cycles,
      frameScheduled:frame !== null, timerScheduled:timer !== null});
    const emit = () => adapter.state?.(snapshot());
    const cancel = () => {
      if (frame !== null) adapter.cancelFrame(frame);
      if (timer !== null) adapter.clearTimer(timer);
      frame = timer = startTime = null;
    };
    function tick(timestamp) {
      frame = null;
      if (!ready() || phase !== 'playing') return;
      if (startTime === null) startTime = timestamp;
      const elapsed = Math.max(0, timestamp - startTime);
      if (elapsed >= duration) {
        adapter.clear();
        phase = 'gap';
        startTime = null;
        emit();
        timer = adapter.setTimer(() => {
          timer = null;
          if (ready()) play();
        }, gap);
        return;
      }
      adapter.draw(elapsed, duration, cycles);
      if (ready() && phase === 'playing') frame = adapter.requestFrame(tick);
    }
    function play() {
      if (!ready()) return;
      cancel();
      cycles += 1;
      phase = 'playing';
      adapter.begin?.(cycles);
      emit();
      frame = adapter.requestFrame(tick);
    }
    function sync() {
      if (!ready()) {
        cancel();
        adapter.clear();
        phase = destroyed ? 'destroyed' : reduced ? 'reduced' : paused ? 'paused' : 'suspended';
        emit();
      } else if (phase !== 'playing' && phase !== 'gap') play();
    }
    emit();
    return {
      snapshot,
      environment(updates) {
        if (destroyed) return;
        if ('visible' in updates) visible = !!updates.visible;
        if ('hidden' in updates) hidden = !!updates.hidden;
        sync();
      },
      togglePause() {if (!destroyed && !reduced) {paused = !paused;sync();}},
      setPaused(value) {if (!destroyed) {paused = !!value;sync();}},
      setReduced(value) {if (!destroyed) {reduced = !!value;sync();}},
      destroy() {if (!destroyed) {destroyed = true;sync();}}
    };
  }

  function seededRandom(seed) {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let next = value;
      next = Math.imul(next ^ next >>> 15, next | 1);
      next ^= next + Math.imul(next ^ next >>> 7, next | 61);
      return ((next ^ next >>> 14) >>> 0) / 4294967296;
    };
  }

  function createScene(width, height, cycle) {
    const random = seededRandom(4589 + cycle * 7919);
    const compact = width < 600;
    const rockets = [0.14,0.5,0.86].map((ratio, index) => ({
      x:width * ratio,
      startY:height * .93,
      endY:height * (.13 + index * .065),
      drift:(index - 1) * Math.min(width * .045, 42),
      delay:index * 110,
      duration:900,
      size:compact ? 20 : 27
    }));
    const particles = [];
    const colors = ['#ffe524','#fff5a8','#f5f3ee'];
    rockets.forEach((rocket, index) => {
      const count = compact ? 23 : 35;
      for (let i = 0; i < count; i++) {
        const angle = random() * Math.PI * 2;
        const speed = (55 + random() * 110) * Math.min(1.4, width / 650 + .35);
        particles.push({
          x:rocket.x + rocket.drift,y:rocket.endY,
          delay:rocket.delay + rocket.duration - 70 + random() * 100,
          vx:Math.cos(angle) * speed,
          vy:Math.sin(angle) * speed - 65,
          gravity:Math.min(310, Math.max(170, height * .43)),
          duration:1800 + random() * 700,
          size:(compact ? 2.1 : 2.7) + random() * 2,
          aspect:1.3 + random() * 1.5,
          spin:(random() - .5) * 4.5,
          rotation:random() * Math.PI,
          opacity:.38 + random() * .30,
          color:colors[(i + index) % colors.length],
          round:i % 5 === 0
        });
      }
    });
    // A sparse canopy makes the shower span the entire width, including edges.
    for (let i = 0; i < (compact ? 25 : 46); i++) {
      particles.push({
        x:(i + random()) / (compact ? 25 : 46) * width,
        y:-12 + random() * height * .12,
        delay:850 + random() * 700,
        vx:(random() - .5) * 45,
        vy:height * (.19 + random() * .08),
        gravity:height * .07,
        duration:2100,
        size:2 + random() * 2.4,
        aspect:1.5 + random(),
        spin:(random() - .5) * 4,
        rotation:random() * Math.PI,
        opacity:.28 + random() * .24,
        color:colors[i % colors.length],
        round:i % 6 === 0
      });
    }
    return {rockets, particles};
  }

  // The hand drawn canvas rocket is decorative, with no image or font request.
  function drawRocket(context, x, y, size, progress) {
    context.save();
    context.translate(x,y);
    context.rotate(-.08);
    context.scale(size / 24, size / 24);
    context.globalAlpha = Math.min(1, progress * 6) * Math.min(1, (1 - progress) * 9) * .83;
    context.strokeStyle = '#ffe524';
    context.lineWidth = 1.4;
    context.lineJoin = 'round';
    context.lineCap = 'round';
    context.beginPath();
    context.moveTo(0,-20);
    context.bezierCurveTo(10,-14,10,5,5,12);
    context.lineTo(-5,12);
    context.bezierCurveTo(-10,5,-10,-14,0,-20);
    context.closePath();
    context.stroke();
    context.beginPath();
    context.arc(0,-5,3.2,0,Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(-8,2);context.lineTo(-14,12);context.lineTo(-5,10);
    context.moveTo(8,2);context.lineTo(14,12);context.lineTo(5,10);
    context.moveTo(-3,15);context.quadraticCurveTo(0,25,3,15);
    context.stroke();
    context.restore();
  }

  function paintScene(context, scene, elapsed, width, height) {
    context.clearRect(0,0,width,height);
    scene.rockets.forEach(rocket => {
      const t = (elapsed - rocket.delay) / rocket.duration;
      if (t < 0 || t > 1) return;
      const ease = t * t;
      drawRocket(context,rocket.x + rocket.drift * ease,
        rocket.startY + (rocket.endY - rocket.startY) * ease,rocket.size,t);
    });
    scene.particles.forEach(particle => {
      const age = elapsed - particle.delay;
      if (age < 0 || age > particle.duration) return;
      const t = age / 1000;
      const fade = Math.min(1, age / 150) * Math.min(1, (particle.duration - age) / 500);
      const x = particle.x + particle.vx * t;
      const y = particle.y + particle.vy * t + .5 * particle.gravity * t * t;
      if (x < -15 || x > width + 15 || y < -15 || y > height + 15) return;
      context.save();
      context.translate(x,y);
      context.rotate(particle.rotation + particle.spin * t);
      context.globalAlpha = fade * particle.opacity;
      context.fillStyle = particle.color;
      if (particle.round) {
        context.beginPath();context.arc(0,0,particle.size * .65,0,Math.PI * 2);context.fill();
      } else {
        context.fillRect(-particle.size / 2,-particle.size * particle.aspect / 2,
          particle.size,particle.size * particle.aspect);
      }
      context.restore();
    });
  }

  // Pure exports permit focused controller tests without starting a browser.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {createCelebrationController,createScene,paintScene};
  }
  if (typeof document === 'undefined' || typeof window === 'undefined') return;

  function mount(root) {
    if (root.dataset.celebrationReady === 'true') return;
    const canvas = root.querySelector('[data-celebration-canvas]');
    const button = root.querySelector('[data-celebration-toggle]');
    if (!canvas || !button) return;
    const context = canvas.getContext('2d');
    if (!context) {button.hidden = true;return;}
    root.dataset.celebrationReady = 'true';
    canvas.setAttribute('aria-hidden','true');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let width = 1;
    let height = 1;
    let scene = createScene(width,height,1);
    let controller;
    let observer;
    let resizer;
    let disposed = false;

    const measure = () => {
      const bounds = root.getBoundingClientRect();
      width = Math.max(1,bounds.width);
      height = Math.max(1,bounds.height);
      const ratio = Math.min(2,window.devicePixelRatio || 1);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio,0,0,ratio,0,0);
      scene = createScene(width,height,controller?.snapshot().cycles || 1);
    };
    const clear = () => context.clearRect(0,0,width,height);
    const buttonState = state => {
      root.dataset.celebrationState = state.phase;
      root.dataset.celebrationCycles = String(state.cycles);
      const stopped = state.paused || state.reduced;
      button.disabled = state.reduced;
      button.setAttribute('aria-pressed',String(stopped));
      button.textContent = state.reduced ? 'Motion paused' : state.paused ? 'Resume celebration' : 'Pause celebration';
      button.setAttribute('aria-label',state.reduced ? 'Celebration paused by your motion preference' : button.textContent);
    };
    controller = createCelebrationController({
      reduced:motion.matches,
      requestFrame:callback => window.requestAnimationFrame(callback),
      cancelFrame:id => window.cancelAnimationFrame(id),
      setTimer:(callback,delay) => window.setTimeout(callback,delay),
      clearTimer:id => window.clearTimeout(id),
      begin:cycle => {scene = createScene(width,height,cycle);},
      draw:elapsed => {
        if (!root.isConnected) {dispose();return;}
        paintScene(context,scene,elapsed,width,height);
      },
      clear,state:buttonState
    });
    measure();
    const onClick = () => controller.togglePause();
    const onMotion = event => controller.setReduced(event.matches);
    const onVisibility = () => controller.environment({hidden:document.hidden});
    const onPageHide = () => controller.environment({hidden:true});
    const onPageShow = () => {onVisibility();checkVisibility();};
    function checkVisibility() {
      if (disposed) return;
      if (!root.isConnected) {dispose();return;}
      const bounds = root.getBoundingClientRect();
      const viewHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewWidth = window.innerWidth || document.documentElement.clientWidth;
      const seen = Math.max(0,Math.min(bounds.bottom,viewHeight) - Math.max(bounds.top,0));
      controller.environment({visible:seen >= Math.min(bounds.height * .08,60) && bounds.right > 0 && bounds.left < viewWidth});
    }
    function dispose() {
      if (disposed) return;
      disposed = true;
      controller.destroy();
      observer?.disconnect();
      resizer?.disconnect();
      button.removeEventListener('click',onClick);
      document.removeEventListener('visibilitychange',onVisibility);
      window.removeEventListener('pagehide',onPageHide);
      window.removeEventListener('pageshow',onPageShow);
      window.removeEventListener('scroll',checkVisibility);
      window.removeEventListener('resize',onResize);
      if (motion.removeEventListener) motion.removeEventListener('change',onMotion);
      else motion.removeListener(onMotion);
    }
    const onResize = () => {measure();checkVisibility();};
    button.addEventListener('click',onClick);
    document.addEventListener('visibilitychange',onVisibility);
    window.addEventListener('pagehide',onPageHide);
    window.addEventListener('pageshow',onPageShow);
    if (motion.addEventListener) motion.addEventListener('change',onMotion);
    else motion.addListener(onMotion);
    if ('ResizeObserver' in window) {
      resizer = new ResizeObserver(() => {measure();checkVisibility();});
      resizer.observe(root);
    } else window.addEventListener('resize',onResize,{passive:true});
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(entries => {
        const entry = entries.find(item => item.target === root);
        if (entry) controller.environment({visible:entry.isIntersecting && entry.intersectionRatio >= .08});
      },{threshold:[0,.08]});
      observer.observe(root);
    } else window.addEventListener('scroll',checkVisibility,{passive:true});
    // Exposed cleanup is useful when a host replaces this section in place.
    root.digidrCelebration = {destroy:dispose,snapshot:controller.snapshot};
    controller.environment({hidden:document.hidden});
    checkVisibility();
  }
  const initialize = () => document.querySelectorAll('[data-celebration]').forEach(mount);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
