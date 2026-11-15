# Privacy Policy for Simplexity

Last updated: November 15, 2026

Simplexity is a Chrome extension that lets you chat with a large language model (LLM) that you run yourself, about the web page you are viewing. This policy explains what data the extension handles, where it goes, and what stays on your device.

**In short:** Simplexity has no servers of its own. It sends data only to the LLM server address that you enter in its Settings, and only when you send a message. The developer of Simplexity never receives your data.

## What data the extension handles

**When you send a message**, Simplexity sends the following to your LLM server:

- the message you typed
- the text of the web page in the active tab, with its title and address (URL). Long pages are shortened to their most important sentences.
- earlier messages from the same chat, so the model can follow the conversation
- a screenshot of the visible part of the page, but only if you attached one with the "+" button

**When the popup opens, when you press the refresh button, and when you save or test your Settings**, Simplexity asks your LLM server for its list of available models. No page content is sent in this request.

**Settings you choose** (server address and port, selected model, temperature and maximum response length) are saved in your browser's local extension storage on your device.

**Your chat history** is saved in the same local storage on your device, so you can reopen past chats from the History panel. For each chat it saves the messages you typed, the replies, the model's name, the title and address of the page where the chat started, and a note where a screenshot was attached. It does not save the page text or the screenshots themselves. The newest 100 chats are kept; older ones are removed automatically.

## Where your data goes

All of the data above is sent only to the server address you set in Settings. By default this is `127.0.0.1` (your own computer). If you change it to a server on another computer, your data goes to that server, and that server's own privacy practices apply.

Simplexity does not send any data to its developer or to any other party.

## What the extension does not do

- It does not read pages in the background. A page's text is read only when you send a message.
- It does not send your chat history anywhere. History stays on your computer and is used only to show your past chats.
- It does not use analytics, tracking, advertising or cookies.
- It does not load anything from the internet. Fonts, images and code are all included in the extension.
- It does not sell or share your data, and it does not use it for any purpose other than answering your messages.

## Your control over your data

- Nothing is read or sent until you send a message.
- Screenshots are attached only when you choose to take one, and you can remove an attached screenshot before sending.
- You can delete any single chat, or all of them at once, in the History panel.
- Removing the extension from Chrome deletes your chat history and saved settings.

## Changes to this policy

If the way Simplexity handles data changes, this policy will be updated and the "Last updated" date above will change.

## Contact

For questions about this policy, contact: me:/
