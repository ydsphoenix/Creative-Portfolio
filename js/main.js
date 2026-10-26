// Shared motion for every page.
// Everything here is decoration: the site works fully without it, and all of it
// switches off for visitors who prefer reduced motion.

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(pointer: fine)').matches;

  /* ------------------------------------------------------------------
     1. "Line boil" filters
     Three slightly different wobble filters. CSS flips between them a few
     times per second, so outlines shimmer like hand-drawn animation frames.
     ------------------------------------------------------------------ */
  function addBoilFilters() {
    const seeds = [1, 7, 13];
    const filters = seeds.map((seed, i) => `
      <filter id="boil-${i}">
        <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${seed}"/>
        <feDisplacementMap in="SourceGraphic" scale="2.5"/>
      </filter>`).join('');
    document.body.insertAdjacentHTML('beforeend',
      `<svg class="boil-defs" aria-hidden="true" focusable="false">${filters}</svg>`);
  }

  /* ------------------------------------------------------------------
     2. Split text into letters
     <h1 data-split>Hello</h1> → each letter becomes <span class="char" style="--i:n">.
     Screen readers still get the full text through aria-label.
     ------------------------------------------------------------------ */
  function splitLetters(el) {
    el.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;

    // Walk text nodes so nested spans (e.g. a coloured word) keep their styling.
    const walk = (node) => {
      [...node.childNodes].forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          // Split into words first so a word never breaks across lines.
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (part === '') return;
            if (/^\s+$/.test(part)) { frag.append(' '); return; }
            const word = document.createElement('span');
            word.className = 'word';
            word.setAttribute('aria-hidden', 'true');
            [...part].forEach((ch) => {
              const span = document.createElement('span');
              span.className = 'char';
              span.textContent = ch;
              span.style.setProperty('--i', i++);
              word.append(span);
            });
            frag.append(word);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          child.setAttribute('aria-hidden', 'true');
          walk(child);
        }
      });
    };
    walk(el);
  }

  /* ------------------------------------------------------------------
     3. Reveal on scroll
     Elements with data-reveal pop in the first time they enter the screen.
     Add data-reveal-delay="200" (ms) to stagger.
     ------------------------------------------------------------------ */
  function revealOnScroll() {
    const items = document.querySelectorAll('[data-reveal]');
    if (reduceMotion || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        el.style.transitionDelay = `${el.dataset.revealDelay || 0}ms`;
        el.classList.add('is-visible');
        // drop the delay afterwards so hover effects on the element aren't delayed
        setTimeout(() => { el.style.transitionDelay = ''; }, 1200 + Number(el.dataset.revealDelay || 0));
        io.unobserve(el);
      });
    }, { threshold: 0.15 });
    items.forEach((el) => io.observe(el));
  }

  /* ------------------------------------------------------------------
     4. Bubble trail: little bubbles float up from the cursor (shark theme!)
     ------------------------------------------------------------------ */
  function bubbleTrail() {
    let last = 0;
    let count = 0;
    window.addEventListener('pointermove', (e) => {
      const now = performance.now();
      if (now - last < 70 || count > 24) return;   // throttle + cap
      last = now;
      count++;

      const b = document.createElement('span');
      b.className = 'bubble';
      const size = 6 + Math.random() * 10;
      b.style.cssText = `left:${e.clientX}px; top:${e.clientY}px; width:${size}px; height:${size}px;
        --drift:${(Math.random() - 0.5) * 40}px;`;
      document.body.append(b);
      b.addEventListener('animationend', () => { b.remove(); count--; });
    });
  }

  /* ------------------------------------------------------------------
     5. Magnetic buttons: buttons lean toward the cursor a little
     ------------------------------------------------------------------ */
  function magnetic() {
    document.querySelectorAll('.btn, .btn-round, .nav-pill a').forEach((el) => {
      const strength = el.matches('.nav-pill a') ? 0.15 : 0.3;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - (r.left + r.width / 2)) * strength;
        const y = (e.clientY - (r.top + r.height / 2)) * strength;
        el.style.translate = `${x}px ${y}px`;
      });
      el.addEventListener('pointerleave', () => { el.style.translate = ''; });
    });
  }

  /* ------------------------------------------------------------------
     Run
     ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
     6. Loading screen: once the page has loaded (and at least ~1.6s has
        passed so the logo can finish), the blue background turns into a
        grid of overlapping bubbles that pop outward from the centre.
     ------------------------------------------------------------------ */
  const loader = document.querySelector('.loader');
  if (loader && document.documentElement.classList.contains('show-loader')) {
    const MIN_TIME = 1600;   // ms the loader stays at least
    const CELL = 110;        // bubble spacing in px (bubbles are 1.5x this, so they overlap)
    const RIPPLE = 550;      // ms for the pop wave to reach the corners
    const start = performance.now();

    const popAway = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const size = CELL * 1.5;
      const maxDist = Math.hypot(w / 2, h / 2);
      const sheet = document.createElement('div');
      sheet.className = 'loader__pop';

      for (let y = 0; y < h + CELL; y += CELL) {
        for (let x = 0; x < w + CELL; x += CELL) {
          const b = document.createElement('span');
          // delay grows with distance from the centre (+ a little randomness)
          const delay = (Math.hypot(x - w / 2, y - h / 2) / maxDist) * RIPPLE + Math.random() * 120;
          b.style.cssText = `left:${x - size / 2}px; top:${y - size / 2}px; width:${size}px; height:${size}px; --d:${delay.toFixed(0)}ms;`;
          sheet.append(b);
        }
      }

      loader.append(sheet);
      loader.classList.add('is-done');   // same frame: background becomes the bubble sheet

      // remove the loader + unlock scrolling once the last bubble has popped
      setTimeout(() => document.documentElement.classList.remove('show-loader'), RIPPLE + 120 + 600);
    };

    const hide = () => {
      const wait = Math.max(0, MIN_TIME - (performance.now() - start));
      setTimeout(popAway, wait);
    };
    if (document.readyState === 'complete') hide();
    else window.addEventListener('load', hide, { once: true });
  }

  /* ------------------------------------------------------------------
     Hero videos (case studies)
     Videos have no autoplay attribute, so reduced-motion visitors (and visitors
     without JS) see the poster still and can press play themselves. Everyone else
     gets the loop. An optional .media-toggle button can pause / play it; videos
     with native controls (like MIRA's) don't need one.
  ------------------------------------------------------------------ */
  function heroVideos() {
    document.querySelectorAll('.case__media video').forEach((video) => {
      const button = video.parentElement.querySelector('.media-toggle');
      const setPaused = (paused) => {
        if (!button) return;
        button.setAttribute('aria-pressed', paused ? 'true' : 'false');
        button.setAttribute('aria-label', paused ? 'Play video' : 'Pause video');
      };
      if (button) {
        button.hidden = false;
        button.addEventListener('click', () => (video.paused ? video.play() : video.pause()));
        video.addEventListener('play', () => setPaused(false));
        video.addEventListener('pause', () => setPaused(true));
      }
      setPaused(true);
      if (!reduceMotion) video.play().catch(() => {}); // browsers may block it: the poster stays
    });
  }

  document.querySelectorAll('[data-split]').forEach(splitLetters);
  revealOnScroll();
  heroVideos();

  if (!reduceMotion) {
    addBoilFilters();
    if (finePointer) {
      bubbleTrail();
      magnetic();
    }
  }
}
