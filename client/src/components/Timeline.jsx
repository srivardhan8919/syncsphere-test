import React, { useState, useEffect } from 'react';

function Timeline({ users, socket, roomId }) {
  const [positions, setPositions] = useState({});

  useEffect(() => {
    socket.on('timeSync', ({ time }) => {
      setPositions((prev) => ({ ...prev, host: time }));
    });

    return () => socket.off('timeSync');
  }, [socket]);

  const calculatePosition = (time, duration = 10) => { // Assuming 10s video for demo
    return (time / duration) * 100;
  };

  return (
    <div className="timeline-container">
      <div className="timeline">
        {users.map((user, index) => (
          <div
            key={index}
            className={`marker ${index === 0 ? 'host' : 'viewer'}`}
            style={{ left: `${calculatePosition(positions[user] || 0)}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export default Timeline;