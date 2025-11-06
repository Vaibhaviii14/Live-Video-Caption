import React, { useEffect, useRef, useState } from 'react';
import './CaptionDisplay.css';

const CaptionDisplay = ({ captions, currentTime }) => {
  const captionContainerRef = useRef(null);
  const [currentCaption, setCurrentCaption] = useState(null);

  useEffect(() => {
    if (!captions || captions.length === 0) {
      setCurrentCaption(null);
      return;
    }

    // Find the caption active at currentTime
    const activeCaption = captions.find(caption => {
      const start = caption.start_time || 0;
      const end = caption.end_time || (caption.start_time + 3);
      return currentTime >= start && currentTime <= end;
    });

    setCurrentCaption(activeCaption || null);
  }, [currentTime, captions]);

  useEffect(() => {
    // Auto scroll caption history to bottom when captions change
    if (captionContainerRef.current) {
      captionContainerRef.current.scrollTop = captionContainerRef.current.scrollHeight;
    }
  }, [captions]);

  const formatTime = (seconds) => {
    if (!seconds && seconds !== 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="caption-display-container" aria-live="polite" aria-atomic="true">
      <h3>📝 Real-Time Captions</h3>

      <div className="current-caption-display">
        {currentCaption ? (
          <div className="current-caption active">
            <p className="caption-text">{currentCaption.text}</p>
            <span className="caption-timestamp">
              {formatTime(currentCaption.start_time)} - {formatTime(currentCaption.end_time)}
            </span>
            {currentCaption.confidence !== undefined && (
              <span className="caption-confidence">
                Confidence: {(currentCaption.confidence * 100).toFixed(0)}%
              </span>
            )}
          </div>
        ) : (
          <p className="no-caption">▶ Waiting for captions... Play the video to start.</p>
        )}
      </div>

      <div className="caption-history" ref={captionContainerRef} role="list" aria-label="Caption history">
        <h4>📋 Caption History ({captions.length} captions)</h4>
        {captions.length === 0 ? (
          <p className="empty-message">No captions yet.</p>
        ) : (
          captions.map((caption, index) => (
            <div
              key={index}
              className={`caption-item ${currentCaption?.start_time === caption.start_time ? 'highlight' : ''}`}
              role="listitem"
            >
              <span className="time-badge">{formatTime(caption.start_time)}</span>
              <p className="caption-text">{caption.text}</p>
              {caption.confidence !== undefined && (
                <span className="mini-confidence">{(caption.confidence * 100).toFixed(0)}%</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CaptionDisplay;
