// The Playground: a sketchbook whose pages turn as you scroll,
// with shark stickers on the cover that can be dragged around or clicked to hop.
// Page flipping only runs on wider screens and when the visitor hasn't asked for
// reduced motion; otherwise the pages stay stacked (see css/playground.css).

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const section = document.querySelector('.sketchbook');

  if (section) {
    const book = section.querySelector('.book');
    const leaves = [...section.querySelectorAll('.leaf')];
    const flipQuery = window.matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)');
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const smooth = (t) => t * t * (3 - 2 * t);   // ease in and out

    section.style.setProperty('--leaves', leaves.length);

    /* ------------------------------------------------------------------
       1. Scroll → page turns
       The section is (sheets + 1) screens tall and the book is pinned (sticky).
       Each sheet gets one screen of scrolling: it rests for the first and last 15%
       so an open spread stays still for a moment, and turns in between.
       ------------------------------------------------------------------ */
    let ticking = false;

    const update = () => {
      ticking = false;
      if (!section.classList.contains('is-flipping')) return;

      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const progress = clamp(-rect.top / scrollable) * leaves.length;   // 0 … number of sheets

      leaves.forEach((leaf, i) => {
        const t = smooth(clamp((progress - i - 0.15) / 0.7));            // 0 = closed, 1 = turned
        leaf.style.setProperty('--angle', `${(-180 * t).toFixed(2)}deg`);
        leaf.style.setProperty('--shade', Math.sin(Math.PI * t).toFixed(3));
        // unturned sheets: the cover on top. Turned sheets: the last one turned on top.
        leaf.style.zIndex = t > 0.5 ? i + 1 : leaves.length * 2 - i;
        if (i === 0) {
          book.style.setProperty('--open', t.toFixed(3));
          section.classList.toggle('is-open', t > 0.01);
        }
      });
    };

    const requestUpdate = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };

    const setMode = () => {
      const flipping = flipQuery.matches;
      section.classList.toggle('is-flipping', flipping);
      if (!flipping) {
        section.classList.remove('is-open');
        book.style.removeProperty('--open');
        leaves.forEach((leaf) => {
          leaf.style.removeProperty('--angle');
          leaf.style.removeProperty('--shade');
          leaf.style.zIndex = '';
        });
      }
      update();
    };

    flipQuery.addEventListener('change', setMode);
    window.addEventListener('scroll', requestUpdate, { passive: true });
    window.addEventListener('resize', requestUpdate);
    setMode();

    /* ------------------------------------------------------------------
       2. Stickers
       - Drag: the sticker "peels off", follows the pointer and sticks where you drop it.
       - Click without moving: it hops.
       - Keyboard: arrow keys move it (Shift = bigger steps), Enter/Space makes it hop.
       Positions are % of the cover, so they still fit when the book resizes.
       ------------------------------------------------------------------ */
    const cover = section.querySelector('.leaf--cover .face--front');
    let topZ = 10;   // the sticker you touched last goes on top

    section.querySelectorAll('.sticker').forEach((sticker) => {
      let drag = null;

      const getPos = () => ({
        x: parseFloat(sticker.style.getPropertyValue('--x')),
        y: parseFloat(sticker.style.getPropertyValue('--y')),
      });

      // keep the whole sticker on the cover
      const place = (x, y) => {
        const maxX = 100 - (sticker.offsetWidth / cover.clientWidth) * 100;
        const maxY = 100 - (sticker.offsetHeight / cover.clientHeight) * 100;
        sticker.style.setProperty('--x', `${clamp(x, 0, maxX).toFixed(2)}%`);
        sticker.style.setProperty('--y', `${clamp(y, 0, maxY).toFixed(2)}%`);
      };

      // restart a one-off animation class
      const play = (name) => {
        sticker.classList.remove('is-hopping', 'is-stuck');
        void sticker.offsetWidth;
        sticker.classList.add(name);
      };
      sticker.addEventListener('animationend', () => sticker.classList.remove('is-hopping', 'is-stuck'));

      sticker.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();   // no text selection / image ghost while dragging
        sticker.setPointerCapture(e.pointerId);
        sticker.style.zIndex = ++topZ;
        drag = { startX: e.clientX, startY: e.clientY, ...getPos(), moved: false };
      });

      sticker.addEventListener('pointermove', (e) => {
        if (!drag) return;
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (!drag.moved && Math.hypot(dx, dy) < 4) return;   // tiny wobble = still a click
        drag.moved = true;
        sticker.classList.add('is-dragging');
        place(drag.x + (dx / cover.clientWidth) * 100, drag.y + (dy / cover.clientHeight) * 100);
      });

      const endDrag = () => {
        if (!drag) return;
        if (drag.moved) {
          sticker.classList.remove('is-dragging');
          play('is-stuck');
        } else {
          play('is-hopping');
        }
        drag = null;
      };
      sticker.addEventListener('pointerup', endDrag);
      sticker.addEventListener('pointercancel', endDrag);

      // keyboard "click" (Enter / Space). Mouse clicks are handled in pointerup.
      sticker.addEventListener('click', (e) => { if (e.detail === 0) play('is-hopping'); });

      sticker.addEventListener('keydown', (e) => {
        const step = e.shiftKey ? 6 : 2;
        const moves = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
        if (!moves[e.key]) return;
        e.preventDefault();   // don't scroll the page
        const { x, y } = getPos();
        place(x + moves[e.key][0], y + moves[e.key][1]);
      });
    });
  }
}
