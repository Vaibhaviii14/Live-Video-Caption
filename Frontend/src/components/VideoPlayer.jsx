import React, { useState, useRef, useEffect } from 'react';
import YouTube from 'react-youtube';
import useWebSocket from '../hooks/useWebSocket';
import { processVideoChunks } from '../utils/videoProcessor';
import './VideoPlayer.css';

const VideoPlayer = ({ 
  videoSource, 
  videoType, 
  selectedLanguage,
  isProcessing,
  onGenerate,
  onCaptionReceived,
  onTimeUpdate 
}) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [youtubePlayer, setYoutubePlayer] = useState(null);

  // WebSocket connection for real-time captions
  const { sendMessage, lastMessage, readyState } = useWebSocket(
    'ws://localhost:8080/captions',
    {
      onOpen: () => console.log('WebSocket Connected'),
      onClose: () => console.log('WebSocket Disconnected'),
      onError: (error) => console.error('WebSocket Error:', error)
    }
  );

  useEffect(() => {
    if (lastMessage !== null) {
      try {
        const captionData = JSON.parse(lastMessage.data);
        onCaptionReceived(captionData);
      } catch (error) {
        console.error('Error parsing caption data:', error);
      }
    }
  }, [lastMessage, onCaptionReceived]);

  // Start processing video when component mounts
  useEffect(() => {
    if (videoType === 'file' && videoSource) {
      startVideoProcessing();
    }
  }, [videoSource, videoType, selectedLanguage]);

  const startVideoProcessing = async () => {
    try {
      // Process video in chunks and send to backend
      await processVideoChunks(
        videoSource,
        selectedLanguage,
        (chunk, timestamp) => {
          // Send chunk to backend via WebSocket
          sendMessage(JSON.stringify({
            type: 'audio_chunk',
            data: chunk,
            timestamp: timestamp,
            language: selectedLanguage
          }));
        }
      );
    } catch (error) {
      console.error('Error processing video:', error);
    }
  };

  const handleVideoTimeUpdate = () => {
    if (videoType === 'file' && videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  const handleYouTubeStateChange = (event) => {
    if (event.data === 1) { // Playing
      setIsPlaying(true);
      startYouTubeProcessing(event.target);
    } else {
      setIsPlaying(false);
    }
  };

  const startYouTubeProcessing = async (player) => {
    // For YouTube videos, we need to extract audio and process it
    // This would typically be done on the backend
    sendMessage(JSON.stringify({
      type: 'youtube_video',
      videoId: videoSource,
      language: selectedLanguage
    }));
  };

  const onYouTubeReady = (event) => {
    setYoutubePlayer(event.target);
    const playerDuration = event.target.getDuration();
    setDuration(playerDuration);
    
    // Update current time periodically
    const interval = setInterval(() => {
      if (event.target && event.target.getCurrentTime) {
        const currentTime = event.target.getCurrentTime();
        onTimeUpdate(currentTime);
      }
    }, 100);

    return () => clearInterval(interval);
  };

  const youtubeOpts = {
    height: '480',
    width: '100%',
    playerVars: {
      autoplay: 0,
      controls: 1,
      modestbranding: 1,
      rel: 0
    },
  };

  return (
    <div className="video-player-container">
      <div className="player-wrapper">
        {videoType === 'file' ? (
          <video
            ref={videoRef}
            width="100%"
            height="480"
            controls
            onTimeUpdate={handleVideoTimeUpdate}
            onLoadedMetadata={(e) => setDuration(e.target.duration)}
          >
            <source src={videoSource} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <YouTube
            videoId={videoSource}
            opts={youtubeOpts}
            onReady={onYouTubeReady}
            onStateChange={handleYouTubeStateChange}
          />
        )}
      </div>

      <div className="player-info">
        <div className="connection-status">
          <span className={`status-indicator ${readyState === 1 ? 'connected' : 'disconnected'}`} />
          {readyState === 1 ? 'Connected to Caption Service' : 'Connecting...'}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
