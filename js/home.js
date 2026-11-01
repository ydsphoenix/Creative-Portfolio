// Home page motion: the portrait drifts a little toward the mouse (parallax).
// (The wavy marquee with the words and program icons lives in js/marquee.js.)

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const portrait = document.querySelector('.hero__portrait-wrap');

  if (!reduceMotion && portrait && window.matchMedia('(pointer: fine)').matches) {
    const mouse = { x: 0, y: 0 }; // -1…1 from the centre of the screen
    window.addEventListener('pointermove', (e) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });

    const tick = () => {
      portrait.style.translate = `${(mouse.x * 10).toFixed(1)}px ${(mouse.y * 6).toFixed(1)}px`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
}
