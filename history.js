(function () {
  const KEY = 'chats';
  const MAX_CHATS = 100;
  const $ = (id) => document.getElementById(id);

  const openBtn = $('history-open');
  const overlay = $('history-overlay');
  const closeBtn = $('history-close');
  const newBtn = $('history-new');
  const list = $('history-list');
  const clearBtn = $('history-clear');

  let hooks = {
    onOpen() {},
    onNew() {},
    canSwitch: () => true,
    currentId: () => null,
  };

  let queue = Promise.resolve();
  const serial = (task) => (queue = queue.then(task, task));

  async function readAll() {
    const { [KEY]: chats } = await chrome.storage.local.get(KEY);
    return Array.isArray(chats) ? chats : [];
  }

  async function writeAll(chats) {
    chats.sort((a, b) => b.updatedAt - a.updatedAt);
    chats = chats.slice(0, MAX_CHATS);
    for (;;) {
      try {
        await chrome.storage.local.set({ [KEY]: chats });
        return;
      } catch (err) {
        if (chats.length <= 1) throw err;
        chats = chats.slice(0, Math.ceil(chats.length * 0.8));
      }
    }
  }

  function save(chat) {
    return serial(async () => {
      const chats = (await readAll()).filter((c) => c.id !== chat.id);
      chats.push(chat);
      await writeAll(chats);
    });
  }

  function remove(id) {
    return serial(async () => writeAll((await readAll()).filter((c) => c.id !== id)));
  }

  function clearAll() {
    return serial(() => chrome.storage.local.remove(KEY));
  }

  function whenLabel(time) {
    const d = new Date(time);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const clock = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (d.toDateString() === today.toDateString()) return `Today, ${clock}`;
    if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${clock}`;
    const sameYear = d.getFullYear() === today.getFullYear();
    return d.toLocaleDateString([], sameYear
      ? { month: 'short', day: 'numeric' }
      : { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function pageLabel(chat) {
    if (chat.pageTitle) return chat.pageTitle;
    try { return new URL(chat.pageUrl).hostname; } catch { return ''; }
  }

  function buildItem(chat) {
    const row = document.createElement('li');
    row.className = 'history-item';
    if (chat.id === hooks.currentId()) row.classList.add('is-current');

    const openChat = document.createElement('button');
    openChat.type = 'button';
    openChat.className = 'history-item__open';

    const title = document.createElement('span');
    title.className = 'history-item__title';
    title.textContent = chat.title || 'Untitled chat';

    const meta = document.createElement('span');
    meta.className = 'history-item__meta';
    const replies = chat.messages.filter((m) => m.role === 'assistant').length;
    meta.textContent = [whenLabel(chat.updatedAt), pageLabel(chat), `${replies} ${replies === 1 ? 'reply' : 'replies'}`]
      .filter(Boolean)
      .join(' · ');

    openChat.append(title, meta);
    openChat.addEventListener('click', () => {
      if (!hooks.canSwitch()) {
        notify('Wait for the answer to finish, then open the chat.', 'warn');
        return;
      }
      hooks.onOpen(chat);
      close();
    });

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'history-item__delete';
    del.setAttribute('aria-label', `Delete "${chat.title || 'Untitled chat'}"`);
    del.title = 'Delete chat';
    del.textContent = '×';
    del.addEventListener('click', async () => {
      if (chat.id === hooks.currentId() && !hooks.canSwitch()) {
        notify('Wait for the answer to finish, then delete the chat.', 'warn');
        return;
      }
      try {
        await remove(chat.id);
      } catch {
        notify("Couldn't delete the chat.");
        return;
      }
      if (chat.id === hooks.currentId()) hooks.onNew();
      render();
    });

    row.append(openChat, del);
    return row;
  }

  async function render() {
    let chats = [];
    try {
      chats = await readAll();
    } catch {
      notify("Couldn't load your chat history.");
    }
    list.replaceChildren(...chats.map(buildItem));
    if (!chats.length) {
      const empty = document.createElement('li');
      empty.className = 'history-empty';
      empty.textContent = 'Ask your LLM anything about pages you see!';
      list.append(empty);
    }
    clearBtn.parentElement.hidden = !chats.length;
    resetClear();
  }

  let clearTimer = 0;
  function resetClear() {
    clearTimeout(clearTimer);
    clearBtn.classList.remove('is-confirming');
    clearBtn.textContent = 'Clear all history';
  }
  clearBtn.addEventListener('click', async () => {
    if (!clearBtn.classList.contains('is-confirming')) {
      clearBtn.classList.add('is-confirming');
      clearBtn.textContent = 'Click again to delete all chats';
      clearTimer = setTimeout(resetClear, 3000);
      return;
    }
    if (hooks.currentId() && !hooks.canSwitch()) {
      notify('Wait for the answer to finish, then clear the history.', 'warn');
      resetClear();
      return;
    }
    try {
      await clearAll();
    } catch {
      notify("Couldn't clear the history.");
      return;
    }
    if (hooks.currentId()) hooks.onNew();
    render();
  });

  function open() {
    overlay.hidden = false;
    overlay.classList.remove('is-closing');
    openBtn.setAttribute('aria-expanded', 'true');
    render();
    closeBtn.focus();
  }

  function close() {
    if (overlay.hidden || overlay.classList.contains('is-closing')) return;
    overlay.classList.add('is-closing');
    openBtn.setAttribute('aria-expanded', 'false');
  }
  overlay.addEventListener('animationend', (e) => {
    if (e.target === overlay && overlay.classList.contains('is-closing')) {
      overlay.hidden = true;
      overlay.classList.remove('is-closing');
    }
  });

  openBtn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !overlay.hidden) close();
  });
  newBtn.addEventListener('click', () => {
    if (!hooks.canSwitch()) {
      notify('Wait for the answer to finish, then start a new chat.', 'warn');
      return;
    }
    hooks.onNew();
    close();
  });

  window.Chats = {
    init(h) {
      hooks = { ...hooks, ...h };
    },
    save,
  };
})();
