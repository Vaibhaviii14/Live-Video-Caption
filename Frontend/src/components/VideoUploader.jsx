// import React, { useState, useEffect } from 'react';
// import { io } from 'socket.io-client';
// import './VideoUploader.css';

// const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
// const BACKEND_URL = 'http://localhost:8080';

// const VideoUploader = ({ onVideoSelected, onStatusUpdate = () => {} }) => {
//   const [uploadType, setUploadType] = useState('file');
//   const [youtubeLink, setYoutubeLink] = useState('');
//   const [selectedFile, setSelectedFile] = useState(null);
//   const [previewUrl, setPreviewUrl] = useState(null);
//   const [uploadProgress, setUploadProgress] = useState(0);
//   const [isUploading, setIsUploading] = useState(false);
//   const [socket, setSocket] = useState(null);

//   // Initialize WebSocket connection
//   useEffect(() => {
//     const newSocket = io(BACKEND_URL, {
//       reconnection: true,
//       reconnectionDelay: 1000,
//       reconnectionDelayMax: 5000,
//       reconnectionAttempts: 5,
//       transports: ['websocket', 'polling'],
//       forceNew: false // prevent multiple connections
//     });

//     newSocket.on('connect', () => {
//       console.log('✓ Connected to backend');
//       onStatusUpdate('Connected to server');
//     });

//     newSocket.on('connect_error', (error) => {
//       console.error('Connection error:', error);
//       onStatusUpdate('Connection error: ' + error.message);
//     });

//     newSocket.on('disconnect', () => {
//       console.log('Disconnected from backend');
//       onStatusUpdate('Disconnected from server');
//     });

//     setSocket(newSocket);

//     return () => {
//       newSocket.disconnect(); // Properly disconnect on unmount
//     };
//   }, []); // Empty dependency array to avoid reconnects

//   const handleFileChange = (event) => {
//     const file = event.target.files[0];
//     if (file && file.type.startsWith('video/')) {
//       setSelectedFile(file);
//       const fileURL = URL.createObjectURL(file);
//       setPreviewUrl(fileURL);
//       setUploadProgress(0);
//     } else {
//       alert('Please select a valid video file');
//       setSelectedFile(null);
//     }
//   };

//   const extractYouTubeID = (url) => {
//     const regExp = /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
//     const match = url.match(regExp);
//     return (match && match[7].length === 11) ? match[7] : null;
//   };

//   const uploadFileInChunks = async (file, language) => {
//     if (!socket || !socket.connected) {
//       alert('Not connected to server. Please check your connection.');
//       return;
//     }

//     const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
//     const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

//     setIsUploading(true);
//     onStatusUpdate('Preparing upload...');

//     try {
//       for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
//         const start = chunkIndex * CHUNK_SIZE;
//         const end = Math.min(start + CHUNK_SIZE, file.size);
//         const chunk = file.slice(start, end);

//         const formData = new FormData();
//         formData.append('file', chunk);
//         formData.append('chunk_index', chunkIndex.toString());
//         formData.append('total_chunks', totalChunks.toString());
//         formData.append('session_id', sessionId);
//         formData.append('filename', file.name);
//         formData.append('language', language);

//         console.log(`Uploading chunk ${chunkIndex + 1}/${totalChunks}`);
//         for (let [key, value] of formData.entries()) {
//           if (key !== 'file') console.log(`  ${key}:`, value);
//           else console.log(`  ${key}:`, value.type, `(${value.size} bytes)`);
//         }

//         const response = await fetch(`${BACKEND_URL}/upload`, {
//           method: 'POST',
//           body: formData,
//           credentials: 'include',
//           headers: {
//             'Accept': 'application/json'
//           }
//         });

//         console.log(`Response status: ${response.status}`);
//         const data = await response.json();
//         console.log(`Response data:`, data);

//         if (!response.ok) {
//           throw new Error(data.message || `HTTP error! status: ${response.status}`);
//         }

//         const uploadedPercent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
//         setUploadProgress(uploadedPercent);
//         onStatusUpdate(`Uploading: ${uploadedPercent}% (${chunkIndex + 1}/${totalChunks})`);

//         await new Promise(resolve => setTimeout(resolve, 100));
//       }

//       setIsUploading(false);
//       setUploadProgress(0);
//       onStatusUpdate('Upload complete! Processing video...');
//     } catch (error) {
//       console.error('Upload error:', error);
//       alert(`Upload failed: ${error.message}`);
//       setIsUploading(false);
//       setUploadProgress(0);
//       onStatusUpdate('Upload failed');
//     }
//   };

//   const handleGenerate = (language) => {
//     if (uploadType === 'file' && selectedFile) {
//       uploadFileInChunks(selectedFile, language);
//     } else if (uploadType === 'youtube' && youtubeLink) {
//       const videoId = extractYouTubeID(youtubeLink);
//       if (videoId && socket && socket.connected) {
//         onStatusUpdate('Processing YouTube video...');
//         socket.emit('youtube_video', {
//           videoId: videoId,
//           language: language
//         });
//       } else {
//         alert('Please enter a valid YouTube URL');
//       }
//     } else {
//       alert('Please provide a video source');
//     }
//   };


//   return (
//     <div className="video-uploader">
//       <div className="upload-type-selector">
//         <button
//           className={`type-btn ${uploadType === 'file' ? 'active' : ''}`}
//           onClick={() => setUploadType('file')}
//           disabled={isUploading}
//         >
//           Upload Video File
//         </button>
//         <button
//           className={`type-btn ${uploadType === 'youtube' ? 'active' : ''}`}
//           onClick={() => setUploadType('youtube')}
//           disabled={isUploading}
//         >
//           YouTube Link
//         </button>
//       </div>

//       {uploadType === 'file' ? (
//         <div className="file-upload-section">
//           <input
//             type="file"
//             accept="video/*"
//             onChange={handleFileChange}
//             id="video-file-input"
//             style={{ display: 'none' }}
//             disabled={isUploading}
//           />
//           <label htmlFor="video-file-input" className="file-upload-label">
//             <div className="upload-icon">📁</div>
//             <p>{selectedFile ? selectedFile.name : 'Click to select video file'}</p>
//             {selectedFile && (
//               <span className="file-size">
//                 Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
//               </span>
//             )}
//           </label>

//           {previewUrl && (
//             <div className="video-preview">
//               <video width="100%" height="200" controls src={previewUrl} />
//             </div>
//           )}

//           {isUploading && (
//             <div className="upload-progress">
//               <div className="progress-bar">
//                 <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
//               </div>
//               <span className="progress-text">{uploadProgress}%</span>
//             </div>
//           )}
//         </div>
//       ) : (
//         <div className="youtube-link-section">
//           <input
//             type="text"
//             placeholder="Paste YouTube video link here"
//             value={youtubeLink}
//             onChange={(e) => setYoutubeLink(e.target.value)}
//             className="youtube-input"
//             disabled={isUploading}
//           />
//           {youtubeLink && extractYouTubeID(youtubeLink) && (
//             <div className="youtube-preview">
//               <p>✓ Valid YouTube link detected</p>
//             </div>
//           )}
//         </div>
//       )}

//       <LanguageAndGenerateSection 
//         onGenerate={handleGenerate} 
//         disabled={!selectedFile && !youtubeLink}
//         isUploading={isUploading}
//       />
//     </div>
//   );
// };

// // Sub-component for language selection and generate button
// const LanguageAndGenerateSection = ({ onGenerate, disabled, isUploading }) => {
//   const [selectedLanguage, setSelectedLanguage] = React.useState('hi');

//   const languages = [
//     { code: 'hi', name: 'Hindi', flag: '🇮🇳' },
//     { code: 'en', name: 'English', flag: '🇬🇧' },
//     { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
//     { code: 'te', name: 'Telugu', flag: '🇮🇳' },
//     { code: 'kn', name: 'Kannada', flag: '🇮🇳' },
//     { code: 'ml', name: 'Malayalam', flag: '🇮🇳' },
//     { code: 'bn', name: 'Bengali', flag: '🇮🇳' },
//     { code: 'gu', name: 'Gujarati', flag: '🇮🇳' },
//     { code: 'mr', name: 'Marathi', flag: '🇮🇳' },
//     { code: 'pa', name: 'Punjabi', flag: '🇮🇳' },
//   ];

//   return (
//     <div className="language-and-generate">
//       <select
//         value={selectedLanguage}
//         onChange={(e) => setSelectedLanguage(e.target.value)}
//         className="language-dropdown"
//         disabled={disabled || isUploading}
//       >
//         {languages.map((lang) => (
//           <option key={lang.code} value={lang.code}>
//             {lang.flag} {lang.name}
//           </option>
//         ))}
//       </select>

//       <button
//         className="generate-btn"
//         onClick={() => onGenerate(selectedLanguage)}
//         disabled={disabled || isUploading}
//       >
//         {isUploading ? 'Uploading...' : 'Generate Captions'}
//       </button>
//     </div>
//   );
// };

// export default VideoUploader;

import React, { useState } from 'react';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const VideoUploader = ({ onVideoSelected, socket }) => {
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      onVideoSelected(url, 'file');
      uploadFileInChunks(file);
    }
  };

  const uploadFileInChunks = async (file) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const sessionId = `${Date.now()}_${Math.random().toString(36).substr(2,9)}`;

    for (let i=0; i<totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunk = file.slice(start, end);

      const formData = new FormData();
      formData.append('file', chunk);
      formData.append('chunk_index', i);
      formData.append('total_chunks', totalChunks);
      formData.append('session_id', sessionId);
      formData.append('filename', file.name);
      formData.append('language', 'hi'); // or selected language

      // await fetch(`${process.env.BACKEND_URL || 'http://localhost:8080'}/upload`, {
      //   method: 'POST',
      //   body: formData,
      //   credentials: 'include',
      // });
      const response = await fetch('http://localhost:8080/upload', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    }
  };

  return (
    <div>
      <input type="file" accept="video/*" onChange={handleFileChange} />
      {selectedFile && <p>Selected file: {selectedFile.name}</p>}
    </div>
  );
};

export default VideoUploader;
