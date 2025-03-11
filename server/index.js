const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const roomManager = require('./roomManager');
const { connectDB, getDB } = require('./db');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// Connect to MongoDB
connectDB();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentRoomId = null;

  socket.on('createRoom', async ({ roomId, password }) => {
    const db = getDB();
    const existingRoom = await db.collection('rooms').findOne({ roomId });
    if (existingRoom) {
      socket.emit('error', 'Room ID already exists');
      return;
    }
    await db.collection('rooms').insertOne({ roomId, password });
    socket.emit('roomCreated', { roomId });
  });

  socket.on('joinRoom', async ({ roomId, username, password }) => {
    const db = getDB();
    const room = await db.collection('rooms').findOne({ roomId });
    if (!room) {
      socket.emit('error', 'Room does not exist');
      return;
    }
    if (room.password !== password) {
      socket.emit('error', 'Incorrect password');
      return;
    }
    const result = roomManager.joinRoom(socket, roomId, username);
    if (!result.success) {
      socket.emit('error', 'Invalid room ID or username');
      return;
    }
    currentRoomId = roomId;
    socket.join(roomId);
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