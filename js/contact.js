// Contact page: "Copy" button next to the email address, with a toast message.

// Wrapped in { } so this file's variables don't clash with the other scripts.
{
  const copyBtn = document.querySelector('.copy-btn');
  const toast = document.querySelector('.toast');

  // Only show the button if the browser supports copying (needs https or localhost).
  if (copyBtn && navigator.clipboard && window.isSecureContext) {
    copyBtn.hidden = false;
    let timer;

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.copy);
        toast.textContent = 'Email copied! Talk soon 🦈';
      } catch {
        toast.textContent = 'Couldn’t copy, but the email link still works!';
      }
      toast.classList.add('is-shown');
      clearTimeout(timer);
      timer = setTimeout(() => toast.classList.remove('is-shown'), 2500);
    });
  }
}
