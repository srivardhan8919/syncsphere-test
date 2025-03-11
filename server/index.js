const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins for testing (update for production)
    methods: ['GET', 'POST'],
  },
});

// Serve static files from the public folder
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  let currentRoomId = null;

  socket.on('joinRoom', ({ roomId, username }) => {
    console.log(`Join request: Room ID - ${roomId}, Username - ${username}`);
    const result = roomManager.joinRoom(socket, roomId, username);
    if (!result.success) {
      socket.emit('error', 'Invalid room ID or username');
      return;
    }
    currentRoomId = roomId;
    socket.join(roomId);
    console.log(`Emitting 'joined' to ${socket.id}:`, { isHost: result.isHost, users: roomManager.getUsers(roomId) });
    socket.emit('joined', { isHost: result.isHost, users: roomManager.getUsers(roomId) });
    roomManager.broadcast(roomId, 'userUpdate', roomManager.getUsers(roomId), io, socket.id);
  });

  socket.on('hostAction', (data) => {
    if (!currentRoomId || !roomManager.isHost(socket, currentRoomId)) return;
    roomManager.broadcast(currentRoomId, 'viewerAction', data, io);
  });

  socket.on('timeUpdate', (data) => {
    if (!currentRoomId || !roomManager.isHost(socket, currentRoomId)) return;
    roomManager.broadcast(currentRoomId, 'timeSync', data, io);
  });

  socket.on('chatMessage', ({ message }) => {
    if (!currentRoomId) return;
    const username = roomManager.getUsers(currentRoomId).find((u) =>
      roomManager.rooms.get(currentRoomId).users.get(socket.id) === u
    );
    io.to(currentRoomId).emit('newMessage', { username, message });
  });

  socket.on('disconnect', () => {
    if (currentRoomId) {
      const roomClosed = roomManager.leaveRoom(socket, currentRoomId);
      if (roomClosed) {
        io.to(currentRoomId).emit('roomClosed');
      } else {
        roomManager.broadcast(currentRoomId, 'userUpdate', roomManager.getUsers(currentRoomId), io);
      }
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});