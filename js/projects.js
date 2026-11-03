// Projects page: the shark's fin follows the mouse and the shark leans toward it.
// The fin image is the same size as the body image, so the shoulder pivot can be
// given as a percentage of the image box (matches transform-origin in projects.css).

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const PIVOT = { x: 0.172, y: 0.434 };   // shoulder position, as a fraction of the image
  const REST_ANGLE = -119.5;              // direction the fin points in the drawing (degrees)
  const MIN = -70;                        // how far it may rotate either way
  const MAX = 15;                         // (more than this and the fin hides behind the body)
  const EASE = 0.15;                      // 0–1, lower = lazier follow

  const fin = document.querySelector('.visitor__fin');
  const visitor = document.querySelector('.visitor');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (fin && !reduceMotion) {
    let target = 0;
    let current = 0;

    window.addEventListener('pointermove', (event) => {
      const box = fin.getBoundingClientRect();
      // Note: the box is of the rotated element, but the shift is small enough to ignore.
      const px = box.left + box.width * PIVOT.x;
      const py = box.top + box.height * PIVOT.y;

      // Angle from the shoulder to the mouse, in degrees (0 = right, -90 = up)
      const angle = Math.atan2(event.clientY - py, event.clientX - px) * (180 / Math.PI);

      // Rotation needed to turn the fin from its drawn direction toward the mouse,
      // wrapped to -180…180 so it always takes the short way round.
      let delta = angle - REST_ANGLE;
      delta = ((delta + 540) % 360) - 180;

      target = Math.min(MAX, Math.max(MIN, delta));

      // Lean the whole shark a few degrees toward the mouse (left/right)
      const lean = ((event.clientX / window.innerWidth) - 0.5) * 8;
      visitor.style.setProperty('--lean', `${lean.toFixed(2)}deg`);
    });

    // Smoothly ease toward the target every frame.
    const tick = () => {
      current += (target - current) * EASE;
      fin.style.setProperty('--fin-angle', `${current.toFixed(2)}deg`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}

// Little shark stickers scattered around the museum wall.
// Each visit they land somewhere new: random spots are tried until a sticker
// fits without touching a frame, the sign, the big shark, the sketchbook or
// another sticker. Spots that don't fit are skipped, so it never covers your work.
{
  const wall = document.querySelector('.wall');

  if (wall) {
    const STICKERS = ['sleep', 'knife', 'kiss', 'hug'];
    const COUNT = 9;          // how many to try to place
    const GAP = 24;           // px of air around frames and other stickers (stickers are tilted, so a bit extra)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // a fingerprint of the wall's and the frames' sizes when the stickers were placed
    const watched = [wall, ...wall.querySelectorAll('.art__frame')];
    const wallSize = () => watched.map((el) => `${el.offsetWidth}x${el.offsetHeight}`).join();
    let placedAt = '';

    const scatter = () => {
      wall.querySelectorAll('.wall-sticker').forEach((s) => s.remove());
      placedAt = wallSize();
      const box = { width: wall.clientWidth, height: wall.clientHeight };
      const small = box.width < 700;

      // Position of an element inside the wall, from its layout box. (Not
      // getBoundingClientRect: that includes animations, and the frames are still
      // swinging into place when this runs.)
      // (The big shark is centred with translate, which offsets ignore, and it
      // doesn't animate in, so it and the sketchbook are measured on screen.)
      const wallRect = wall.getBoundingClientRect();
      const layoutBox = (el) => {
        if (el.matches('.visitor, .minibook')) {
          const r = el.getBoundingClientRect();
          return { x: r.left - wallRect.left - wall.clientLeft, y: r.top - wallRect.top - wall.clientTop, w: r.width, h: r.height };
        }
        let x = 0;
        let y = 0;
        for (let n = el; n && n !== wall; n = n.offsetParent) { x += n.offsetLeft; y += n.offsetTop; }
        return { x, y, w: el.offsetWidth, h: el.offsetHeight };
      };

      // everything a sticker must not overlap
      const taken = [...wall.querySelectorAll('.art a, .art__frame, .art__label, .wall__sign, .visitor, .minibook')].map((el) => {
        const b = layoutBox(el);
        const string = el.matches('.art a, .art__frame') ? 24 : 0;   // the hanging string above each frame
        return { x: b.x, y: b.y - string, w: b.w, h: b.h + string };
      });
      const hits = (a) => taken.some((b) =>
        a.x < b.x + b.w + GAP && a.x + a.w + GAP > b.x && a.y < b.y + b.h + GAP && a.y + a.h + GAP > b.y);

      for (let n = 0, placed = 0; n < 400 && placed < COUNT; n++) {
        const size = (small ? 34 : 46) + Math.random() * (small ? 16 : 26);
        const spot = {
          x: 8 + Math.random() * (box.width - size - 16),
          y: 8 + Math.random() * (box.height - size - 16),
          w: size,
          h: size,
        };
        if (hits(spot)) continue;
        taken.push(spot);

        const name = STICKERS[placed % STICKERS.length];
        const el = document.createElement('span');
        el.className = 'wall-sticker';
        el.setAttribute('aria-hidden', 'true');
        el.style.cssText = `left:${spot.x.toFixed(0)}px; top:${spot.y.toFixed(0)}px;
          --size:${size.toFixed(0)}px; --tilt:${(Math.random() * 40 - 20).toFixed(1)}deg;
          --delay:${reduceMotion ? 0 : 600 + placed * 90}ms;`;
        el.innerHTML = `<img src="assets/img/playground/sticker-${name}.webp" alt="" loading="lazy">`;
        wall.append(el);
        placed++;
      }
    };

    // Place them once the page has loaded, and again whenever the wall or a frame
    // changes size (late images or fonts, window resize), so they never end up on a frame.
    let timer;
    const rescatter = () => { clearTimeout(timer); timer = setTimeout(scatter, 150); };
    if (document.readyState === 'complete') scatter();
    else window.addEventListener('load', scatter, { once: true });
    if ('ResizeObserver' in window) {
      const watcher = new ResizeObserver(() => {
        if (placedAt && wallSize() !== placedAt) rescatter();
      });
      watched.forEach((el) => watcher.observe(el));
    }
  }
}
