const $ = (id) => document.getElementById(id);

const els = {
  settingsOpen: $('settings-open'),
  settingsOverlay: $('settings-overlay'),
  settingsClose: $('settings-close'),
  settingsMsg: $('settings-msg'),
  host: $('host'),
  port: $('port'),
  temperature: $('temperature'),
  tempOut: $('temp-out'),
  maxTokens: $('max-tokens'),
  testBtn: $('test-btn'),
  doneBtn: $('done-btn'),

  model: $('model'),
  modelLabel: $('model-label'),
  modelMenu: $('model-menu'),
  modelIcon: $('model-icon'),
  modelSize: $('model-size'),
  status: $('status'),
  statusText: $('status-text'),
  refreshBtn: $('refresh-btn'),

  hero: $('hero'),
  heroEmoji: $('hero-emoji'),
  greeting: $('greeting'),
  chipsRow: $('chips'),
  chips: document.querySelectorAll('.chip'),

  messages: $('messages'),
  form: $('prompt-form'),
  prompt: $('prompt'),
  sendBtn: $('send-btn'),
};

const EMOJIS = ['assets/mascot.png'];

function dayPart() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 18) return 'Afternoon';
  return 'Evening';
}

const GREETINGS = [
  () => `Good ${dayPart().toLowerCase()}!`,
  () => 'Welcome human!',
  () => "Let's search it up!",
  () => 'What are we exploring today?',
];

const pick = (list) => list[Math.floor(Math.random() * list.length)];

let history = [];
let activeRequest = null;
let streamEl = null;
let streamBuffer = '';
let chatId = null;
let chatInfo = null;

const STATUS_TEXT = {
  connected: 'Connected',
  connecting: 'Connecting…',
  disconnected: 'Not connected',
};

const PLACEHOLDER = 'Choose your model...';
let connState = 'disconnected';
let currentModels = [];
let modelDetails = {};
let selectedModel = '';

function setStatus(state) {
  connState = state;
  els.status.className = `conn conn--${state === 'connected' ? 'connected' : 'disconnected'}`;
  els.statusText.textContent = STATUS_TEXT[state];
  renderModelBar();
}

const PROVIDERS = [
  [/mistral|ministral|mixtral|magistral/i, 'mistral', 'Mistral AI'],
  [/phi-?\d|microsoft|\bphi\b/i, 'phi', 'Microsoft'],
  [/gemma|gemini|google/i, 'gemma', 'Google'],
  [/openai|gpt-?oss|\bgpt\b/i, 'openai', 'OpenAI'],
  [/llama|meta/i, 'meta', 'Meta'],
  [/deepseek/i, 'deepseek', 'DeepSeek'],
  [/moonshot|kimi/i, 'moonshot', 'Moonshot AI'],
  [/granite|\bibm\b/i, 'ibm', 'IBM'],
  [/huggingface|smollm/i, 'huggingface', 'Hugging Face'],
  [/muse/i, 'muse', 'Muse'],
  [/nvidia|nemotron/i, 'nvidia', 'NVIDIA'],
  [/qwen/i, 'qwen', 'Qwen'],
];

function providerInfo(id) {
  const hit = PROVIDERS.find(([re]) => re.test(id));
  if (hit) return { icon: hit[1] ? `assets/llm/${hit[1]}.png` : '', name: hit[2] };
  const pub = (modelDetails[id] && modelDetails[id].publisher) || (id.includes('/') ? id.split('/')[0] : '');
  return { icon: '', name: pub };
}

function providerIcon(id) {
  return providerInfo(id).icon;
}

function renderModelBar() {
  const connected = connState === 'connected';
  els.prompt.placeholder = connected && selectedModel
    ? `Ask "${prettyModelName(selectedModel)}"`
    : 'Choose a model to start';
  closeModelMenu(false);

  if (!connected || !selectedModel) {
    const label = connected && !currentModels.length ? 'No model loaded' : PLACEHOLDER;
    els.modelLabel.textContent = label;
    els.model.disabled = true;
    els.modelIcon.hidden = true;
    els.modelSize.hidden = true;
    return;
  }

  els.modelLabel.textContent = prettyModelName(selectedModel);
  els.model.disabled = false;
  updateModelBadge();
}

async function refreshConnection() {
  setStatus('connecting');
  const result = await chrome.runtime.sendMessage({ type: 'check-connection' });
  if (result.ok) {
    setStatus('connected');
    modelDetails = result.details || {};
    populateModels(result.models, savedModel);
  } else {
    setStatus('disconnected');
    notify(result.error);
  }
  return result.ok;
}

function prettyModelName(id) {
  const base = id.split('/').pop().replace(/[-_]?\d+(\.\d+)?b\b/i, '');
  return base.charAt(0).toUpperCase() + base.slice(1);
}

function modelSizeBadge(id) {
  const m = id.match(/(\d+(?:\.\d+)?)b\b/i);
  return m ? `${m[1]}B` : '';
}

function populateModels(models, selected = savedModel) {
  currentModels = models;
  const chatModels = models.filter((id) => !isEmbedding(id));
  selectedModel = models.includes(selected) && !isEmbedding(selected)
    ? selected
    : (chatModels[0] || models[0] || '');
  renderModelBar();
}

function updateModelBadge() {
  const id = selectedModel || '';
  const size = modelSizeBadge(id);
  els.modelSize.textContent = size;
  els.modelSize.hidden = !size;

  const icon = providerIcon(id);
  els.modelIcon.hidden = !icon;
  if (icon) {
    els.modelIcon.src = icon;
    els.modelIcon.alt = '';
  }
}

const isEmbedding = (id) => ((modelDetails[id] && modelDetails[id].type) || '') === 'embeddings' || /embed/i.test(id);

function modelQuant(id) {
  const d = modelDetails[id];
  if (d && d.quant) return d.quant;
  const m = id.match(/\b(q\d(?:_[a-z0-9]+)*|fp16|bf16|f16|\d-?bit)\b/i);
  return m ? m[1].toUpperCase() : '';
}

function formatContext(n) {
  if (!n) return '';
  if (n >= 1048576) return `${+(n / 1048576).toFixed(1)}M`;
  return `${Math.round(n / 1024)}K`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
function svgIcon(paths, size = 11, stroke = 2) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', stroke);
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }
  return svg;
}

const ICON_CHECK = ['M5 12.5l4.5 4.5L19 7.5'];
const ICON_EYE = ['M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z', 'M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z'];
const ICON_HAMMER = ['m15 12-8.4 8.4a2.1 2.1 0 0 1-3-3L12 9', 'M17.6 15 22 10.6', 'M20.9 11.7l-1.2-1.2c-.4-.4-.6-.9-.6-1.4V7.9l-2.6-2.6a6 6 0 0 0-4.2-1.7H9l.9.8a6 6 0 0 1 1.8 4.3V10l2 2h1.5c.5 0 1 .2 1.4.6l1.2 1.2'];

function makeCap(kind, icon, label) {
  const span = document.createElement('span');
  span.className = `cap cap--${kind}`;
  span.title = label;
  span.setAttribute('aria-label', label);
  span.appendChild(svgIcon(icon, 11, 2));
  return span;
}

function makeTag(text, cls = '', icon = null) {
  const span = document.createElement('span');
  span.className = `tag ${cls}`.trim();
  if (icon) span.appendChild(svgIcon(icon));
  span.appendChild(document.createTextNode(text));
  return span;
}

function buildModelOption(id) {
  const info = providerInfo(id);
  const d = modelDetails[id] || {};
  const embed = isEmbedding(id);

  const opt = document.createElement('div');
  opt.className = 'model-opt';
  opt.setAttribute('role', 'option');
  opt.setAttribute('tabindex', '-1');
  opt.dataset.id = id;
  opt.setAttribute('aria-selected', String(id === selectedModel));
  if (embed) opt.setAttribute('aria-disabled', 'true');

  const logo = document.createElement('div');
  logo.className = 'model-opt__logo';
  if (info.icon) {
    const img = document.createElement('img');
    img.src = info.icon;
    img.alt = '';
    logo.appendChild(img);
  } else {
    logo.classList.add('model-opt__logo--letter');
    logo.textContent = (prettyModelName(id).charAt(0) || '?').toUpperCase();
  }
  if (d.state === 'loaded') {
    const dot = document.createElement('span');
    dot.className = 'model-opt__dot';
    logo.appendChild(dot);
  }

  const body = document.createElement('div');
  body.className = 'model-opt__body';

  const top = document.createElement('div');
  top.className = 'model-opt__top';
  const name = document.createElement('span');
  name.className = 'model-opt__name';
  name.textContent = prettyModelName(id);
  top.appendChild(name);
  if (info.name) {
    const vendor = document.createElement('span');
    vendor.className = 'model-opt__vendor';
    vendor.textContent = info.name;
    top.appendChild(vendor);
  }
  const caps = document.createElement('span');
  caps.className = 'model-opt__caps';
  if (d.type === 'vlm') caps.appendChild(makeCap('vision', ICON_EYE, 'Vision'));
  if (d.tools) caps.appendChild(makeCap('tools', ICON_HAMMER, 'Tool use'));
  if (caps.childElementCount) top.appendChild(caps);

  const fullId = document.createElement('div');
  fullId.className = 'model-opt__id';
  fullId.textContent = id;
  fullId.title = id;

  const tags = document.createElement('div');
  tags.className = 'model-opt__tags';
  const size = modelSizeBadge(id);
  if (size) tags.appendChild(makeTag(size));
  const quant = modelQuant(id);
  if (quant) tags.appendChild(makeTag(quant));
  const ctx = formatContext(d.context);
  if (ctx) tags.appendChild(makeTag(`${ctx} ctx`));
  if (embed) tags.appendChild(makeTag('Embedding'));
  if (d.state === 'loaded') tags.appendChild(makeTag('Loaded', 'tag--live'));

  body.append(top, fullId);
  if (tags.childElementCount) body.appendChild(tags);

  const check = document.createElement('span');
  check.className = 'model-opt__check';
  check.appendChild(svgIcon(ICON_CHECK, 11, 3.2));

  opt.append(logo, body, check);
  return opt;
}

function buildModelMenu() {
  els.modelMenu.textContent = '';

  const head = document.createElement('div');
  head.className = 'model-menu__head';
  const title = document.createElement('span');
  title.textContent = 'Models';
  const count = document.createElement('span');
  count.className = 'model-menu__count';
  count.textContent = String(currentModels.length);
  head.append(title, count);

  const list = document.createElement('div');
  list.className = 'model-menu__list';
  for (const id of currentModels) list.appendChild(buildModelOption(id));

  els.modelMenu.append(head, list);
}

const modelOptions = () => [...els.modelMenu.querySelectorAll('.model-opt:not([aria-disabled="true"])')];
const modelMenuOpen = () => !els.modelMenu.hidden && !els.modelMenu.classList.contains('is-closing');

function openModelMenu() {
  if (els.model.disabled || modelMenuOpen()) return;
  buildModelMenu();
  els.modelMenu.classList.remove('is-closing');
  els.modelMenu.hidden = false;
  els.model.setAttribute('aria-expanded', 'true');
  const current = els.modelMenu.querySelector('.model-opt[aria-selected="true"]') || modelOptions()[0];
  if (current) {
    current.focus({ preventScroll: true });
    current.scrollIntoView({ block: 'nearest' });
  }
}

function closeModelMenu(returnFocus = true) {
  els.model.setAttribute('aria-expanded', 'false');
  if (els.modelMenu.hidden) return;
  if (!returnFocus) {
    els.modelMenu.hidden = true;
    els.modelMenu.classList.remove('is-closing');
    return;
  }
  els.modelMenu.classList.add('is-closing');
  els.modelMenu.addEventListener('animationend', () => {
    if (els.modelMenu.classList.contains('is-closing')) {
      els.modelMenu.hidden = true;
      els.modelMenu.classList.remove('is-closing');
    }
  }, { once: true });
  els.model.focus();
}

async function chooseModel(id) {
  if (!id || isEmbedding(id)) return;
  const changed = id !== selectedModel;
  selectedModel = id;
  savedModel = id;
  els.modelLabel.textContent = prettyModelName(id);
  els.prompt.placeholder = `Ask "${prettyModelName(id)}"`;
  updateModelBadge();
  closeModelMenu();
  if (!changed) return;
  const s = await chrome.runtime.sendMessage({ type: 'get-settings' });
  await chrome.runtime.sendMessage({ type: 'save-settings', settings: { ...s, model: id } });
}

els.model.addEventListener('click', () => {
  if (modelMenuOpen()) closeModelMenu();
  else openModelMenu();
});

els.model.addEventListener('keydown', (e) => {
  if (['ArrowDown', 'ArrowUp'].includes(e.key)) {
    e.preventDefault();
    openModelMenu();
  }
});

els.modelMenu.addEventListener('click', (e) => {
  const opt = e.target.closest('.model-opt');
  if (opt) chooseModel(opt.dataset.id);
});

els.modelMenu.addEventListener('keydown', (e) => {
  const opts = modelOptions();
  const i = opts.indexOf(document.activeElement);
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    opts[(i + 1) % opts.length]?.focus();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    opts[(i - 1 + opts.length) % opts.length]?.focus();
  } else if (e.key === 'Home') {
    e.preventDefault();
    opts[0]?.focus();
  } else if (e.key === 'End') {
    e.preventDefault();
    opts[opts.length - 1]?.focus();
  } else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    if (i >= 0) chooseModel(opts[i].dataset.id);
  } else if (e.key === 'Escape') {
    e.preventDefault();
    e.stopPropagation();
    closeModelMenu();
  } else if (e.key === 'Tab') {
    closeModelMenu(false);
  }
});

document.addEventListener('mousedown', (e) => {
  if (modelMenuOpen() && !e.target.closest('.model-picker')) closeModelMenu(false);
});

function showSettingsMsg(text, kind = '') {
  els.settingsMsg.textContent = text;
  els.settingsMsg.className = `settings-msg ${kind ? 'settings-msg--' + kind : ''}`;
}

function openSettings() {
  els.settingsOverlay.hidden = false;
  els.settingsOverlay.classList.remove('is-closing');
  els.host.focus();
}

function requestCloseSettings() {
  if (els.settingsOverlay.hidden || els.settingsOverlay.classList.contains('is-closing')) return;
  els.settingsOverlay.classList.add('is-closing');
}

els.settingsOverlay.addEventListener('animationend', (event) => {
  if (event.target === event.currentTarget && els.settingsOverlay.classList.contains('is-closing')) {
    els.settingsOverlay.hidden = true;
    els.settingsOverlay.classList.remove('is-closing');
  }
});

els.settingsOpen.addEventListener('click', openSettings);
els.settingsClose.addEventListener('click', requestCloseSettings);
els.settingsOverlay.addEventListener('click', (e) => {
  if (e.target === els.settingsOverlay) requestCloseSettings();
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !els.settingsOverlay.hidden) requestCloseSettings();
});

els.temperature.addEventListener('input', () => {
  els.tempOut.textContent = Number(els.temperature.value).toFixed(2);
});

let savedModel = '';

async function loadSettings() {
  const s = await chrome.runtime.sendMessage({ type: 'get-settings' });
  savedModel = s.model || '';
  els.host.value = s.host;
  els.port.value = s.port;
  els.temperature.value = s.temperature;
  els.tempOut.textContent = Number(s.temperature).toFixed(2);
  els.maxTokens.value = s.maxTokens;
}

async function readSettingsForm() {
  const current = await chrome.runtime.sendMessage({ type: 'get-settings' });
  return {
    ...current,
    host: els.host.value.trim() || '127.0.0.1',
    port: Number(els.port.value) || 1234,
    temperature: Number(els.temperature.value),
    maxTokens: Number(els.maxTokens.value) || 1024,
  };
}

async function saveFromForm() {
  await chrome.runtime.sendMessage({ type: 'save-settings', settings: await readSettingsForm() });
}

els.testBtn.addEventListener('click', async () => {
  await saveFromForm();
  showSettingsMsg('Testing…');
  const ok = await refreshConnection();
  showSettingsMsg(ok ? 'Connected' : '', ok ? 'ok' : '');
});

els.doneBtn.addEventListener('click', async () => {
  await saveFromForm();
  requestCloseSettings();
  refreshConnection();
});

els.refreshBtn.addEventListener('click', async () => {
  if (els.refreshBtn.disabled) return;
  els.refreshBtn.disabled = true;
  els.refreshBtn.classList.add('is-spinning');
  await Promise.all([refreshConnection(), new Promise((r) => setTimeout(r, 500))]);
  els.refreshBtn.classList.remove('is-spinning');
  els.refreshBtn.disabled = false;
});

function setupHero() {
  els.heroEmoji.src = pick(EMOJIS);
  els.greeting.textContent = pick(GREETINGS)();
}

async function activeWebTab() {
  const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] });
  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  return tab;
}

async function readActiveTab() {
  try {
    const tab = await activeWebTab();
    const res = await chrome.tabs.sendMessage(tab.id, { type: 'get-page' });
    return res || null;
  } catch {
    return null;
  }
}

const CONDENSE_THRESHOLD = 6000;

async function capturePage() {
  const res = await readActiveTab();
  if (!res || !res.page) return null;
  const useCondensed = res.page.length > CONDENSE_THRESHOLD && !!res.condensed;
  return {
    text: useCondensed ? res.condensed : res.page,
    condensed: useCondensed,
    title: res.title || '',
    url: res.url || '',
  };
}

function buildUserMessage(userText, page) {
  if (!page) return userText;
  const title = page.title ? ` "${page.title}"` : '';
  const url = page.url ? `\nURL: ${page.url}` : '';
  const label = page.condensed
    ? 'Key content (automatically condensed to its most important sentences, not the full page)'
    : 'Full page text';
  return `${userText}\n\n---\nWeb page${title}${url}\n${label}:\n"""\n${page.text}\n"""`;
}

function buildUserContent(userText, page, attached = []) {
  const text = buildUserMessage(userText, page);
  const images = attached.filter((x) => x.kind === 'image');
  if (!images.length) return text;
  return [
    { type: 'text', text },
    ...images.map((a) => ({ type: 'image_url', image_url: { url: a.dataUrl } })),
  ];
}

function setActiveChip(chip) {
  els.chips.forEach((c) => c.classList.toggle('is-active', c === chip));
}

function updateSendState() {
  const ready = els.prompt.value.trim().length > 0 && !activeRequest;
  els.sendBtn.disabled = !ready;
  els.sendBtn.classList.toggle('is-ready', ready);
}

els.chips.forEach((chip) => {
  chip.addEventListener('click', () => {
    els.prompt.value = chip.dataset.prompt;
    setActiveChip(chip);
    updateSendState();
    els.prompt.focus();
    els.prompt.setSelectionRange(els.prompt.value.length, els.prompt.value.length);
  });
});

els.prompt.addEventListener('input', () => {
  const matching = [...els.chips].find((c) => c.dataset.prompt === els.prompt.value);
  setActiveChip(matching || null);
  updateSendState();
});

els.prompt.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    els.form.requestSubmit();
  }
});

els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = els.prompt.value.trim();
  if (!text || activeRequest) return;
  els.prompt.value = '';
  setActiveChip(null);
  updateSendState();
  sendPrompt(text);
});

function showConversation(active) {
  els.hero.hidden = active;
  els.chipsRow.hidden = active;
  els.messages.hidden = !active;
}

function addBubble(role, text = '', screenshot = false) {
  const div = document.createElement('div');
  div.className = `bubble bubble--${role}`;
  if (screenshot) div.classList.add('has-shot');
  div.textContent = text;
  els.messages.appendChild(div);
  els.messages.scrollTop = els.messages.scrollHeight;
  return div;
}

async function sendPrompt(userText) {
  activeRequest = crypto.randomUUID();
  updateSendState();

  const attached = window.Attachments ? window.Attachments.consume() : [];

  const page = await capturePage();

  const screenshot = attached.some((a) => a.kind === 'image');
  if (!chatId) {
    chatId = crypto.randomUUID();
    chatInfo = { createdAt: Date.now(), pageTitle: page?.title || '', pageUrl: page?.url || '' };
  }

  history.push(screenshot ? { role: 'user', content: userText, screenshot } : { role: 'user', content: userText });
  showConversation(true);
  addBubble('user', userText, screenshot);

  streamBuffer = '';
  streamEl = addBubble('assistant');
  streamEl.classList.add('is-streaming');
  updateSendState();

  const past = history.slice(0, -1).map(({ role, content }) => ({ role, content }));
  const messages = [
    {
      role: 'system',
      content: 'You are a concise, helpful assistant. A web page may be attached to the user message for reference. Use it only when the user asks about the page, its content, or something it could answer. For greetings, small talk, or general questions, reply normally and do not mention or summarize the page. When you do use the page, say when something is not on it. If the page is marked as condensed key content, treat it as the most important parts of the page, not all of it, and do not claim to have read text that is not there.',
    },
    ...past,
    { role: 'user', content: buildUserContent(userText, page, attached) },
  ];

  await chrome.runtime.sendMessage({ type: 'chat', requestId: activeRequest, messages });
}

function finishRequest() {
  if (streamEl) streamEl.classList.remove('is-streaming');
  activeRequest = null;
  streamEl = null;
  updateSendState();
  els.prompt.focus();
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.requestId !== activeRequest) return;

  if (msg.type === 'chat-delta') {
    streamBuffer += msg.delta;
    streamEl.textContent = streamBuffer;
    els.messages.scrollTop = els.messages.scrollHeight;
  } else if (msg.type === 'chat-done') {
    history.push({ role: 'assistant', content: streamBuffer });
    finishRequest();
    saveChat();
  } else if (msg.type === 'chat-error') {
    const failed = history.pop();
    streamEl.previousElementSibling?.remove();
    streamEl.remove();
    if (!els.messages.children.length) showConversation(false);
    if (!history.length) chatId = null;
    if (!els.prompt.value.trim() && failed) els.prompt.value = failed.content;
    notify(msg.error);
    setStatus('disconnected');
    finishRequest();
  }
});

function saveChat() {
  if (!chatId || !history.length) return;
  const first = history.find((m) => m.role === 'user');
  Chats.save({
    id: chatId,
    title: first ? first.content.replace(/\s+/g, ' ').slice(0, 80) : '',
    model: selectedModel,
    ...chatInfo,
    updatedAt: Date.now(),
    messages: history,
  }).catch(() => notify("Couldn't save this chat to History."));
}

function openChat(chat) {
  history = chat.messages.map((m) => ({ ...m }));
  chatId = chat.id;
  chatInfo = { createdAt: chat.createdAt, pageTitle: chat.pageTitle || '', pageUrl: chat.pageUrl || '' };
  els.messages.replaceChildren();
  for (const m of history) addBubble(m.role, m.content, !!m.screenshot);
  showConversation(true);
  els.messages.scrollTop = els.messages.scrollHeight;
  els.prompt.focus();
}

function newChat() {
  history = [];
  chatId = null;
  chatInfo = null;
  els.messages.replaceChildren();
  showConversation(false);
  setupHero();
  els.prompt.focus();
}

Chats.init({
  onOpen: openChat,
  onNew: newChat,
  canSwitch: () => !activeRequest,
  currentId: () => chatId,
});

(async function init() {
  await loadSettings();
  setupHero();
  refreshConnection();
  updateSendState();
})();
