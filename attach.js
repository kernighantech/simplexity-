(function () {
  const MAX_IMAGE_SIDE = 800;
  const $ = (id) => document.getElementById(id);

  const plusBtn = $('plus-btn');
  const plusMenu = $('plus-menu');
  const shotBtn = $('shot-btn');
  const list = $('attachments');

  let attachments = [];
  let nextId = 1;
  let busy = false;

  function render() {
    list.replaceChildren();

    for (const a of attachments) {
      const chip = document.createElement('span');
      chip.className = 'attach-chip';

      const label = document.createElement('span');
      label.textContent = `${a.label} · image`;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'attach-chip__remove';
      remove.setAttribute('aria-label', `Remove ${a.label}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        attachments = attachments.filter((x) => x !== a);
        render();
      });

      chip.append(label, remove);
      list.append(chip);
    }

    list.hidden = !attachments.length;
  }

  function toggleMenu(open) {
    plusMenu.hidden = !open;
    plusBtn.setAttribute('aria-expanded', String(open));
  }

  plusBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleMenu(plusMenu.hidden);
  });
  document.addEventListener('click', (e) => {
    if (!plusMenu.hidden && !plusMenu.contains(e.target)) toggleMenu(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') toggleMenu(false);
  });
  shotBtn.addEventListener('click', () => {
    toggleMenu(false);
    captureScreenshot();
  });

  function modelIsTextOnly() {
    const id = typeof selectedModel === 'string' ? selectedModel : '';
    const info = typeof modelDetails === 'object' && modelDetails ? modelDetails[id] : null;
    return !!(info && info.type && info.type !== 'vlm');
  }

  async function captureScreenshot() {
    if (busy) return;

    if (modelIsTextOnly()) {
      notify("This model can't see images. Pick a vision model to use screenshots.", 'warn');
      return;
    }

    busy = true;

    try {
      const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
      const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
      if (!tab || !/^https?:/.test(tab.url || '')) {
        notify('Screenshots only work on web pages.', 'warn');
        return;
      }

      const dataUrl = await chrome.tabs.captureVisibleTab(win.id, { format: 'png' });
      attachments.push({ id: nextId++, kind: 'image', label: 'Screenshot', dataUrl: await shrink(dataUrl) });
      render();
    } catch {
      notify("Can't capture this page.");
    } finally {
      busy = false;
    }
  }

  async function shrink(dataUrl) {
    const bitmap = await createImageBitmap(await (await fetch(dataUrl)).blob());
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.9);
  }

  window.Attachments = {
    consume() {
      const items = attachments;
      attachments = [];
      render();
      return items;
    },
  };

  render();
})();
