import React, { useState } from 'react';
import VideoUploader from './components/VideoUploader';
import VideoPlayer from './components/VideoPlayer';
import CaptionDisplay from './components/CaptionDisplay';
import LanguageSelector from './components/LanguageSelector';
import './App.css';

function App() {
  const [videoSource, setVideoSource] = useState(null);
  const [videoType, setVideoType] = useState(null); // 'file' or 'youtube'
  const [selectedLanguage, setSelectedLanguage] = useState('hi'); // Default Hindi
  const [captions, setCaptions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);

  const handleVideoSelected = (source, type) => {
    setVideoSource(source);
    setVideoType(type);
    setCaptions([]); // Reset captions
  };

  const handleGenerate = () => {
    setIsProcessing(true);
    // This will trigger caption generation
  };

  const handleNewCaption = (caption) => {
    setCaptions(prev => [...prev, caption]);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Real-Time Video Captioning System</h1>
        <p>Accessibility for All - Deaf and Hard-of-Hearing Support</p>
      </header>

      <main className="main-container">
        {!videoSource ? (
          <div className="upload-section">
            <LanguageSelector 
              selectedLanguage={selectedLanguage}
              onLanguageChange={setSelectedLanguage}
            />
            <VideoUploader onVideoSelected={handleVideoSelected} />
          </div>
        ) : (
          <div className="player-section">
            <VideoPlayer
              videoSource={videoSource}
              videoType={videoType}
              selectedLanguage={selectedLanguage}
              isProcessing={isProcessing}
              onGenerate={handleGenerate}
              onCaptionReceived={handleNewCaption}
              onTimeUpdate={setCurrentTime}
            />
            <CaptionDisplay 
              captions={captions}
              currentTime={currentTime}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
