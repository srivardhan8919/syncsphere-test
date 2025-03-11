import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer.jsx';
import Chat from './components/Chat.jsx';
import Timeline from './components/Timeline.jsx';

const socket = io({ transports: ['websocket'], autoConnect: true });

function App() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [videoUrl] = useState('https://www.w3schools.com/html/mov_bbb.mp4');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('roomCreated', ({ roomId }) => {
      setIsCreatingRoom(false);
      setError('');
      setPassword('');
    });

    socket.on('joined', ({ isHost, users }) => {
      console.log('Received joined event:', { isHost, users });
      setIsJoined(true);
      setIsHost(isHost);
      setUsers(users);
      setError('');
    });

    socket.on('userUpdate', (updatedUsers) => {
      setUsers(updatedUsers);
    });

    socket.on('newMessage', ({ username, message }) => {
      setMessages((prev) => [...prev, { username, message }]);
    });

    socket.on('error', (msg) => setError(msg));

    socket.on('roomClosed', () => {
      setIsJoined(false);
      setError('Host left, room closed.');
    });

    return () => {
      socket.off('connect');
      socket.off('roomCreated');
      socket.off('joined');
      socket.off('userUpdate');
      socket.off('newMessage');
      socket.off('error');
      socket.off('roomClosed');
    };
  }, []);

  const createRoom = () => {
    if (!roomId || !password) {
      setError('Please enter a room ID and password.');
      return;
    }
    socket.emit('createRoom', { roomId, password });
  };

  const joinRoom = () => {
    if (!roomId || !username || !password) {
      setError('Please enter a room ID, username, and password.');
      return;
    }
    socket.emit('joinRoom', { roomId, username, password });
  };

  return (
    <div className="app">
      {!isJoined ? (
        <div className="join-container">
          <h1>SyncSphere</h1>
          {isCreatingRoom ? (
            <>
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={createRoom}>Create Room</button>
              <button onClick={() => setIsCreatingRoom(false)}>Cancel</button>
            </>
          ) : (
            <>
              <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
              />
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button onClick={joinRoom}>Join Room</button>
              <button onClick={() => setIsCreatingRoom(true)}>Create Room</button>
            </>
          )}
          {error && <p className="error">{error}</p>}
        </div>
      ) : (
        <div className="main-container">
          <h1>SyncSphere - Room: {roomId}</h1>
          <p>Role: {isHost ? 'Host' : 'Viewer'}</p>
          <div className="content">
            <VideoPlayer
              socket={socket}
              isHost={isHost}
              roomId={roomId}
              videoUrl={videoUrl}
              username={username}
            />
            <Chat socket={socket} roomId={roomId} messages={messages} />
            <Timeline users={users} socket={socket} roomId={roomId} />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;