class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  joinRoom(socket, roomId, username) {
    if (!roomId || !username) return { success: false };
    let room = this.rooms.get(roomId);
    if (!room) {
      room = { host: socket.id, users: new Map([[socket.id, username]]) };
      this.rooms.set(roomId, room);
      return { success: true, isHost: true };
    } else {
      room.users.set(socket.id, username);
      return { success: true, isHost: false };
    }
  }

  leaveRoom(socket, roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.users.delete(socket.id);
    if (socket.id === room.host) {
      this.rooms.delete(roomId);
      return true;
    }
    return false;
  }

  getUsers(roomId) {
    const room = this.rooms.get(roomId);
    return room ? Array.from(room.users.values()) : [];
  }

  isHost(socket, roomId) {
    const room = this.rooms.get(roomId);
    return room && room.host === socket.id;
  }

  broadcast(roomId, event, data, io, excludeSocketId = null) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    for (const socketId of room.users.keys()) {
      if (socketId !== excludeSocketId) {
        io.to(socketId).emit(event, data);
      }
    }
  }
}

module.exports = new RoomManager();