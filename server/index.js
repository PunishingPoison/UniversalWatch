const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connection from extension (any origin)
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Store room state: { roomId: { users: [], videoState: {} } }
const rooms = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', (roomId, userData) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { users: [], videoState: { isPlaying: false, currentTime: 0, timestamp: Date.now() } };
    }

    // Check if this socket is already in the room
    const existingUserIndex = rooms[roomId].users.findIndex(u => u.id === socket.id);

    if (existingUserIndex !== -1) {
      // User is re-joining or updating
      const oldUserData = rooms[roomId].users[existingUserIndex].data;

      // If PeerID changed (e.g. reload), notify others that the old peer left
      if (oldUserData.peerId && oldUserData.peerId !== userData.peerId) {
        socket.to(roomId).emit('user-left', oldUserData.peerId);
      }

      // Update user data
      rooms[roomId].users[existingUserIndex].data = userData;
    } else {
      // New user
      const user = { id: socket.id, data: userData };
      rooms[roomId].users.push(user);
    }

    console.log(`User joined/updated room ${roomId}`, userData);

    // Send current state to new user
    socket.emit('sync-video-state', rooms[roomId].videoState);

    // Broadcast to others
    socket.to(roomId).emit('user-joined', userData);
  });

  socket.on('video-state-change', (roomId, state) => {
    // state: { isPlaying, currentTime, timestamp }
    if (rooms[roomId]) {
      rooms[roomId].videoState = state;
      // Broadcast to everyone else in the room
      socket.to(roomId).emit('sync-video-state', state);
    }
  });

  socket.on('send-message', (roomId, message) => {
    io.to(roomId).emit('receive-message', message);
  });

  socket.on('signal', (data) => {
    // data: { to, from, signal }
    io.to(data.to).emit('signal', data);
  });

  socket.on('user-video-status', (roomId, status) => {
    // status: { peerId, isVideoOn }
    socket.to(roomId).emit('user-video-status', status);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    // Cleanup logic could go here
    for (const roomId in rooms) {
      const index = rooms[roomId].users.findIndex(u => u.id === socket.id);
      if (index !== -1) {
        const user = rooms[roomId].users[index];
        rooms[roomId].users.splice(index, 1);

        // Notify others with PeerID if available, else Socket ID
        const peerId = user.data && user.data.peerId ? user.data.peerId : socket.id;
        io.to(roomId).emit('user-left', peerId);
      }
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
