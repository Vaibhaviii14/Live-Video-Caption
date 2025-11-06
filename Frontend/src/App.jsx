import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import LanguageSelector from './components/LanguageSelector'; // This import is correctly commented out

// Backend server URL
const BACKEND_URL = 'http://localhost:8080';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

// --- GLOBAL STYLES ---
const GlobalStyles = () => (
  <style>{`
    /* App.css from context */
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
        'Helvetica Neue', Arial, sans-serif;
      background-color: #f0f2f5;
      color: #333;
      margin: 0;
      padding: 0;
    }

    .app-container {
      max-width: 1600px;
      margin: 0 auto;
      padding: 20px;
    }

    .app-header {
      text-align: center;
      margin-bottom: 30px;
      padding: 20px; /* Changed from padding-bottom */
      border-bottom: none; /* Removed border */
      /* Added gradient background, border-radius, and shadow to match */
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 20px;
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    .app-header h1 {
      font-size: 2.5rem;
      font-weight: 600;
      color: white; /* Changed to white */
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2); /* Added shadow */
    }

    .server-status {
      font-size: 1rem;
      color: rgba(255, 255, 255, 0.85); /* Changed to light-white */
      margin-top: 10px;
    }

    .server-status span {
      font-weight: 600;
      color: white; /* Changed to white */
    }

    .app-main {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }

    /* LanguageSelector.css */
    .language-selector {
      /* margin-bottom: 30px; (handled by gap) */
      padding: 20px;
      background: #f8f9ff;
      border-radius: 10px;
    }

    .language-selector label {
      display: block;
      margin-bottom: 10px;
      color: #333;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .language-dropdown {
      width: 100%;
      padding: 12px;
      border: 2px solid #667eea;
      border-radius: 8px;
      font-size: 1rem;
      background: white;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .language-dropdown:focus {
      outline: none;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }

    .language-dropdown option {
      padding: 10px;
    }

    /* VideoUploader.css from context */
    .video-uploader-container { /* Renamed class and added new styles */
      padding: 20px;
      background: #f8f9ff;
      border-radius: 10px;
      text-align: center; /* Center the button */
    }
    
    .hidden-file-input { /* Class to hide the default input */
      display: none;
    }

    .custom-file-upload-label { /* The new styled button */
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 15px 30px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-block;
      margin-bottom: 15px; /* Add space below button */
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
    }

    .custom-file-upload-label:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 30px rgba(102, 126, 234, 0.6);
    }
    
    .selected-file-text { /* Style for the selected file text */
      margin: 0;
      font-weight: 500;
      color: #333;
    }
    
    /* --- New YouTube Uploader Styles --- */
    .youtube-uploader {
      padding: 20px;
      background: #f8f9ff;
      border-radius: 10px;
    }
    .youtube-uploader label {
      display: block;
      margin-bottom: 10px;
      color: #333;
      font-weight: 600;
      font-size: 1.1rem;
    }
    .youtube-input {
      width: 100%;
      padding: 12px;
      border: 2px solid #ddd;
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box; /* Important for 100% width + padding */
    }
    .youtube-input:focus {
      outline: none;
      border-color: #667eea;
    }
    .youtube-submit-btn {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 12px 20px;
      border-radius: 10px;
      box-shadow: 0 5px 15px rgba(102, 126, 234, 0.3);
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: inline-block;
      margin-top: 15px;
      border: none;
      text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.2);
    }
    .youtube-submit-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 25px rgba(102, 126, 234, 0.5);
    }
    /* --- End of YouTube Uploader Styles --- */

    /* VideoPlayer.css from context */
    .video-player-container {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    .video-element {
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      border-radius: 20px;
      aspect-ratio: 16 / 9; /* Added for better iframe scaling */
    }

    /* CaptionDisplay.css from context */
    .caption-display-container {
      background: white;
      border-radius: 20px;
      padding: 20px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      flex: 1;
    }

    .caption-display-container h3 {
      margin: 0 0 20px 0;
      color: #667eea;
      font-size: 1.5rem;
      font-weight: 600;
    }
    
    .caption-display-container h4 {
      margin: 0 0 15px 0;
      color: #333;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .current-caption-display {
      min-height: 150px;
      padding: 30px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 15px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 5px 20px rgba(102, 126, 234, 0.4);
    }

    .current-caption {
      text-align: center;
      width: 100%;
    }

    .current-caption .caption-text {
      color: white;
      font-size: 1.8rem;
      font-weight: 600;
      line-height: 1.6;
      margin: 0 0 15px 0;
      text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
      word-wrap: break-word;
    }

    .caption-timestamp {
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.95rem;
      font-weight: 500;
      display: block;
    }

    .no-caption {
      color: rgba(255, 255, 255, 0.7);
      font-size: 1.1rem;
      font-style: italic;
      margin: 0;
    }

    .caption-history {
      flex: 1;
      overflow-y: auto;
      padding: 10px;
      background: #f8f9ff;
      border-radius: 10px;
    }
    
    .empty-message {
      color: #999;
      text-align: center;
      padding: 40px 20px;
      font-style: italic;
    }

    .caption-item {
      padding: 15px;
      background: white;
      border-radius: 10px;
      border-left: 4px solid #667eea;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 12px;
      transition: all 0.3s ease;
    }

    .caption-item.highlight {
      background: #fff8e1;
      border-left-color: #ffc107;
      box-shadow: 0 5px 15px rgba(255, 193, 7, 0.3);
      transform: scale(1.02);
    }

    .time-badge {
      display: inline-block;
      padding: 6px 12px;
      background: #667eea;
      color: white;
      border-radius: 12px;
      font-size: 0.8rem;
      font-weight: 600;
      white-space: nowrap;
      flex-shrink: 0;
    }

    .caption-item .caption-text {
      margin: 0;
      color: #333;
      font-size: 0.95rem;
      line-height: 1.5;
      flex: 1;
    }
  `}</style>
);

// --- LANGUAGE SELECTOR ---
// (Using the inline definition as requested, with the full list)
<LanguageSelector selectedLanguage={selectedLanguage} onLanguageChange={handleLanguageChange} />

// --- VIDEO UPLOADER ---
const VideoUploader = ({ onVideoSelected, socket, language }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      onVideoSelected(url, 'file');
      uploadFileInChunks(file, language);
    }
  };

  const uploadFileInChunks = async (file, lang) => {
    if (!socket) {
        console.error("Socket not connected");
        return;
    }
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('chunk_index', i.toString());
      formData.append('total_chunks', totalChunks.toString());
      formData.append('session_id', sessionId);
      formData.append('filename', file.name);
      formData.append('language', lang);

      try {
        const response = await fetch(`${BACKEND_URL}/upload`, { 
            method: 'POST', 
            body: formData,
            credentials: 'include' 
        });
        if (!response.ok) { 
            console.error("Chunk upload failed");
            break;
        }
      } catch (error) {
        console.error("Upload error:", error);
        break;
      }
    }
  };

  return (
    <div className="video-uploader-container">
    <h1 className='text-2xl font-bold text-purple-600 mb-5'>Upload Video</h1>
      {/* Styled label that triggers the hidden input */}
      <label htmlFor="file-upload-input" className="custom-file-upload-label">
        Choose Video File
      </label>
      
      {/* Hidden file input */}
      <input 
        id="file-upload-input"
        className="hidden-file-input"
        type="file" 
        accept="video/*" 
        onChange={handleFileChange} 
      />
      
      {/* Text to confirm selection */}
      {selectedFile && <p className="selected-file-text">Selected file: {selectedFile.name}</p>}
    </div>
  );
};

// --- YOUTUBE UPLOADER (New Component) ---
const YouTubeUploader = ({ onYouTubeSubmit, socket }) => {
  const [url, setUrl] = useState('');

  const extractYouTubeID = (url) => {
    // Regex to find the video ID from various YouTube URL formats
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleSubmit = () => {
    const videoId = extractYouTubeID(url);
    if (videoId && socket && socket.connected) {
      onYouTubeSubmit(videoId); // Pass the ID up to the App component
    } else {
      console.error("Invalid YouTube URL or socket not connected");
      alert("Please enter a valid YouTube URL.");
    }
  };

  return (
    <div className="youtube-uploader">
      <label htmlFor="youtube-url">Or Transcribe from YouTube:</label>
      <input
        id="youtube-url"
        type="text"
        className="youtube-input"
        placeholder="Paste YouTube video URL (e.g., https://www.youtube.com/watch?v=...)"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <button onClick={handleSubmit} className="youtube-submit-btn">
        Start Transcribing
      </button>
    </div>
  );
};


// --- VIDEO PLAYER (Updated) ---
const VideoPlayer = ({ videoSource, videoType, onTimeUpdate }) => {
  const videoRef = useRef(null);
  
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  // Conditionally render based on video type
  if (videoType === 'youtube') {
    return (
      <div className="video-player-container">
        <iframe
          src={videoSource}
          title="YouTube video player"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="video-element" // Use the same class for sizing
        />
      </div>
    );
  }

  // Default is the file player
  return (
    <div className="video-player-container">
      <video
        ref={videoRef}
        src={videoSource}
        controls
        onTimeUpdate={handleTimeUpdate}
        className="video-element"
        width="100%" 
      />
    </div>
  );
};

// --- CAPTION DISPLAY ---
const CaptionDisplay = ({ captions, currentTime }) => {
  const [currentCaption, setCurrentCaption] = useState(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const active = captions.find(c => 
        currentTime >= c.start_time && 
        c.end_time && 
        currentTime <= c.end_time
    );
    setCurrentCaption(active || null);
  }, [currentTime, captions]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [captions]);

  const formatTime = (s) => {
    if (!s && s !== 0) return '0:00';
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    const ms = Math.floor((s % 1) * 100);
    return `${m}:${sec.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="caption-display-container">
      <h3>📝 Real-Time Captions</h3>

      <div className="current-caption-display">
        {currentCaption ? (
          <div className="current-caption active">
            <p className="caption-text">{currentCaption.text}</p>
            <span className="caption-timestamp">
              {formatTime(currentCaption.start_time)} - {formatTime(currentCaption.end_time)}
            </span>
          </div>
        ) : (
          <p className="no-caption">▶ Waiting for captions...</p>
        )}
      </div>

      <h4>📋 Caption History ({captions.length} captions)</h4>
      <div className="caption-history" ref={containerRef}>
        {captions.length === 0 ? (
            <p className="empty-message">No captions yet.</p>
        ) : (
            captions.map((c, i) => (
              <div key={i} className={`caption-item ${currentCaption === c ? 'highlight' : ''}`}>
                <span className="time-badge">{formatTime(c.start_time)}</span>
                <p className="caption-text">{c.text}</p>
              </div>
            ))
        )}
      </div>
    </div>
  );
};

// --- MAIN APP (Updated) ---
export default function App() {
  const [socket, setSocket] = useState(null);
  const [captions, setCaptions] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoSource, setVideoSource] = useState(null);
  const [videoType, setVideoType] = useState('file'); // 'file' or 'youtube'
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [serverStatus, setServerStatus] = useState('Connecting...');

  useEffect(() => {
    const newSocket = io(BACKEND_URL, { 
        reconnection: true,
        transports: ['websocket'] // Force websocket transport to avoid polling errors
    });
    
    newSocket.on('connect', () => {
        console.log('✓ Connected to backend server');
        setServerStatus('Connected')
    });
    newSocket.on('disconnect', () => {
        console.log('Disconnected from backend server');
        setServerStatus('Disconnected')
    });
    newSocket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        setServerStatus(`Connection Error: ${error.message}`);
    });
    
    newSocket.on('new_caption', (c) =>
      setCaptions((prev) => {
        const exists = prev.some(
          (cap) => cap.start_time === c.start_time && cap.text === c.text
        );
        if (exists) return prev;
        return [...prev, c].sort((a, b) => a.start_time - b.start_time)
      })
    );
    newSocket.on('status', (statusMessage) => {
        console.log('Server Status:', statusMessage);
        setServerStatus(statusMessage);
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const handleVideoSelected = (src, type) => {
    setVideoSource(src);
    setVideoType('file'); // Set type to file
    setCaptions([]);
    setCurrentTime(0);
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    setCaptions([]);
  };

  // New handler for YouTube submissions
  const handleYouTubeSubmit = (videoId) => {
    const embedUrl = `https://www.youtube.com/embed/${videoId}`;
    setVideoSource(embedUrl);
    setVideoType('youtube'); // Set type to youtube
    setCaptions([]);
    setCurrentTime(0);

    // Tell the server to start processing the YouTube video
    if (socket) {
      socket.emit('youtube_video', { 
        videoId: videoId, 
        language: selectedLanguage 
      });
      setServerStatus('Processing YouTube video...');
    }
  };

  return (
    <div className="app-container">
      <GlobalStyles />
      <header className="app-header">
        <h1>Live Video Caption Generator</h1>
        <div className="server-status">
          Server Status: <span>{serverStatus}</span>
        </div>
      </header>

      <main className="app-main">
        <LanguageSelector
          selectedLanguage={selectedLanguage}
          onLanguageChange={handleLanguageChange}
        />
        <VideoUploader
          onVideoSelected={handleVideoSelected}
          socket={socket}
          language={selectedLanguage} // Pass the selected language
        />
        {/* --- This is the new YouTubeUploader component --- */}
        <YouTubeUploader 
          onYouTubeSubmit={handleYouTubeSubmit}
          socket={socket}
        />
        {videoSource && (
          <VideoPlayer
            videoSource={videoSource}
            videoType={videoType} // Pass the videoType
            onTimeUpdate={setCurrentTime}
          />
        )}
        <CaptionDisplay captions={captions} currentTime={currentTime} />
      </main>
    </div>
  );
}
