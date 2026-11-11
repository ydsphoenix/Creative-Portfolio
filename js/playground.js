// The Playground: a sketchbook you open by its purple tab and leaf through by dragging
// the pages around the spiral, with shark stickers on the cover that can be dragged
// around or clicked to hop. Without JS the pages just stay stacked (css/playground.css).

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const section = document.querySelector('.sketchbook');

  if (section) {
    const book = section.querySelector('.book');
    const leaves = [...section.querySelectorAll('.leaf')];
    // Layouts (see css/playground.css):
    // - "book" (.is-flipping): click the purple tab to open the book, then drag a page
    //   around the spiral to turn it. Also: click a page, or the arrow keys.
    // - single-page (.is-flipping.is-single): phones held upright, one page at a time.
    // - stacked (no class): no JS. Everything else in this block is the book.
    const tab = section.querySelector('.cover__tab');
    const hintFlip = section.querySelector('.sketchbook__hint-flip');
    const singleQuery = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const SPINE = 0.073;          // x of the spiral holes, as a fraction of the book width (--spine)

    section.classList.add('is-flipping');
    book.tabIndex = 0;

    // Each sheet: cur = where it is now, target = where it's going (0 = unturned, 1 = turned).
    const sheets = leaves.map((el) => ({ el, cur: 0, target: 0 }));
    const n = sheets.length;
    let single = singleQuery.matches;
    let drag = null;
    let raf = 0;
    // Single-page mode shows one side of the open spread at a time. 'right' = the page
    // lying on the right (front of the next sheet), 'left' = the back of the sheet you
    // just turned. The book slides (shift 0 → 1) to show the left one.
    let view = 'right';
    const shift = { cur: 0, target: 0 };

    /* ------------------------------------------------------------------
       1. Drawing: turn the numbers into CSS variables
       ------------------------------------------------------------------ */
    const render = () => {
      sheets.forEach((s, i) => {
        const t = s.cur;
        const css = s.el.style;
        css.setProperty('--angle', `${(-180 * t).toFixed(2)}deg`);
        css.setProperty('--bend', Math.sin(Math.PI * t).toFixed(3));
        // unturned sheets: the cover on top. Turned sheets: the last one turned on top.
        // The sheet in your hand is always on top.
        s.el.style.zIndex = drag && drag.sheet === s ? n * 3 : t > 0.5 ? i + 1 : n * 2 - i;
      });
      const open = sheets[0].cur;
      book.style.setProperty('--open', open.toFixed(3));
      book.style.setProperty('--shift', shift.cur.toFixed(3));
      section.classList.toggle('is-open', open > 0.01);
      // (only touched when it changes: the hint is read out by screen readers)
      const hint = open > 0.5 ? 'drag a page to turn it' : 'click the purple tab to open · ';
      if (hintFlip && hintFlip.textContent !== hint) hintFlip.textContent = hint;
    };

    // Ease every sheet toward its target. While dragging, follow the hand quickly but
    // smoothly; once let go, glide to rest like a page settling.
    const tick = () => {
      let moving = false;
      const step = (s, goal, ease) => {
        const diff = goal - s.cur;
        if (Math.abs(diff) > 0.0008) { s.cur += diff * (reduceMotion.matches ? 1 : ease); moving = true; } else { s.cur = goal; }
      };
      sheets.forEach((s) => {
        const held = drag && drag.sheet === s;
        step(s, held ? drag.t : s.target, held ? 0.35 : 0.12);
      });
      shift.target = single && view === 'left' ? 1 : 0;
      step(shift, shift.target, 0.1);
      render();
      raf = moving || drag ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    /* ------------------------------------------------------------------
       2. Turning: next / previous (tab, clicks, keys)
       ------------------------------------------------------------------ */
    const firstUnturned = () => sheets.find((x) => x.target < 0.5);
    const lastTurned = () => [...sheets].reverse().find((x) => x.target > 0.5);

    // after a sheet turns forward you look at its back (left), except the cover:
    // its back is just the inside of the cover, so you go straight to page 1
    const turned = (s) => { view = s === sheets[0] ? 'right' : 'left'; };

    const next = () => {
      if (single && view === 'left') { view = 'right'; wake(); return; }   // slide to the facing page
      const s = firstUnturned();
      if (s) { s.target = 1; if (single) turned(s); wake(); }
    };
    const prev = () => {
      const s = lastTurned();
      if (!s) return;
      if (single && view === 'right' && s !== sheets[0]) { view = 'left'; wake(); return; }   // slide back
      s.target = 0; view = 'right'; wake();
    };

    tab.addEventListener('click', (e) => { e.stopPropagation(); if (sheets[0].target < 0.5) next(); });
    tab.addEventListener('pointerdown', (e) => e.stopPropagation());   // a click on the tab is never a page drag

    book.addEventListener('keydown', (e) => {
      if (e.target !== book) return;   // stickers and the tab handle their own keys
      if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    });

    /* ------------------------------------------------------------------
       3. Dragging a page
       You grab a point on the page; that point follows your pointer around the spiral.
       Seen from the front, a point at distance r from the spiral sits at
       x = r · cos(angle), so the angle is acos(x / r).
       Let go after pulling it about a third of the way (or with a flick) and the page
       finishes turning; otherwise it falls back. A press without moving is a click: right half = next, left = back.
       ------------------------------------------------------------------ */
    const spineX = () => {
      const b = book.getBoundingClientRect();
      return { x: b.left + b.width * SPINE, w: b.width * (1 - SPINE) };
    };

    book.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.sticker, .cover__tab')) return;
      if (sheets[0].target < 0.5 && sheets[0].cur < 0.5) return;   // closed: only the tab opens it
      const { x, w } = spineX();
      drag = { startX: e.clientX, startY: e.clientY, spine: x, w, moved: false, sheet: null, id: e.pointerId, hist: [] };
    });

    const pickSheet = (dx) => {
      // which sheet did you grab? The side of the spiral you pressed on.
      const forward = drag.startX > drag.spine;
      // single page: pulling the "wrong" way just slides to the other page on release
      if (single && (forward ? dx > 0 : dx < 0)) { drag.slide = forward ? prev : next; return null; }
      const s = forward ? firstUnturned() : lastTurned();
      if (!s) return null;
      // where the grabbed point is, measured from the spiral
      let r = Math.abs(drag.startX - drag.spine);
      r = Math.max(r, drag.w * 0.35);                // grabbing right next to the spiral is still controllable
      drag.r = r;
      drag.p0 = Math.cos(Math.PI * s.cur) * r;       // the grabbed point's starting x
      drag.forward = forward;
      return s;
    };

    book.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dx = e.clientX - drag.startX;
      if (!drag.moved) {
        if (Math.abs(dx) < 6) return;
        if (Math.abs(e.clientY - drag.startY) > Math.abs(dx)) { drag = null; return; }   // that's a scroll
        drag.moved = true;
        drag.sheet = pickSheet(dx);
        if (!drag.sheet) { if (!drag.slide) drag = null; return; }
        book.setPointerCapture(e.pointerId);
        book.classList.add('is-dragging');
        wake();
      }
      if (!drag.sheet) return;
      drag.t = Math.acos(clamp((drag.p0 + dx) / drag.r, -1, 1)) / Math.PI;
      drag.hist.push({ x: e.clientX, time: e.timeStamp });
      if (drag.hist.length > 6) drag.hist.shift();
    });

    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.slide) { const go = drag.slide; drag = null; go(); return; }
      if (!drag.moved) {
        // a click: right half of the book = next page, left half = back
        const b = book.parentElement.getBoundingClientRect();
        const back = single ? e.clientX < b.left + b.width / 2 : e.clientX < drag.spine;
        drag = null;
        if (back) prev(); else next();
        return;
      }
      const s = drag.sheet;
      const h = drag.hist;
      const v = h.length > 1 ? (h[h.length - 1].x - h[0].x) / Math.max(1, h[h.length - 1].time - h[0].time) : 0;
      s.cur = clamp(s.cur);
      // a flick wins; otherwise a page that's been pulled about a third of the way goes over
      const committed = drag.forward ? drag.t > 0.35 : drag.t < 0.65;
      s.target = v < -0.35 ? 1 : v > 0.35 ? 0 : (committed === drag.forward ? 1 : 0);
      if (single) { if (s.target === 1) turned(s); else view = 'right'; }
      drag = null;
      book.classList.remove('is-dragging');
      wake();
    };
    book.addEventListener('pointerup', endDrag);
    book.addEventListener('pointercancel', endDrag);

    singleQuery.addEventListener('change', () => { single = singleQuery.matches; view = 'right'; section.classList.toggle('is-single', single); wake(); });
    section.classList.toggle('is-single', single);
    render();

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
