import Peer from 'peerjs';

class PeerManager {
    constructor() {
        this.peer = null;
        this.myStream = null;
        this.peers = {}; // { peerId: call }
        this.onStreamCallbacks = [];
    }

    init(onPeerId) {
        this.peer = new Peer(); // uses default peerjs server

        this.peer.on('open', (id) => {
            console.log('My Peer ID is: ' + id);
            if (onPeerId) onPeerId(id);
        });

        this.peer.on('call', (call) => {
            console.log('Incoming call from', call.peer);
            // Answer the call, providing our mediaStream
            call.answer(this.myStream);
            this.handleCall(call);
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });
    }

    async callbackMedia() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            this.myStream = stream;
            return stream;
        } catch (err) {
            console.error('Failed to get local stream', err);
            return null;
        }
    }

    callPeer(peerId) {
        if (!this.myStream) {
            console.warn('No local stream, cannot call');
            return;
        }
        console.log('Calling peer:', peerId);
        const call = this.peer.call(peerId, this.myStream);
        this.handleCall(call);
    }

    handleCall(call) {
        // Hang up on existing call from same peer if any? PeerJS might handle multiples.
        // For this simple app, we just accept.

        call.on('stream', (remoteStream) => {
            console.log('Received remote stream from', call.peer);
            this.triggerOnStream(call.peer, remoteStream);
        });

        call.on('close', () => {
            console.log('Call closed');
            this.triggerOnStream(call.peer, null); // remove stream
        });

        this.peers[call.peer] = call;
    }

    onStream(callback) {
        this.onStreamCallbacks.push(callback);
    }

    triggerOnStream(peerId, stream) {
        this.onStreamCallbacks.forEach(cb => cb(peerId, stream));
    }

    replaceVideoTrack(track) {
        Object.values(this.peers).forEach(call => {
            if (call.peerConnection) {
                const sender = call.peerConnection.getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender) {
                    sender.replaceTrack(track);
                }
            }
        });
    }
}

export const peerManager = new PeerManager();
