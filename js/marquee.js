// Marquee (Home): two straight rows that loop sideways.
// - Each track starts with one .marquee__set; it is cloned until the row is filled,
//   and moving by exactly one set's width makes the loop seamless.
// - data-speed: pixels per frame (negative = the other direction).
// - Scrolling speeds the rows up (scrolling up reverses them).
// - Reduced motion: the rows stay still.

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const tracks = [...document.querySelectorAll('.marquee__track')].map((el) => ({
    el,
    set: el.querySelector('.marquee__set'),
    speed: parseFloat(el.dataset.speed) || 0.5,
    offset: 0,
    setWidth: 0,
  }));

  if (tracks.length) {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Fill each track with enough copies to cover the screen plus one extra set.
    const layout = () => {
      tracks.forEach((t) => {
        t.el.querySelectorAll('.marquee__set.is-clone').forEach((n) => n.remove());
        t.setWidth = t.set.getBoundingClientRect().width;
        if (!t.setWidth) return;
        const copies = Math.ceil(window.innerWidth / t.setWidth) + 1;
        for (let i = 0; i < copies; i++) {
          const clone = t.set.cloneNode(true);
          clone.classList.add('is-clone');
          t.el.append(clone);
        }
      });
    };

    // Wait for the display font and the icons, otherwise the measured width is wrong.
    const ready = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.all([ready, new Promise((r) => (document.readyState === 'complete' ? r() : window.addEventListener('load', r, { once: true })))])
      .then(layout);

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 150);
    });

    if (!reduceMotion) {
      let boost = 0;
      let direction = 1;
      let lastScroll = window.scrollY;

      window.addEventListener('scroll', () => {
        const delta = window.scrollY - lastScroll;
        lastScroll = window.scrollY;
        direction = delta >= 0 ? 1 : -1;
        boost = Math.min(boost + Math.abs(delta) * 0.15, 14);
      }, { passive: true });

      const tick = () => {
        tracks.forEach((t) => {
          if (!t.setWidth) return;
          t.offset += t.speed * (1 + boost) * direction;
          t.offset = ((t.offset % t.setWidth) + t.setWidth) % t.setWidth;   // wrap around seamlessly
          t.el.style.transform = `translateX(${(-t.offset).toFixed(1)}px)`;
        });
        boost *= 0.92;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }
}
