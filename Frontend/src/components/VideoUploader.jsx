import React, { useState } from 'react';
import './VideoUploader.css';

const VideoUploader = ({ onVideoSelected }) => {
  const [uploadType, setUploadType] = useState('file'); // 'file' or 'youtube'
  const [youtubeLink, setYoutubeLink] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      const fileURL = URL.createObjectURL(file);
      setPreviewUrl(fileURL);
    } else {
      alert('Please select a valid video file');
    }
  };

  const extractYouTubeID = (url) => {
    const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[7].length === 11) ? match[7] : null;
  };

  const handleGenerate = () => {
    if (uploadType === 'file' && selectedFile) {
      onVideoSelected(previewUrl, 'file', selectedFile);
    } else if (uploadType === 'youtube' && youtubeLink) {
      const videoId = extractYouTubeID(youtubeLink);
      if (videoId) {
        onVideoSelected(videoId, 'youtube');
      } else {
        alert('Please enter a valid YouTube URL');
      }
    } else {
      alert('Please provide a video source');
    }
  };

  return (
    <div className="video-uploader">
      <div className="upload-type-selector">
        <button
          className={`type-btn ${uploadType === 'file' ? 'active' : ''}`}
          onClick={() => setUploadType('file')}
        >
          Upload Video File
        </button>
        <button
          className={`type-btn ${uploadType === 'youtube' ? 'active' : ''}`}
          onClick={() => setUploadType('youtube')}
        >
          YouTube Link
        </button>
      </div>

      {uploadType === 'file' ? (
        <div className="file-upload-section">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            id="video-file-input"
            style={{ display: 'none' }}
          />
          <label htmlFor="video-file-input" className="file-upload-label">
            <div className="upload-icon">📁</div>
            <p>{selectedFile ? selectedFile.name : 'Click to select video file'}</p>
          </label>
          
          {previewUrl && (
            <div className="video-preview">
              <video width="100%" height="200" controls src={previewUrl} />
            </div>
          )}
        </div>
      ) : (
        <div className="youtube-link-section">
          <input
            type="text"
            placeholder="Paste YouTube video link here"
            value={youtubeLink}
            onChange={(e) => setYoutubeLink(e.target.value)}
            className="youtube-input"
          />
          {youtubeLink && extractYouTubeID(youtubeLink) && (
            <div className="youtube-preview">
              <p>✓ Valid YouTube link detected</p>
            </div>
          )}
        </div>
      )}

      <button
        className="generate-btn"
        onClick={handleGenerate}
        disabled={!selectedFile && !youtubeLink}
      >
        Generate Captions
      </button>
    </div>
  );
};

export default VideoUploader;
