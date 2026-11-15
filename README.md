<div align="center">

<img src="assets/logo.png" alt="Simplexity logo" width="96" />

# Simplexity

**Chat with your own local AI about any web page, right from your browser.**

Summarize, explain or translate the page you're on, ask follow-up questions, and attach screenshots.
Everything goes to the model running on *your* computer, not to the cloud.

![Version](https://img.shields.io/badge/version-2.3.0-FFCC00?style=flat-square)
![Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)
![Private by design](https://img.shields.io/badge/privacy-100%25%20local-36C66A?style=flat-square)

</div>

---

<p align="center">
  <img src="docs/screenshots/home.png" alt="Simplexity home screen" width="240" />
  &nbsp;
  <img src="docs/screenshots/chat.png" alt="Asking about a page" width="240" />
  &nbsp;
  <img src="docs/screenshots/history.png" alt="Chat history" width="240" />
</p>

## ✨ Features

- **Ask about any page.** The text of the page you're viewing is sent along with your question automatically, so you can just ask.
- **One-click prompts.** Summarize, Explain and Translate buttons for the most common tasks.
- **Long pages handled.** Very long pages are condensed to their most important sentences so they fit in your model's context.
- **Screenshots for vision models.** Press **+ → Make a screenshot** to show the model what you see. Simplexity checks if your model can see images first.
- **Chat history.** Every chat is saved on your computer. Reopen and continue it later, or delete one or all.
- **Model picker.** Choose any model from your server, with its size, type and abilities shown when the server reports them.
- **Reconnect in one click.** The refresh button checks your server again without closing the popup.
- **Works offline.** No accounts, no tracking, nothing loaded from the internet.

## 🚀 Getting started

### 1. Run a local LLM server

Simplexity talks to any server with an **OpenAI-compatible API** (`/v1/models` and `/v1/chat/completions`). Start your server, load a model, and note its address and port.

> The default address is `127.0.0.1:1234`. If your server uses another port, you'll change it in Settings.

### 2. Install the extension

**From the Chrome Web Store:** *coming soon.*

**From source:**

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select the `simplexity` folder.
5. Pin Simplexity to your toolbar so it's one click away.

### 3. Connect

1. Click the Simplexity icon, then the **⋯** button to open **Settings**.
2. Enter your server's **host** and **port**, then click **Test connection**.
3. Pick a model and ask your first question.

Running the model on another computer, like a desktop on your home network? Enter its address in Settings, and Chrome will ask you once to allow Simplexity to connect to it.

<p align="center">
  <img src="docs/screenshots/settings.png" alt="Settings panel" width="240" />
</p>

## 🔒 Privacy

Simplexity has **no servers of its own**.

- Your messages, the page text and any screenshot go **only to the server address you enter**, and only when you send a message.
- Chat history and settings are stored **only on your computer**. Removing the extension deletes them.
- Pages are never read in the background. Simplexity can only access the tab you opened it on.
- No analytics, no cookies, no tracking, no remote code. Even the fonts are bundled.

Read the full [privacy policy](PRIVACY.md).

### Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Saves your settings and chat history on your computer |
| `activeTab` | Reads the current page and takes screenshots, only on the tab where you opened Simplexity |
| `scripting` | Runs the page reader in that tab, only when you send a message |
| `127.0.0.1`, `localhost` | Connects to the LLM server on your own computer |
| Other addresses *(optional)* | Asked for only if you enter a server on another computer |

## 🗂 Project structure

```
simplexity/
├── manifest.json       Extension config and permissions
├── popup.html          The popup's layout
├── popup.css           All styles (popup, panels, notifications)
├── popup.js            Chat, model picker, settings, connection
├── history.js          Saved chats and the History panel
├── attach.js           "+" menu and screenshots
├── notify.js           Notifications for problems and warnings
├── background.js       Talks to your LLM server and streams replies
├── content.js          Reads the page text (run only when you send a message)
├── condense.js         Shortens long pages to their key sentences
├── fonts/              Bundled fonts and their licenses
├── icons/, assets/     Icons, logos and images
├── PRIVACY.md          Privacy policy
└── CHROMEWEBSTORE.md   Store listing notes (not part of the extension)
```

## 🛠 Development

There's no build step: edit the files, then click the **reload** button on Simplexity's card in `chrome://extensions`.

To make a zip for the Chrome Web Store, run this from inside the `simplexity` folder. It leaves out files that are only for GitHub:

```bash
zip -r ../simplexity-chrome-web-store.zip . \
  -x ".git/*" ".gitignore" "README.md" "PRIVACY.md" "CHROMEWEBSTORE.md" "ray.txt" "docs/*"
```

## ☀️ Meet Ray

<img src="assets/mascot.png" alt="Ray, the Simplexity mascot" width="72" align="left" />

Ray is the little sun who greets you every time you open Simplexity. He was born from a spark deep in the web and loves connecting things, so now he connects your local LLM to your browser. Read his full story in [ray.txt](ray.txt).

<br clear="left" />

---

<div align="center">

Made with ☀️ by the Simplexity team

</div>
