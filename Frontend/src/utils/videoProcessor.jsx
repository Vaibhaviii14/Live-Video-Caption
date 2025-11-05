// Utility to process video file in chunks and extract audio
export const processVideoChunks = async (videoSource, language, onChunkReady) => {
  try {
    // Fetch the video file
    const response = await fetch(videoSource);
    const blob = await response.blob();
    
    // Create audio context for processing
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Read file and extract audio
    const arrayBuffer = await blob.arrayBuffer();
    
    // Process in chunks (e.g., 5-second chunks for low latency)
    const chunkSize = 1024 * 1024; // 1MB chunks
    const totalChunks = Math.ceil(arrayBuffer.byteLength / chunkSize);
    
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, arrayBuffer.byteLength);
      const chunk = arrayBuffer.slice(start, end);
      
      // Convert to base64 for transmission
      const base64Chunk = arrayBufferToBase64(chunk);
      
      // Calculate approximate timestamp based on chunk position
      const timestamp = (i / totalChunks) * 100; // Approximate
      
      // Send chunk to callback
      await onChunkReady(base64Chunk, timestamp);
      
      // Small delay to prevent overwhelming the backend
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('Video processing complete');
  } catch (error) {
    console.error('Error processing video:', error);
    throw error;
  }
};

// Helper function to convert ArrayBuffer to Base64
const arrayBufferToBase64 = (buffer) => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

// Extract audio from video using MediaSource API
export const extractAudioFromVideo = async (videoFile) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    video.src = URL.createObjectURL(videoFile);
    
    video.addEventListener('loadedmetadata', async () => {
      try {
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        
        resolve(destination.stream);
      } catch (error) {
        reject(error);
      }
    });
    
    video.addEventListener('error', (error) => {
      reject(error);
    });
  });
};
