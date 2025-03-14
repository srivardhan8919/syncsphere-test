import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import VideoPlayer from './components/VideoPlayer.jsx';
import Chat from './components/Chat.jsx';
import Timeline from './components/Timeline.jsx';

const socket = io({ transports: ['websocket'], autoConnect: true, reconnection: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });

function App() {
  const [roomId, setRoomId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState(''); // Restore YouTube URL input
  const [videoId, setVideoId] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [users, setUsers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState(''); // Add this new state for video change
  const [showVideoChange, setShowVideoChange] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
    });

    socket.on('roomCreated', ({ roomId, videoId }) => {
      setVideoId(videoId);
      setIsCreatingRoom(false);
      setError('');
      setPassword('');
      setYoutubeUrl(''); // Clear URL after creation
    });

    socket.on('joined', ({ isHost, users, videoId }) => {
      console.log('Received joined event:', { isHost, users, videoId });
      setIsJoined(true);
      setIsHost(isHost);
      setUsers(users);
      setVideoId(videoId);
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

    socket.on('videoChanged', ({ videoId: newVideoId }) => {
      setVideoId(newVideoId);
      setError('');
    });

    return () => {
      socket.off('connect');
      socket.off('roomCreated');
      socket.off('joined');
      socket.off('userUpdate');
      socket.off('newMessage');
      socket.off('error');
      socket.off('roomClosed');
      socket.off('videoChanged');
    };
  }, []);

  const extractVideoId = (url) => {
    if (!url) return null;
    
    // Support multiple URL formats
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i,
      /^[a-zA-Z0-9_-]{11}$/ // Direct video ID
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const createRoom = () => {
    if (!roomId || !password || !youtubeUrl) {
      setError('Please enter a room ID, password, and YouTube URL.');
      return;
    }
    const newVideoId = extractVideoId(youtubeUrl);
    console.log('Extracted video ID:', newVideoId);
    if (!newVideoId) {
      setError('Invalid YouTube URL. Please enter a valid YouTube URL.');
      return;
    }
    socket.emit('createRoom', { roomId, password, videoId: newVideoId });
  };

  const joinRoom = () => {
    if (!roomId || !username || !password) {
      setError('Please enter a room ID, username, and password.');
      return;
    }
    socket.emit('joinRoom', { roomId, username, password });
  };

  const leaveRoom = () => {
    socket.emit('leaveRoom', { roomId });
    setIsJoined(false);
    setRoomId('');
    setUsername('');
    setPassword('');
    setVideoId('');
    setIsHost(false);
    setUsers([]);
    setMessages([]);
    setError('');
  };

  const changeVideo = () => {
    if (!newYoutubeUrl) {
      setError('Please enter a YouTube URL.');
      return;
    }
    const newVideoId = extractVideoId(newYoutubeUrl);
    if (!newVideoId) {
      setError('Invalid YouTube URL.');
      return;
    }
    socket.emit('changeVideo', { roomId, videoId: newVideoId });
    setNewYoutubeUrl(''); // Clear the input after sending
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
              <input
                type="text"
                placeholder="YouTube URL"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
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
          <div className="header-section">
            <h1>SyncSphere - Room: {roomId}</h1>
            <div className="control-buttons">
              <button className="leave-button" onClick={leaveRoom}>
                Leave Room
              </button>
              {isHost &&(
                <button 
                  className="change-video-btn"
                  onClick={() => setShowVideoChange(!showVideoChange)}
                >
                  Change Video
                </button>
              )}
            </div>
            
            {isHost && showVideoChange && (
              <div className="video-change-controls">
                <input
                  type="text"
                  placeholder="New YouTube URL"
                  value={newYoutubeUrl}
                  onChange={(e) => setNewYoutubeUrl(e.target.value)}
                />
                <button onClick={() => {
                  changeVideo();
                  setShowVideoChange(false);
                }}>
                  Update
                </button>
              </div>
            )}
          </div>
          
          {error && <p className="error">{error}</p>}
          
          <div className="content">
            <VideoPlayer
              socket={socket}
              isHost={isHost}
              roomId={roomId}
              videoId={videoId}
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