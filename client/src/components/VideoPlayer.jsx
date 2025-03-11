import React, { useRef, useEffect } from 'react';

function VideoPlayer({ socket, isHost, roomId, videoUrl, username }) {
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;

    if (isHost) {
      video.onplay = () => socket.emit('hostAction', { action: 'play', time: video.currentTime });
      video.onpause = () => socket.emit('hostAction', { action: 'pause', time: video.currentTime });
      video.onseeked = () => socket.emit('hostAction', { action: 'seek', time: video.currentTime });

      const interval = setInterval(() => {
        socket.emit('timeUpdate', { time: video.currentTime });
      }, 1000);

      return () => clearInterval(interval);
    } else {
      socket.on('viewerAction', ({ action, time }) => {
        if (action === 'play') {
          video.currentTime = time;
          video.play();
        } else if (action === 'pause') {
          video.pause();
          video.currentTime = time;
        } else if (action === 'seek') {
          video.currentTime = time;
        }
      });

      socket.on('timeSync', ({ time }) => {
        const drift = Math.abs(video.currentTime - time);
        if (drift > 0.5) {
          video.currentTime = time;
        }
      });

      return () => {
        socket.off('viewerAction');
        socket.off('timeSync');
      };
    }
  }, [socket, isHost, roomId]);

  return (
    <div className="video-container">
      <video ref={videoRef} className="video-player" controls={isHost} src={videoUrl} />
      {isHost && (
        <div className="controls">
          <button onClick={() => videoRef.current.play()}>Play</button>
          <button onClick={() => videoRef.current.pause()}>Pause</button>
        </div>
      )}
    </div>
  );
}

export default VideoPlayer;