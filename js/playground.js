// The Playground: a sketchbook whose pages turn as you scroll,
// with shark stickers on the cover that can be dragged around or clicked to hop.
// Wide screens and sideways phones get an open book; upright phones get a notepad
// (spiral on top). With reduced motion the pages just stay stacked (see css/playground.css).

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const section = document.querySelector('.sketchbook');

  if (section) {
    const book = section.querySelector('.book');
    const leaves = [...section.querySelectorAll('.leaf')];
    // Three layouts (see css/playground.css):
    // - "book": the open book, pages turn sideways around the spiral.
    //   Wider screens, and phones held sideways.
    // - "notepad": phones held upright. The book is turned so the spiral is on top,
    //   and every page flips up over the spiral, one after the other.
    // - stacked (no class): reduced motion, tiny screens, no JS.
    const motionOk = '(prefers-reduced-motion: no-preference)';
    const bookQuery = window.matchMedia(
      `(min-width: 761px) and ${motionOk}, (orientation: landscape) and (min-width: 560px) and ${motionOk}`);
    const padQuery = window.matchMedia(`(max-width: 760px) and (orientation: portrait) and ${motionOk}`);
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const smooth = (t) => t * t * (3 - 2 * t);   // ease in and out

    // Notepad: every side of paper is its own sheet (the inside of the cover is skipped).
    const sheets = [
      leaves[0].querySelector('.face--front'),
      ...leaves.slice(1).flatMap((leaf) => [...leaf.querySelectorAll('.face')]),
    ];

    section.style.setProperty('--leaves', leaves.length);
    section.style.setProperty('--sheets', sheets.length);

    /* ------------------------------------------------------------------
       1. Scroll → page turns
       The section is a few screens tall and the book is pinned (sticky).
       Each sheet gets an equal slice of scrolling: it rests for the first and last 15%
       so a page stays still for a moment, and turns in between.
       ------------------------------------------------------------------ */
    let ticking = false;
    let mode = null;   // 'book' | 'notepad' | 'stacked'

    const update = () => {
      ticking = false;
      if (mode === 'stacked') return;

      const rect = section.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      const items = mode === 'book' ? leaves : sheets;
      const progress = clamp(-rect.top / scrollable) * items.length;   // 0 … number of sheets

      items.forEach((item, i) => {
        const t = smooth(clamp((progress - i - 0.15) / 0.7));             // 0 = closed, 1 = turned
        item.style.setProperty('--shade', Math.sin(Math.PI * t).toFixed(3));
        if (mode === 'book') {
          item.style.setProperty('--angle', `${(-180 * t).toFixed(2)}deg`);
          // unturned sheets: the cover on top. Turned sheets: the last one turned on top.
          item.style.zIndex = t > 0.5 ? i + 1 : items.length * 2 - i;
        } else {
          // flips up over the spiral and disappears behind the book
          item.style.setProperty('--angle', `${(180 * t).toFixed(2)}deg`);
          item.style.zIndex = items.length - i;
        }
        if (i === 0) {
          if (mode === 'book') book.style.setProperty('--open', t.toFixed(3));
          section.classList.toggle('is-open', t > 0.01);
        }
      });
    };

    const requestUpdate = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };

    const reset = (el) => {
      el.style.removeProperty('--angle');
      el.style.removeProperty('--shade');
      el.style.zIndex = '';
    };

    const setMode = () => {
      const next = bookQuery.matches ? 'book' : padQuery.matches ? 'notepad' : 'stacked';
      if (next === mode) return;
      mode = next;
      section.classList.toggle('is-flipping', mode === 'book');
      section.classList.toggle('is-notepad', mode === 'notepad');
      section.classList.remove('is-open');
      book.style.removeProperty('--open');
      leaves.forEach(reset);
      sheets.forEach(reset);
      placeStickers();
      update();
    };

    // The tall notepad cover needs its own sticker layout: data-tall="x y width" (in %).
    const placeStickers = () => {
      section.querySelectorAll('.sticker').forEach((sticker) => {
        const css = sticker.style;
        if (!sticker.dataset.wide) {
          sticker.dataset.wide = ['--x', '--y', '--w'].map((v) => css.getPropertyValue(v).trim()).join(' ');
        }
        const pos = (mode === 'notepad' && sticker.dataset.tall) || sticker.dataset.wide;
        const [x, y, w] = pos.split(' ').map((v) => (v.endsWith('%') ? v : `${v}%`));
        css.setProperty('--x', x);
        css.setProperty('--y', y);
        css.setProperty('--w', w);
      });
    };

    bookQuery.addEventListener('change', setMode);
    padQuery.addEventListener('change', setMode);
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
