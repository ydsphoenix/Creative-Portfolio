// Home page motion:
// 1. program icon bubbles follow the mouse (parallax) and can be grabbed and thrown
// 2. two marquee rows that speed up while you scroll
// 3. featured preview tilts in 3D toward the mouse

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduceMotion) {
    /* ---------------- 1. Throwable, parallax bubbles ---------------- */
    const SPRING = 0.06;     // how hard a thrown bubble is pulled back home
    const DAMPING = 0.86;    // 1 = never stops bouncing, lower = settles faster
    const PARALLAX = 22;     // max parallax shift in px (times each bubble's --depth)

    const portrait = document.querySelector('.hero__portrait-wrap');
    const hint = document.querySelector('.hero__hint');
    const mouse = { x: 0, y: 0 }; // -1…1 from the centre of the screen

    const bubbles = [...document.querySelectorAll('.tool')].map((el) => ({
      el,
      depth: parseFloat(getComputedStyle(el).getPropertyValue('--depth')) || 1,
      x: 0, y: 0,        // drag/throw offset
      vx: 0, vy: 0,      // velocity
      dragging: false,
      lastX: 0, lastY: 0,
    }));

    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    bubbles.forEach((b) => {
      b.el.addEventListener('pointerdown', (e) => {
        b.dragging = true;
        b.lastX = e.clientX;
        b.lastY = e.clientY;
        b.el.setPointerCapture(e.pointerId);   // keep receiving moves outside the bubble
        b.el.classList.add('is-grabbed');
        if (hint) hint.classList.add('is-hidden');
      });

      b.el.addEventListener('pointermove', (e) => {
        if (!b.dragging) return;
        const dx = e.clientX - b.lastX;
        const dy = e.clientY - b.lastY;
        b.x += dx;
        b.y += dy;
        b.vx = dx;          // remember the last movement as throw speed
        b.vy = dy;
        b.lastX = e.clientX;
        b.lastY = e.clientY;
      });

      const release = () => {
        if (!b.dragging) return;
        b.dragging = false;
        b.el.classList.remove('is-grabbed');
        // jelly wobble when you let go (Web Animations API, adds on top of the CSS bob)
        b.el.animate(
          [{ scale: '1' }, { scale: '1.18 0.84' }, { scale: '0.9 1.1' }, { scale: '1.05 0.96' }, { scale: '1' }],
          { duration: 600, easing: 'ease-out' }
        );
      };
      b.el.addEventListener('pointerup', release);
      b.el.addEventListener('pointercancel', release);

      // Double-click: pop! The bubble bursts into droplets and comes back a moment later.
      b.el.addEventListener('dblclick', () => {
        if (b.el.classList.contains('is-popped')) return;
        b.el.classList.add('is-popped');

        const parent = b.el.parentElement;
        const r = b.el.getBoundingClientRect();
        const pr = parent.getBoundingClientRect();
        for (let i = 0; i < 8; i++) {
          const d = document.createElement('span');
          d.className = 'droplet';
          const angle = (i / 8) * Math.PI * 2;
          const dist = r.width * 0.7;
          d.style.cssText = `left:${r.left - pr.left + r.width / 2 - 4}px; top:${r.top - pr.top + r.height / 2 - 4}px;
            --dx:${(Math.cos(angle) * dist).toFixed(0)}px; --dy:${(Math.sin(angle) * dist).toFixed(0)}px;`;
          parent.append(d);
          d.addEventListener('animationend', () => d.remove());
        }

        // burst away, stay gone ~0.9s, then pop back in
        const burst = b.el.animate([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.4' }], { duration: 180, fill: 'forwards' });
        setTimeout(() => {
          const back = b.el.animate(
            [{ opacity: 0, scale: '0' }, { opacity: 1, scale: '1.15', offset: 0.7 }, { opacity: 1, scale: '1' }],
            { duration: 450, easing: 'ease-out' }
          );
          burst.cancel();   // drop the "gone" state; the pop-in animation takes over
          back.finished.then(() => b.el.classList.remove('is-popped'));
        }, 1100);
      });
    });

    /* ---------------- 2. Scroll-reactive marquee ---------------- */
    const rows = [...document.querySelectorAll('.marquee__row')].map((row) => ({
      track: row.querySelector('.marquee__track'),
      speed: parseFloat(row.dataset.speed) || 0.5,
      offset: 0,
    }));
    let boost = 0;
    let direction = 1;
    let lastScroll = window.scrollY;

    window.addEventListener('scroll', () => {
      const delta = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      direction = delta >= 0 ? 1 : -1;               // scrolling up reverses the rows
      boost = Math.min(boost + Math.abs(delta) * 0.15, 14);
    }, { passive: true });

    /* ---------------- Animation loop ---------------- */
    const tick = () => {
      bubbles.forEach((b) => {
        if (!b.dragging) {
          // spring back home with a bit of wobble
          b.vx = (b.vx - b.x * SPRING) * DAMPING;
          b.vy = (b.vy - b.y * SPRING) * DAMPING;
          b.x += b.vx;
          b.y += b.vy;
        }
        const px = -mouse.x * PARALLAX * b.depth;
        const py = -mouse.y * PARALLAX * b.depth;
        b.el.style.translate = `${(b.x + px).toFixed(1)}px ${(b.y + py).toFixed(1)}px`;
      });

      if (portrait) {
        portrait.style.translate = `${(mouse.x * 10).toFixed(1)}px ${(mouse.y * 6).toFixed(1)}px`;
      }

      rows.forEach((r) => {
        const half = r.track.scrollWidth / 2;          // width of one copy of the list
        r.offset += r.speed * (1 + boost) * direction;
        r.offset = ((r.offset % half) + half) % half;  // wrap around seamlessly
        r.track.style.transform = `translateX(${-r.offset}px)`;
      });
      boost *= 0.92;                                   // scroll boost fades out

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    /* ---------------- 3. 3D tilt ---------------- */
    document.querySelectorAll('[data-tilt]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;   // -0.5…0.5
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--tilt-x', `${(-y * 10).toFixed(2)}deg`);
        el.style.setProperty('--tilt-y', `${(x * 12).toFixed(2)}deg`);
        el.style.setProperty('--glare-x', `${(x + 0.5) * 100}%`);
        el.style.setProperty('--glare-y', `${(y + 0.5) * 100}%`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--tilt-x', '0deg');
        el.style.setProperty('--tilt-y', '0deg');
      });
    });
  }
}
