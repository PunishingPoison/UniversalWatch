// SocketManager Proxy (talks to Background)

class SocketManager {
    constructor() {
        this.userId = null; // We might not know our own socket ID immediately in this design, or we can fetch it.
        this.listeners = {};

        // Listen for messages from Background
        chrome.runtime.onMessage.addListener((message) => {
            if (message.type) {
                if (message.type === 'SOCKET_CONNECTED') {
                    this.userId = message.data.userId;
                }
                if (message.type === 'SOCKET_VIDEO_STATE') {
                    this.emit('video-state', message.data);
                    return;
                }
                this.emit(message.type, message.data);
            }
        });
    }

    connect() {
        chrome.runtime.sendMessage({ type: 'CONNECT_SOCKET' });
    }

    joinRoom(roomId, userData = {}) {
        chrome.runtime.sendMessage({
            type: 'JOIN_ROOM',
            roomId,
            userData
        });
    }

    leaveRoom() {
        // Implement leave logic in background if needed
    }

    sendVideoState(state) {
        chrome.runtime.sendMessage({
            type: 'VIDEO_STATE_CHANGE',
            data: state
        });
    }

    sendUserVideoStatus(isVideoOn, peerId) {
        chrome.runtime.sendMessage({
            type: 'USER_VIDEO_STATUS',
            data: { isVideoOn, peerId }
        });
    }

    sendMessage(text) {
        chrome.runtime.sendMessage({
            type: 'SEND_MESSAGE',
            data: {
                text,
                timestamp: Date.now()
            }
        });
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(cb => cb(data));
        }
    }
}

export const socketManager = new SocketManager();
