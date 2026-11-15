const DEFAULTS = {
  host: '127.0.0.1',
  port: 1234,
  model: '',
  temperature: 0.7,
  maxTokens: 1024,
};

async function getSettings() {
  const stored = await chrome.storage.local.get('settings');
  return { ...DEFAULTS, ...(stored.settings || {}) };
}

function baseUrl(settings) {
  return `http://${settings.host}:${settings.port}/v1`;
}

function friendlyError(err, status) {
  if (status) {
    if (status === 404) return 'Endpoint not found. Check the port and that your LLM’s server is running.';
    if (status === 400) {
      return 'Your LLM rejected the request. Check that a model is loaded and that the page fits its context length (raise the context length when loading the model).';
    }
    if (status >= 500) return `Your LLM reported a server error (HTTP ${status}).`;
    return `Request failed with HTTP ${status}.`;
  }
  const msg = String(err && err.message ? err.message : err);
  if (/Failed to fetch|NetworkError|ECONNREFUSED/i.test(msg)) {
    return "Can't reach the server. Check the host and port in Settings.";
  }
  return msg;
}

async function checkConnection() {
  const settings = await getSettings();
  try {
    const res = await fetch(`${baseUrl(settings)}/models`, { method: 'GET' });
    if (!res.ok) return { ok: false, error: friendlyError(null, res.status) };
    const data = await res.json();
    const models = (data.data || []).map((m) => m.id);
    const details = await fetchModelDetails(settings);
    return { ok: true, models, details };
  } catch (err) {
    return { ok: false, error: friendlyError(err) };
  }
}

async function fetchModelDetails(settings) {
  try {
    const res = await fetch(`http://${settings.host}:${settings.port}/api/v0/models`);
    if (!res.ok) return {};
    const data = await res.json();
    const out = {};
    for (const m of data.data || data.models || []) {
      out[m.id] = {
        type: m.type || '',
        publisher: m.publisher || '',
        arch: m.arch || '',
        quant: m.quantization || '',
        state: m.state || '',
        context: m.loaded_context_length || m.max_context_length || 0,
        tools: Array.isArray(m.capabilities) && m.capabilities.includes('tool_use'),
      };
    }
    return out;
  } catch {
    return {};
  }
}

async function streamChat({ requestId, messages }) {
  const settings = await getSettings();
  const body = {
    model: settings.model || undefined,
    messages,
    temperature: Number(settings.temperature),
    max_tokens: Number(settings.maxTokens),
    stream: true,
  };

  let res;
  try {
    res = await fetch(`${baseUrl(settings)}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return broadcast('chat-error', { requestId, error: friendlyError(err) });
  }

  if (!res.ok) {
    return broadcast('chat-error', { requestId, error: friendlyError(null, res.status) });
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (payload === '[DONE]') {
          return broadcast('chat-done', { requestId });
        }
        try {
          const json = JSON.parse(payload);
          const delta = json.choices?.[0]?.delta?.content;
          if (delta) broadcast('chat-delta', { requestId, delta });
        } catch {

        }
      }
    }
    broadcast('chat-done', { requestId });
  } catch (err) {
    broadcast('chat-error', { requestId, error: friendlyError(err) });
  }
}

function broadcast(type, payload) {
  chrome.runtime.sendMessage({ type, ...payload }).catch(() => {});
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'get-settings':
      getSettings().then(sendResponse);
      return true;

    case 'save-settings':
      chrome.storage.local.set({ settings: message.settings }).then(() => sendResponse({ ok: true }));
      return true;

    case 'check-connection':
      checkConnection().then(sendResponse);
      return true;

    case 'chat':
      streamChat(message);
      sendResponse({ started: true });
      return false;

    default:
      return false;
  }
});
