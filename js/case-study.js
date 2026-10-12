// Case study: update the reading-progress bar (0 at the top, 1 at the bottom).

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const progress = document.querySelector('.progress');

  if (progress) {
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const value = max > 0 ? window.scrollY / max : 0;
      progress.style.setProperty('--progress', value.toFixed(4));
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }
}
