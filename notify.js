(function () {
  const DURATION = 5000;
  const MAX_VISIBLE = 3;
  const stack = document.getElementById('toasts');

  const ICONS = {
    error: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.5h.01"/>',
    warn: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5"/><path d="M12 17.5h.01"/>',
  };

  function dismiss(toast) {
    if (toast.classList.contains('is-leaving')) return;
    clearTimeout(toast._timer);
    toast.classList.add('is-leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }

  function startTimer(toast) {
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => dismiss(toast), DURATION);
  }

  window.notify = function notify(message, type = 'error') {
    if (!message) return;
    if (!ICONS[type]) type = 'error';

    const existing = [...stack.children].find(
      (t) => t._message === message && !t.classList.contains('is-leaving'),
    );
    if (existing) {
      startTimer(existing);
      existing.classList.remove('is-bump');
      void existing.offsetWidth;
      existing.classList.add('is-bump');
      return;
    }

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast._message = message;

    toast.innerHTML = `
      <svg class="toast__icon" viewBox="0 0 24 24" width="16" height="16" fill="none"
           stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
           aria-hidden="true">${ICONS[type]}</svg>
      <p class="toast__text"></p>
      <button class="toast__close" type="button" aria-label="Dismiss">×</button>`;
    toast.querySelector('.toast__text').textContent = message;
    toast.querySelector('.toast__close').addEventListener('click', () => dismiss(toast));
    toast.addEventListener('mouseenter', () => clearTimeout(toast._timer));
    toast.addEventListener('mouseleave', () => startTimer(toast));

    stack.prepend(toast);
    startTimer(toast);

    const visible = [...stack.children].filter((t) => !t.classList.contains('is-leaving'));
    visible.slice(MAX_VISIBLE).forEach(dismiss);
  };
})();
