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
  const [storedRoomId, setStoredRoomId] = useState(localStorage.getItem('roomId') || '');

  useEffect(() => {
    socket.on('joined', ({ isHost, users }) => {
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
    localStorage.setItem('roomId', roomId);
    localStorage.setItem('password', password);
    setStoredRoomId(roomId);
    setIsCreatingRoom(false);
    setError('');
    setPassword('');
  };

  const joinRoom = () => {
    const storedRoomId = localStorage.getItem('roomId');
    const storedPassword = localStorage.getItem('password');

    if (!roomId || !username || !password) {
      setError('Please enter a room ID, username, and password.');
      return;
    }else{
      setError('');
    }

    if (!storedRoomId || storedRoomId !== roomId) {
      setError('Room does not exist. Please create it first.');
      setIsCreatingRoom(true);
      return;
    }

    if (password !== storedPassword) {
      setError('Incorrect password.');
      return;
    }

    // Emit joinRoom with roomId explicitly
    socket.emit('joinRoom', { roomId, username });
  };

  return (
    <div className="app">
      {!isJoined ? (
        <div className="join-container">
          <h1>SyncSphere</h1>
          {storedRoomId && (
            <p>
              Existing Room ID: <strong>{storedRoomId}</strong> 
              <br />
              (Password stored in localStorage, check browser dev tools)
            </p>
          )}
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