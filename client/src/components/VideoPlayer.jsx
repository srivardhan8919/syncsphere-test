import React, { useEffect, useRef, useState } from 'react';
import YouTube from 'react-youtube';

function VideoPlayer({ socket, isHost, roomId, videoId, username }) {
  const playerRef = useRef(null); // Ref to store the YouTube player instance
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(false); // State to control visibility of controls

  // YouTube player options
  const opts = {
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay:1,
      controls: 0, // Disable default controls
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      showinfo: 0,
      iv_load_policy: 3
    },
  };

  // Store the player instance when it's ready
  const onReady = (event) => {
    playerRef.current = event.target;
    console.log('YouTube Player Ready with videoId:', videoId);
  };

  // Update progress bar
  useEffect(() => {
    let progressInterval;
    if (playerRef.current) {
      progressInterval = setInterval(() => {
        const currentTime = playerRef.current.getCurrentTime() || 0;
        const duration = playerRef.current.getDuration() || 0;
        const progressPercent = (currentTime / duration) * 100;
        setProgress(progressPercent);
      }, 1000);
    }
    return () => clearInterval(progressInterval);
  }, [isPlaying]);

  // Toggle play/pause
  const togglePlayPause = () => {
    if (!playerRef.current) return;

    if (isPlaying) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
    setIsPlaying(!isPlaying);
    
    if (isHost) {
      socket.emit('hostAction', { 
        action: isPlaying ? 'pause' : 'play',
        time: playerRef.current.getCurrentTime()
      });
    }
  };

  // Handle click on video to play/pause
  const handleVideoClick = () => {
    togglePlayPause();
  };

  // Show controls on mouse enter
  const handleMouseEnter = () => {
    setShowControls(true);
  };

  // Hide controls on mouse leave
  const handleMouseLeave = () => {
    setShowControls(false);
  };

  // Handle progress bar click
  const handleProgressClick = (e) => {
    if (!playerRef.current || !isHost) return;
    
    const progressBar = e.currentTarget;
    const clickPosition = (e.clientX - progressBar.getBoundingClientRect().left) / progressBar.offsetWidth;
    const newTime = clickPosition * playerRef.current.getDuration();
    
    playerRef.current.seekTo(newTime);
    socket.emit('hostAction', { action: 'seek', time: newTime });
  };

  // Add error handling with specific messages
  const onError = (event) => {
    const errors = {
      2: 'Invalid video ID',
      5: 'HTML5 player error',
      100: 'Video not found',
      101: 'Video embedding not allowed',
      150: 'Video embedding not allowed',
    };
    
    console.error('YouTube Player Error:', errors[event.data] || 'Unknown error');
    // Optionally notify the user
    if (errors[event.data]) {
      // You can add a state to show this error to the user
      console.error(`YouTube Error: ${errors[event.data]}`);
    }
  };

  // Add state check before player operations
  const onPlay = () => {
    if (isHost && playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
      socket.emit('hostAction', { action: 'play', time: playerRef.current.getCurrentTime() });
    }
  };

  // Host emits pause event
  const onPause = () => {
    if (isHost && playerRef.current) {
      socket.emit('hostAction', { action: 'pause', time: playerRef.current.getCurrentTime() });
    }
  };

  // Host emits seek event
  const onSeeked = () => {
    if (isHost && playerRef.current) {
      socket.emit('hostAction', { action: 'seek', time: playerRef.current.getCurrentTime() });
    }
  };

  // Viewer listens for host actions
  useEffect(() => {
    if (!isHost) {
      socket.on('viewerAction', ({ action, time }) => {
        if (!playerRef.current) return;
        if (action === 'play') {
          playerRef.current.seekTo(time);
          playerRef.current.playVideo();
        } else if (action === 'pause') {
          playerRef.current.pauseVideo();
          setTimeout(() => playerRef.current.seekTo(time), 100); // Pause then seek to fix replay glitch
        } else if (action === 'seek') {
          playerRef.current.seekTo(time);
        }
      });
    }

    // Cleanup listener when component unmounts or role changes
    return () => {
      if (!isHost) socket.off('viewerAction');
    };
  }, [socket, isHost]);

  // Host sends periodic time updates
  useEffect(() => {
    if (isHost) {
      const interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          socket.emit('timeUpdate', { time: playerRef.current.getCurrentTime() });
        }
      }, 1000); // Every 1 second
      return () => clearInterval(interval);
    }
  }, [socket, isHost]);

  // Viewer syncs time with host
  useEffect(() => {
    if (!isHost) {
      socket.on('timeSync', ({ time }) => {
        if (!playerRef.current || !playerRef.current.getCurrentTime) return;
        const drift = Math.abs(playerRef.current.getCurrentTime() - time);
        if (drift > 0.5) { // Resync if drift exceeds 0.5 seconds
          playerRef.current.seekTo(time);
        }
      });
      return () => socket.off('timeSync');
    }
  }, [socket, isHost]);

  return (
    <div 
      className="video-container" 
      onMouseEnter={handleMouseEnter} 
      onMouseLeave={handleMouseLeave}
      onClick={handleVideoClick} // Click to play/pause
    >
      <div className="video-wrapper">
        <YouTube
          videoId={videoId}
          opts={opts}
          onReady={onReady}
          onPlay={onPlay}
          onPause={onPause}
          onError={onError}
          className="youtube-player"
          containerClassName="react-youtube"
        />
      </div>
      {/* Overlay to prevent clicks from redirecting */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'all', // Blocks interaction with the video player
        }}
      />
      {isHost && showControls && (
        <div className="video-controls">
          <button onClick={togglePlayPause} className={isPlaying ? 'pause-icon' : 'play-icon'}>
          </button>
          <div className="progress-bar" onClick={handleProgressClick}>
            <div 
              className="progress-filled" 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;