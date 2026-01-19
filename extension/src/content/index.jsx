import React from 'react';
import ReactDOM from 'react-dom/client';
import Overlay from './Overlay';
import { socketManager } from './SocketManager';
import { VideoSync } from './VideoSync';
import css from '../index.css?inline';

console.log('Universal Watch Party Content Script Loaded');

class AppController {
    constructor() {
        this.root = null;
        this.shadowRoot = null;
        this.host = null;
        this.videoSync = null;

        this.init();
    }

    async init() {
        // Check initial state
        const { roomId, status } = await chrome.storage.local.get(['roomId', 'status']);
        if (status === 'connected' && roomId) {
            this.mount(roomId);
        }

        // Listen for messages from Popup
        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === 'JOIN_ROOM') {
                this.mount(request.roomId);
            } else if (request.type === 'LEAVE_ROOM') {
                this.unmount();
            }
        });

        // Listen for socket video state updates to sync video
        socketManager.on('video-state', (state) => {
            if (this.videoSync) {
                this.videoSync.updateState(state);
            }
        });

        // Listen for storage changes to handle multi-frame sync robustly
        chrome.storage.onChanged.addListener((changes, area) => {
            if (area === 'local' && changes.roomId) {
                const newRoomId = changes.roomId.newValue;
                const oldRoomId = changes.roomId.oldValue;

                if (newRoomId && newRoomId !== oldRoomId) {
                    this.mount(newRoomId);
                } else if (!newRoomId) {
                    this.unmount();
                }
            }
        });
    }

    mount(roomId) {
        if (this.root) return; // Already mounted

        // Only mount Overlay in the top frame
        if (window.self !== window.top) {
            console.log('Not top frame, skipping overlay mount but starting VideoSync');
            // We still need to join room for video sync in this frame
            socketManager.joinRoom(roomId);
            this.videoSync = new VideoSync(socketManager);
            return;
        }

        console.log('Mounting Universal Watch Party Overlay');

        console.log('Mounting Universal Watch Party Overlay');

        // Create host element
        this.host = document.createElement('div');
        this.host.id = 'universal-watch-overlay-root';

        // Fullscreen Handling Logic
        const appendToFullscreen = () => {
            const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
            if (fsEl) {
                console.log('Entering Fullscreen: Moving overlay inside fullscreen element');
                // We must be careful not to break video players that expect specific children.
                // Usually appending to the end is safe.
                fsEl.appendChild(this.host);
            } else {
                console.log('Exiting Fullscreen: Moving overlay back to body');
                document.body.appendChild(this.host);
            }
        };

        // Initial append
        appendToFullscreen();

        // Listen for fullscreen changes
        document.addEventListener('fullscreenchange', appendToFullscreen);
        document.addEventListener('webkitfullscreenchange', appendToFullscreen);

        // Create shadow root for isolation
        this.shadowRoot = this.host.attachShadow({ mode: 'open' });

        // Inject styles
        const style = document.createElement('style');
        style.textContent = css;
        this.shadowRoot.appendChild(style);

        // Mount React App
        this.root = ReactDOM.createRoot(this.shadowRoot);
        this.root.render(
            <React.StrictMode>
                <Overlay roomId={roomId} onClose={() => this.unmount()} />
            </React.StrictMode>
        );

        // Init Logic
        // socketManager.joinRoom(roomId); // Moved to Overlay to wait for PeerID
        this.videoSync = new VideoSync(socketManager);
    }

    unmount() {
        if (this.root) {
            this.root.unmount();
            this.root = null;
        }
        if (this.host) {
            this.host.remove();
            this.host = null;
        }
        if (this.videoSync) {
            this.videoSync.removeListeners();
            this.videoSync = null;
        }
        socketManager.leaveRoom();
        console.log('Unmounted Universal Watch Party Overlay');
    }
}

new AppController();
