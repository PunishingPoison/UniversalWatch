# Universal Watch Party

A powerful Chrome Extension that lets you watch videos with friends in perfect sync, complete with video chat and messaging.

## Features

- 🎥 **Synchronized Playback**: Play, pause, and seek videos in sync across all users.
- 📹 **Video Call**: Real-time video chat using WebRTC (PeerJS).
- 💬 **Live Chat**: Built-in messaging system.
- 🎨 **Premium UI**: Sleek, glassmorphic design that feels native.
- 🔄 **Auto-Reconnection**: Robust handling of network drops and page reloads.

## Project Structure

This repository contains two main components:

1.  **`/extension`**: The Chrome Extension (Client). Built with React + Vite.
2.  **`/server`**: The Signaling Server. Built with Node.js + Socket.IO.

---

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm (Node Package Manager)
- Google Chrome (or Chromium-based browser)

### 1. Setup the Server

The server handles signaling for video calls and synchronizing playback state.

```bash
cd server
npm install

# Start the server on port 8000
PORT=8000 node index.js
```
*Note: The extension is configured to look for the server at `http://localhost:8000` by default.*

### 2. Build the Extension

```bash
cd extension
npm install

# Build for production
npm run build
```

### 3. Load into Chrome

1.  Open Chrome and navigate to `chrome://extensions/`.
2.  Enable **Developer mode** (toggle in the top right).
3.  Click **Load unpacked**.
4.  Select the `dist` folder inside `extension/` (created after running `npm run build`).

## 🛠️ Configuration

The extension configuration is located in `extension/src/config.js`.

```javascript
// Current Default
export const SERVER_URL = 'http://localhost:8000';
```

To deploy for public use:
1.  Deploy the contents of `/server` to a host (e.g., Render, Heroku, Railway).
2.  Update `SERVER_URL` in `extension/src/config.js` to your deployed URL (e.g., `https://my-app.onrender.com`).
3.  Rebuild the extension (`npm run build`).

## 📜 License

MIT License. Feel free to use and modify!
