import os
import subprocess
import logging
from pathlib import Path
import yt_dlp
import uuid

logger = logging.getLogger(__name__)

# Create temp directory if it doesn't exist
TEMP_DIR = "./temp_audio"
Path(TEMP_DIR).mkdir(exist_ok=True)

class AudioProcessor:
    """Handles audio extraction from videos and YouTube"""
    
    @staticmethod
    def extract_audio_from_file(video_file_path, output_format="wav"):
        """
        Extract audio from an uploaded video file using FFmpeg
        
        Args:
            video_file_path: Path to the video file
            output_format: Output audio format (wav, mp3, etc.)
            
        Returns:
            Path to extracted audio file
        """
        try:
            # Generate unique output filename
            unique_id = str(uuid.uuid4())[:8]
            output_file = os.path.join(TEMP_DIR, f"audio_{unique_id}.{output_format}")
            
            # FFmpeg command to extract audio
            command = [
                'ffmpeg',
                '-i', video_file_path,           # Input video
                '-vn',                           # No video
                '-acodec', 'pcm_s16le',          # Audio codec (better for STT)
                '-ar', '16000',                  # Sample rate (16kHz for STT - optimal)
                '-ac', '1',                      # Mono audio (1 channel)
                '-y',                            # Overwrite output
                output_file
            ]
            
            logger.info(f"Extracting audio from: {video_file_path}")
            logger.info(f"Output: {output_file}")
            
            # Run FFmpeg
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"FFmpeg error: {result.stderr}")
                raise Exception(f"FFmpeg failed: {result.stderr}")
            
            # Verify output file exists and has content
            if not os.path.exists(output_file):
                raise Exception(f"Output file not created: {output_file}")
            
            file_size = os.path.getsize(output_file)
            if file_size == 0:
                raise Exception("Output audio file is empty")
            
            logger.info(f"Audio extracted successfully: {output_file} ({file_size} bytes)")
            return output_file
            
        except subprocess.TimeoutExpired:
            logger.error("FFmpeg extraction timed out")
            raise Exception("Audio extraction timed out")
        except Exception as e:
            logger.error(f"Error extracting audio: {str(e)}")
            raise


    @staticmethod
    def extract_audio_from_youtube(youtube_url, output_format="wav"):
        """
        Extract audio from a YouTube video
        
        Args:
            youtube_url: YouTube video URL or video ID
            output_format: Output audio format
            
        Returns:
            Path to extracted audio file
        """
        try:
            # Generate unique output filename
            unique_id = str(uuid.uuid4())[:8]
            output_template = os.path.join(TEMP_DIR, f"youtube_{unique_id}.%(ext)s")
            
            # yt-dlp options
            ydl_opts = {
                'format': 'bestaudio/best',
                'postprocessors': [{
                    'key': 'FFmpegExtractAudio',
                    'preferredcodec': 'wav' if output_format == 'wav' else 'mp3',
                    'preferredquality': '192',
                }],
                'outtmpl': output_template,
                'quiet': False,
                'no_warnings': False,
            }
            
            logger.info(f"Downloading and extracting audio from YouTube: {youtube_url}")
            
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(youtube_url, download=True)
                filename = ydl.prepare_filename(info)
                base_filename = os.path.splitext(filename)[0]
                output_file = f"{base_filename}.{output_format}"
            
            logger.info(f"YouTube audio extracted: {output_file}")
            return output_file
            
        except Exception as e:
            logger.error(f"Error extracting YouTube audio: {str(e)}")
            raise

    @staticmethod
    def get_audio_duration(audio_file_path):
        """
        Get the duration of an audio file in seconds
        
        Args:
            audio_file_path: Path to audio file
            
        Returns:
            Duration in seconds (float)
        """
        try:
            command = [
                'ffprobe',
                '-v', 'error',
                '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1:noprint_wrappers=1',
                audio_file_path
            ]
            
            result = subprocess.run(
                command,
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if result.returncode != 0:
                logger.error(f"ffprobe error: {result.stderr}")
                raise Exception(f"ffprobe failed: {result.stderr}")
            
            duration = float(result.stdout.strip())
            logger.info(f"Audio duration: {duration} seconds")
            return duration
            
        except Exception as e:
            logger.error(f"Error getting audio duration: {str(e)}")
            raise

    @staticmethod
    def cleanup_temp_file(file_path):
        """
        Delete a temporary file
        
        Args:
            file_path: Path to file to delete
        """
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
                logger.info(f"Cleaned up temp file: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up file: {str(e)}")
