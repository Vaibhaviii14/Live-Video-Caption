// import React, { useState, useEffect, useCallback } from 'react';
// import VideoPlayer from './components/VideoPlayer';
// import CaptionDisplay from './components/CaptionDisplay';
// import VideoUploader from './components/VideoUploader';
// import { io } from 'socket.io-client';

// const BACKEND_URL = 'http://localhost:8080';

// function App() {
//   const [captions, setCaptions] = useState([]);
//   const [currentTime, setCurrentTime] = useState(0);
//   const [videoSource, setVideoSource] = useState(null);
//   const [videoType, setVideoType] = useState(null);
//   const [socket, setSocket] = useState(null);

//   // Initialize Socket.IO connection once
//   useEffect(() => {
//   const newSocket = io(BACKEND_URL, {
//     reconnection: true,
//     reconnectionDelay: 1000,
//     reconnectionDelayMax: 5000,
//     reconnectionAttempts: 5,
//     transports: ['websocket', 'polling'],
//   });

//   // Listen on newSocket, not socket
//   newSocket.on('caption', (caption) => {
//     setCaptions((prev) => {
//       const exists = prev.some(c => c.start_time === caption.start_time && c.end_time === caption.end_time);
//       if (exists) return prev;
//       return [...prev, caption];
//     });
//   });

//   newSocket.on('transcription_complete', (data) => {
//     console.log('Transcription complete:', data);
//   });

//   setSocket(newSocket);

//   return () => {
//     newSocket.disconnect();
//   };
// }, []);



//   const handleCaptionReceived = useCallback(
//     (caption) => {
//       // This is called from VideoUploader for youtube captions (optional)
//       setCaptions((prev) => [...prev, caption]);
//     },
//     []
//   );

//   const handleTimeUpdate = useCallback((time) => {
//     setCurrentTime(time);
//   }, []);

//   const handleVideoSelected = useCallback((source, type) => {
//     setVideoSource(source);
//     setVideoType(type);
//     setCaptions([]);  // Clear previous captions
//     setCurrentTime(0);
//   }, []);

//   return (
//     <div className="App">
//       {!videoSource ? (
//         <VideoUploader
//           onVideoSelected={handleVideoSelected}
//           onCaptionReceived={handleCaptionReceived}
//           onStatusUpdate={(msg) => console.log(msg)}
//         />
//       ) : (
//         <>
//           <VideoPlayer
//             videoSource={videoSource}
//             videoType={videoType}
//             onTimeUpdate={handleTimeUpdate}
//           />
//           <CaptionDisplay captions={captions} currentTime={currentTime} />
//         </>
//       )}
//     </div>
//   );
// }

// export default App;
import React, { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import VideoUploader from './components/VideoUploader';
import VideoPlayer from './components/VideoPlayer';
import CaptionDisplay from './components/CaptionDisplay';

const BACKEND_URL = 'http://localhost:8080';

function App() {
  const [captions, setCaptions] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [videoSource, setVideoSource] = useState(null);
  const [videoType, setVideoType] = useState(null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io(BACKEND_URL);

    newSocket.on('caption', (caption) => {
      setCaptions((prev) => {
        if (prev.some(c => c.start_time === caption.start_time && c.end_time === caption.end_time)) {
          return prev;
        }
        return [...prev, caption];
      });
    });

    newSocket.on('transcription_complete', (data) => {
      console.log('Transcription complete:', data);
    });

    setSocket(newSocket);
    return () => newSocket.disconnect();
  }, []);

  const handleVideoSelected = (src, type) => {
    setVideoSource(src);
    setVideoType(type);
    setCaptions([]);
    setCurrentTime(0);
  };

  const handleTimeUpdate = (time) => {
    setCurrentTime(time);
  };

  return (
    <div className="App">
      {!videoSource ? (
        <VideoUploader
          onVideoSelected={handleVideoSelected}
          socket={socket}
        />
      ) : (
        <>
          <VideoPlayer
            videoSource={videoSource}
            videoType={videoType}
            onTimeUpdate={handleTimeUpdate}
          />
          <CaptionDisplay captions={captions} currentTime={currentTime} />
        </>
      )}
    </div>
  );
}

export default App;

