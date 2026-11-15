const MAX_PAGE_CHARS = 16000;
const CONDENSED_CHARS = 6000;

function wholePageText() {
  const raw = document.body ? document.body.innerText : '';
  const text = raw
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.length > MAX_PAGE_CHARS
    ? text.slice(0, MAX_PAGE_CHARS) + '\n…[page truncated to fit the model context]'
    : text;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'get-page') {
    let condensed = '';
    try {
      condensed = condensePage(CONDENSED_CHARS).text;
    } catch {
      condensed = '';
    }

    sendResponse({
      page: wholePageText(),
      condensed,
      title: document.title,
      url: location.href,
    });
  }
  return false;
});
