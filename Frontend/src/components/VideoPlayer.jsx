// import React, { useRef } from 'react';
// import './VideoPlayer.css';

// const VideoPlayer = ({ videoSource, videoType, onTimeUpdate }) => {
//   const videoRef = useRef(null);

//   const handleTimeUpdate = () => {
//     if (videoRef.current) {
//     //   onTimeUpdate(videoRef.current.currentTime);
//     onTimeUpdate(videoRef.current.currentTime);

//     }
//   };

//   return (
//     <div className="video-player-container">
//       <div className="player-wrapper">
//         {videoType === 'file' ? (
//           <video
//             ref={videoRef}
//             className="video-element"
//             controls
//             width="100%"
//             height="auto"
//             onTimeUpdate={handleTimeUpdate}
//           >
//             <source src={videoSource} type="video/mp4" />
//             Your browser does not support the video tag.
//           </video>
//         ) : (
//           <div className="youtube-player">
//             <iframe
//               width="100%"
//               height="480"
//               src={`https://www.youtube.com/embed/${videoSource}`}
//               title="YouTube video player"
//               frameBorder="0"
//               allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
//               allowFullScreen
//             />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default VideoPlayer;
import React, { useRef } from 'react';

const VideoPlayer = ({ videoSource, videoType, onTimeUpdate }) => {
  const videoRef = useRef(null);

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime);
    }
  };

  return (
    <video
      ref={videoRef}
      src={videoSource}
      controls
      onTimeUpdate={handleTimeUpdate}
      width="100%"
    />
  );
};

export default VideoPlayer;
