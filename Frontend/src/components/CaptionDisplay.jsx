import React, { useEffect, useRef } from 'react';
import './CaptionDisplay.css';

const CaptionDisplay = ({ captions, currentTime }) => {
  const captionContainerRef = useRef(null);
  const [currentCaption, setCurrentCaption] = React.useState(null);

  useEffect(() => {
    // Find the caption that should be displayed at current time
    const activeCaption = captions.find(caption => {
      const start = caption.start_time;
      const end = caption.end_time || caption.start_time + 3; // Default 3 second duration
      return currentTime >= start && currentTime <= end;
    });

    setCurrentCaption(activeCaption);
  }, [currentTime, captions]);

  useEffect(() => {
    // Auto-scroll to latest caption
    if (captionContainerRef.current) {
      captionContainerRef.current.scrollTop = captionContainerRef.current.scrollHeight;
    }
  }, [captions]);

  return (
    <div className="caption-display-container">
      <h3>Real-Time Captions</h3>
      
      {/* Current Caption - Large Display */}
      <div className="current-caption-display">
        {currentCaption ? (
          <div className="current-caption active">
            <p className="caption-text">{currentCaption.text}</p>
            <span className="caption-timestamp">
              {formatTime(currentCaption.start_time)}
            </span>
          </div>
        ) : (
          <p className="no-caption">Waiting for captions...</p>
        )}
      </div>

      {/* Caption History */}
      <div className="caption-history" ref={captionContainerRef}>
        <h4>Caption History</h4>
        {captions.length === 0 ? (
          <p className="empty-message">No captions yet. Captions will appear here as the video plays.</p>
        ) : (
          <div className="caption-list">
            {captions.map((caption, index) => (
              <div 
                key={index} 
                className={`caption-item ${currentCaption?.start_time === caption.start_time ? 'highlight' : ''}`}
              >
                <span className="time-badge">{formatTime(caption.start_time)}</span>
                <p className="caption-text">{caption.text}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Helper function to format time
const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default CaptionDisplay;
