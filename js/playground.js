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
    // - spread (.is-flipping): click the purple tab to open the book, then drag a page
    //   sideways around the spiral to turn it. Wide screens and phones held sideways.
    // - notepad (.is-flipping.is-single): phones held upright. The book stands tall with
    //   the spiral on top; drag a page up and it flips over the top.
    // - stacked (no class): no JS.
    // Also everywhere: click/tap a page, or the arrow keys.
    const tab = section.querySelector('.cover__tab');
    const hintFlip = section.querySelector('.sketchbook__hint-flip');
    const singleQuery = window.matchMedia('(max-width: 760px) and (orientation: portrait)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
    const SPINE = 0.073;          // the spiral line, as a fraction of the book (--spine)
    const SWIPE = 30;             // px a finger has to travel for a swipe to turn the page

    section.classList.add('is-flipping');
    book.tabIndex = 0;

    // Spread: every sheet (.leaf) turns as a whole, front and back together.
    // Notepad: every side of paper is its own page flipping up (the inside of the cover is skipped).
    const spreadItems = leaves.map((el) => ({ el, cur: 0, target: 0 }));
    const padItems = [
      leaves[0].querySelector('.face--front'),
      ...leaves.slice(1).flatMap((leaf) => [...leaf.querySelectorAll('.face')]),
    ].map((el) => ({ el, cur: 0, target: 0 }));

    let single = singleQuery.matches;
    let items = single ? padItems : spreadItems;
    let drag = null;
    let raf = 0;

    /* ------------------------------------------------------------------
       1. Drawing: turn the numbers into CSS variables
       cur/target per page: 0 = not turned, 1 = turned.
       ------------------------------------------------------------------ */
    const render = () => {
      const n = items.length;
      items.forEach((it, i) => {
        const t = it.cur;
        const css = it.el.style;
        const held = drag && drag.item === it;
        css.setProperty('--bend', Math.sin(Math.PI * t).toFixed(3));
        if (single) {
          // flips up around the spiral on top; once past upright it's hidden behind the book
          css.setProperty('--flip', `${(180 * t).toFixed(2)}deg`);
          css.zIndex = held ? n * 3 : n - i;
        } else {
          css.setProperty('--angle', `${(-180 * t).toFixed(2)}deg`);
          // unturned sheets: the cover on top. Turned sheets: the last one turned on top.
          css.zIndex = held ? n * 3 : t > 0.5 ? i + 1 : n * 2 - i;
        }
      });
      const open = items[0].cur;
      book.style.setProperty('--open', single ? '0' : open.toFixed(3));
      section.classList.toggle('is-open', open > 0.01);
      // (only touched when it changes: the hint is read out by screen readers)
      const hint = open > 0.5 ? (single ? 'swipe up to turn the page' : 'drag a page to turn it') : 'click the purple tab to open · ';
      if (hintFlip && hintFlip.textContent !== hint) hintFlip.textContent = hint;
    };

    // Ease every page toward its target. While dragging, follow the hand quickly but
    // smoothly; once let go, glide to rest like paper settling.
    const tick = () => {
      let moving = false;
      items.forEach((it) => {
        const held = drag && drag.item === it;
        const goal = held ? drag.t : it.target;
        const diff = goal - it.cur;
        if (Math.abs(diff) > 0.0008) { it.cur += diff * (reduceMotion.matches ? 1 : held ? 0.35 : 0.12); moving = true; } else { it.cur = goal; }
      });
      render();
      raf = moving || (drag && drag.item) ? requestAnimationFrame(tick) : 0;
    };
    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    /* ------------------------------------------------------------------
       2. Turning: next / previous (tab, clicks, keys)
       ------------------------------------------------------------------ */
    const firstUnturned = () => items.find((x) => x.target < 0.5);
    const lastTurned = () => [...items].reverse().find((x) => x.target > 0.5);
    const next = () => { const it = firstUnturned(); if (it) { it.target = 1; wake(); } };
    const prev = () => { const it = lastTurned(); if (it) { it.target = 0; wake(); } };

    tab.addEventListener('click', (e) => { e.stopPropagation(); if (items[0].target < 0.5) next(); });
    tab.addEventListener('pointerdown', (e) => e.stopPropagation());   // a click on the tab is never a page drag

    book.addEventListener('keydown', (e) => {
      if (e.target !== book) return;   // stickers and the tab handle their own keys
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); prev(); }
    });

    /* ------------------------------------------------------------------
       3. Dragging a page
       You grab a point on the page; that point follows your pointer around the spiral.
       Seen from the front, a point at distance r from the spiral sits at r · cos(angle),
       so the angle is acos(position / r). Spread: sideways (x). Notepad: up and down (y).
       Let go after pulling it about a third of the way (or with a flick) and the page
       finishes turning; otherwise it falls back. A press without moving is a click.
       Touch screens skip the dragging: a short swipe turns the page.
       ------------------------------------------------------------------ */
    const spiral = () => {
      const b = book.getBoundingClientRect();
      return single
        ? { at: b.top + b.height * SPINE, size: b.height * (1 - SPINE), mid: b.top + b.height / 2 }
        : { at: b.left + b.width * SPINE, size: b.width * (1 - SPINE) };
    };
    const along = (e) => (single ? e.clientY : e.clientX);      // the direction pages move in
    const across = (e) => (single ? e.clientX : e.clientY);

    book.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || e.target.closest('.sticker, .cover__tab')) return;
      if (items[0].target < 0.5 && items[0].cur < 0.5) return;   // closed: only the tab opens it
      const sp = spiral();
      drag = { start: along(e), cross: across(e), spiral: sp, moved: false, item: null, id: e.pointerId, hist: [],
               swipe: e.pointerType === 'touch' };
    });

    const pick = (d) => {
      // Spread: the side of the spiral you pressed on. Notepad: the way you pull (up = next).
      const forward = single ? d < 0 : drag.start > drag.spiral.at;
      const it = forward ? firstUnturned() : lastTurned();
      if (!it) return null;
      // where the grabbed point is, measured from the spiral; a page you pull back
      // in the notepad is out of sight, so pretend you grabbed its far edge
      let r = single && !forward ? drag.spiral.size * 0.9 : Math.abs(drag.start - drag.spiral.at);
      r = Math.max(r, drag.spiral.size * 0.35);      // grabbing right by the spiral is still controllable
      drag.r = r;
      drag.p0 = Math.cos(Math.PI * it.cur) * r;      // the grabbed point's starting position
      drag.forward = forward;
      return it;
    };

    book.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const d = along(e) - drag.start;
      // Touch screens: a quick swipe is enough. As soon as the finger has travelled a little
      // way, the page turns by itself (up / left = next, down / right = back).
      if (drag.swipe) {
        if (Math.abs(d) < SWIPE) return;
        if (Math.abs(across(e) - drag.cross) > Math.abs(d)) { drag = null; return; }   // not a page turn
        drag = null;
        if (d < 0) next(); else prev();
        return;
      }
      if (!drag.moved) {
        if (Math.abs(d) < 6) return;
        if (Math.abs(across(e) - drag.cross) > Math.abs(d)) { drag = null; return; }   // not a page turn
        drag.moved = true;
        drag.item = pick(d);
        if (!drag.item) { drag = null; return; }
        book.setPointerCapture(e.pointerId);
        book.classList.add('is-dragging');
        wake();
      }
      drag.t = Math.acos(clamp((drag.p0 + d) / drag.r, -1, 1)) / Math.PI;
      drag.hist.push({ p: along(e), time: e.timeStamp });
      if (drag.hist.length > 6) drag.hist.shift();
    });

    const endDrag = (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      if (drag.swipe && Math.abs(along(e) - drag.start) > 6) { drag = null; return; }   // a short swipe: nothing
      if (!drag.moved) {
        // a click: spread = side of the spiral; notepad = top half back, bottom half next
        const back = single ? e.clientY < drag.spiral.mid : e.clientX < drag.spiral.at;
        drag = null;
        if (back) prev(); else next();
        return;
      }
      const it = drag.item;
      const h = drag.hist;
      const v = h.length > 1 ? (h[h.length - 1].p - h[0].p) / Math.max(1, h[h.length - 1].time - h[0].time) : 0;
      // a flick wins; otherwise a page that's been pulled about a third of the way goes over
      const committed = drag.forward ? drag.t > 0.35 : drag.t < 0.65;
      it.target = v < -0.35 ? 1 : v > 0.35 ? 0 : (committed === drag.forward ? 1 : 0);
      drag = null;
      book.classList.remove('is-dragging');
      wake();
    };
    book.addEventListener('pointerup', endDrag);
    book.addEventListener('pointercancel', endDrag);

    // Switching between spread and notepad (turning the phone): start again with the
    // book open at the same place, as far as the two layouts allow.
    const setLayout = () => {
      const wasOpen = items[0].target > 0.5;
      single = singleQuery.matches;
      section.classList.toggle('is-single', single);
      [...spreadItems, ...padItems].forEach((it) => {
        it.cur = 0; it.target = 0;
        ['--angle', '--flip', '--bend'].forEach((v) => it.el.style.removeProperty(v));
        it.el.style.zIndex = '';
      });
      items = single ? padItems : spreadItems;
      if (wasOpen) { items[0].target = 1; items[0].cur = 1; }
      placeStickers();
      render();
    };

    // The tall notepad cover needs its own sticker layout: data-tall="x y width" (in %).
    const placeStickers = () => {
      section.querySelectorAll('.sticker').forEach((sticker) => {
        const css = sticker.style;
        if (!sticker.dataset.wide) {
          sticker.dataset.wide = ['--x', '--y', '--w'].map((v) => css.getPropertyValue(v).trim()).join(' ');
        }
        const pos = (single && sticker.dataset.tall) || sticker.dataset.wide;
        const [x, y, w] = pos.split(' ').map((v) => (v.endsWith('%') ? v : `${v}%`));
        css.setProperty('--x', x);
        css.setProperty('--y', y);
        css.setProperty('--w', w);
      });
    };

    singleQuery.addEventListener('change', setLayout);
    setLayout();

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
