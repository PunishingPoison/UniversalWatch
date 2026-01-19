import { io } from 'socket.io-client';
import { SERVER_URL } from '../config';

console.log('Universal Watch Party Background Service Worker Running');

let socket = null;
let currentRoomId = null;

// Connect to socket
const connectSocket = () => {
    if (socket) return;

    console.log('Connecting to server:', SERVER_URL);
    // Service Workers require WebSockets (no XHR polling)
    socket = io(SERVER_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5
    });

    socket.on('connect', () => {
        console.log('Background Socket connected:', socket.id);
        broadcastToContent('SOCKET_CONNECTED', { userId: socket.id });
    });

    // Keep Service Worker Alive Workaround
    setInterval(() => {
        if (socket && socket.connected) {
            socket.emit('ping'); // Dummy emit to keep connection/SW active
        }
    }, 20000);

    socket.on('sync-video-state', (state) => {
        // Broadcast to all tabs/frames
        broadcastToContent('SOCKET_VIDEO_STATE', state);
    });

    socket.on('receive-message', (message) => {
        broadcastToContent('chat-message', message);
    });

    socket.on('user-joined', (userData) => {
        broadcastToContent('user-joined', userData);

        const displayName = userData.peerId ? `User ${userData.peerId.substr(0, 4)}` : 'A user';
        broadcastToContent('system-message', `${displayName} joined the room`);
    });

    socket.on('user-left', (userId) => {
        broadcastToContent('system-message', `${userId} left the room`);
    });

    socket.on('user-video-status', (status) => {
        broadcastToContent('user-video-status', status);
    });
};

const broadcastToContent = (type, data) => {
    // Send to all tabs (or ideally just the active ones in the room)
    // For simplicity, we broadcast to all.
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            if (tab.id) {
                chrome.tabs.sendMessage(tab.id, { type, data }).catch(e => {
                    // Ignore errors (e.g. tab has no content script)
                });
            }
        });
    });
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || !message.type) return;

    // Acknowledge receipt to prevent "Receiving end does not exist" error
    if (sendResponse) sendResponse({ status: 'ok' });

    switch (message.type) {
        case 'CONNECT_SOCKET':
            connectSocket();
            break;

        case 'JOIN_ROOM':
            if (!socket) connectSocket();
            currentRoomId = message.roomId;
            if (socket) {
                // Ensure we use the latest socket if reconnection happened
                if (socket.connected) {
                    socket.emit('join-room', message.roomId, message.userData);
                } else {
                    socket.once('connect', () => {
                        socket.emit('join-room', message.roomId, message.userData);
                    });
                }
            }
            break;

        case 'SEND_MESSAGE':
            if (socket && currentRoomId) {
                const payload = {
                    ...message.data,
                    sender: socket.id
                };
                socket.emit('send-message', currentRoomId, payload);
            }
            break;

        case 'VIDEO_STATE_CHANGE':
            if (socket && currentRoomId) {
                socket.emit('video-state-change', currentRoomId, message.data);
            }
            break;

        case 'USER_VIDEO_STATUS':
            if (socket && currentRoomId) {
                socket.emit('user-video-status', currentRoomId, {
                    peerId: socket.id,
                    ...message.data
                });
            }
            break;

        case 'BROADCAST_ACTION':
            // Legacy relay (if needed for frame-to-frame)
            if (sender.tab && sender.tab.id) {
                chrome.tabs.sendMessage(sender.tab.id, message.payload);
            }
            break;
    }

    return true; // Keeps the message channel open for async responses
});
