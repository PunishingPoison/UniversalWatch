// Configuration for Universal Watch Party

// Change this to your deployed server URL when publishing
// e.g. 'https://my-universal-watch-server.onrender.com'
// Keep as 'http://localhost:3000' for local development

export const SERVER_URL = 'https://universal-watch-server.onrender.com';

// WebRTC Configuration (Optional: TURN servers)
export const PEER_CONFIG = {
    // Default PeerJS server is used if empty. 
    // For production, you might want your own PeerServer or a paid service.
    // host: 'peerjs-server.herokuapp.com',
    // port: 443,
    // secure: true
};
