// Projects page: the shark's fin follows the mouse, the shark leans toward it,
// and a spotlight follows the cursor across the wall.
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
  const wall = document.querySelector('.wall');
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

    // Spotlight: position relative to the wall
    wall.addEventListener('pointermove', (event) => {
      const r = wall.getBoundingClientRect();
      wall.style.setProperty('--spot-x', `${event.clientX - r.left}px`);
      wall.style.setProperty('--spot-y', `${event.clientY - r.top}px`);
      wall.classList.add('is-lit');
    });
    wall.addEventListener('pointerleave', () => wall.classList.remove('is-lit'));

    // Smoothly ease toward the target every frame.
    const tick = () => {
      current += (target - current) * EASE;
      fin.style.setProperty('--fin-angle', `${current.toFixed(2)}deg`);
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
