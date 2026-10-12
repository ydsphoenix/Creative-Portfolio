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
     6. Loading screen: lift it away once the page has loaded,
        but keep it at least ~1.7s so the logo animation can finish.
     ------------------------------------------------------------------ */
  const loader = document.querySelector('.loader');
  if (loader && document.documentElement.classList.contains('show-loader')) {
    const MIN_TIME = 1700;
    const start = performance.now();
    const hide = () => {
      const wait = Math.max(0, MIN_TIME - (performance.now() - start));
      setTimeout(() => {
        loader.classList.add('is-done');
        loader.addEventListener('animationend', function done(e) {
          if (e.animationName !== 'loader-out') return;   // ignore the logo's own animations
          loader.removeEventListener('animationend', done);
          document.documentElement.classList.remove('show-loader'); // removes the loader + unlocks scrolling
        });
      }, wait);
    };
    if (document.readyState === 'complete') hide();
    else window.addEventListener('load', hide, { once: true });
  }

  document.querySelectorAll('[data-split]').forEach(splitLetters);
  revealOnScroll();

  if (!reduceMotion) {
    addBoilFilters();
    if (finePointer) {
      bubbleTrail();
      magnetic();
    }
  }
}
