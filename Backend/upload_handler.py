import os
import logging
from pathlib import Path
from werkzeug.utils import secure_filename
import uuid
import json

logger = logging.getLogger(__name__)

# Upload configuration
UPLOAD_DIR = "./uploads"
TEMP_CHUNK_DIR = "./temp_chunks"
ALLOWED_VIDEO_EXTENSIONS = {'mp4', 'mov', 'avi', 'mkv', 'flv', 'wmv', 'webm', 'm4v', 'mpg', 'mpeg', '3gp'}
MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024  # 5GB

# Create directories if they don't exist
Path(UPLOAD_DIR).mkdir(exist_ok=True)
Path(TEMP_CHUNK_DIR).mkdir(exist_ok=True)

class UploadHandler:
    """Handles video file uploads with chunking support"""
    
    @staticmethod
    def validate_file_extension(filename):
        """Check if file extension is allowed"""
        logger.info(f"Validating filename: {filename}")
        
        if '.' not in filename:
            logger.error(f"No extension found in filename: {filename}")
            return False
        
        ext = filename.rsplit('.', 1)[1].lower()
        logger.info(f"File extension: {ext}")
        logger.info(f"Allowed extensions: {ALLOWED_VIDEO_EXTENSIONS}")
        
        is_valid = ext in ALLOWED_VIDEO_EXTENSIONS
        logger.info(f"Is valid: {is_valid}")
        
        return is_valid
    
    @staticmethod
    def handle_chunk_upload(file, chunk_index, total_chunks, session_id, filename=None):
        """
        Handle a single chunk upload
        
        Args:
            file: File object from request
            chunk_index: Current chunk number (0-indexed)
            total_chunks: Total number of chunks
            session_id: Unique session identifier for this upload
            filename: Original filename (from form data)
            
        Returns:
            Dictionary with upload status
        """
        try:
            # Validate file
            if not file or file.filename == '':
                logger.error("No file or empty filename")
                return {
                    'status': 'error',
                    'message': 'No file provided'
                }
            
            # Use provided filename if available, otherwise use file.filename
            actual_filename = filename if filename else file.filename
            logger.info(f"Actual filename to validate: {actual_filename}")
            
            if not UploadHandler.validate_file_extension(actual_filename):
                logger.error(f"Invalid file type: {actual_filename}")
                return {
                    'status': 'error',
                    'message': f'File type not allowed. Only video files are accepted. Got: {actual_filename}'
                }
            
            # Create session-specific temp directory
            session_dir = os.path.join(TEMP_CHUNK_DIR, session_id)
            Path(session_dir).mkdir(exist_ok=True)
            
            # Save chunk
            chunk_filename = f"chunk_{chunk_index:06d}"
            chunk_path = os.path.join(session_dir, chunk_filename)
            
            # Write chunk to file
            file.save(chunk_path)
            chunk_size = os.path.getsize(chunk_path)
            
            logger.info(f"Chunk {chunk_index + 1}/{total_chunks} uploaded ({chunk_size} bytes) - Session: {session_id}")
            
            # Check if all chunks are uploaded
            if chunk_index + 1 == total_chunks:
                # All chunks uploaded, merge them
                final_file = UploadHandler.merge_chunks(
                    session_id, 
                    total_chunks, 
                    actual_filename
                )
                
                if final_file:
                    return {
                        'status': 'success',
                        'message': 'File upload complete',
                        'file_path': final_file,
                        'chunks_processed': total_chunks
                    }
                else:
                    return {
                        'status': 'error',
                        'message': 'Failed to merge chunks'
                    }
            else:
                return {
                    'status': 'chunk_received',
                    'message': f'Chunk {chunk_index + 1}/{total_chunks} received',
                    'chunk_index': chunk_index
                }
        
        except Exception as e:
            logger.error(f"Error handling chunk upload: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(e)
            }
    
    @staticmethod
    def merge_chunks(session_id, total_chunks, original_filename):
        """
        Merge all chunks into a single file
        
        Args:
            session_id: Session identifier
            total_chunks: Total number of chunks
            original_filename: Original filename
            
        Returns:
            Path to final file or None if failed
        """
        try:
            session_dir = os.path.join(TEMP_CHUNK_DIR, session_id)
            
            # Generate final filename with unique ID
            unique_id = str(uuid.uuid4())[:8]
            file_ext = original_filename.rsplit('.', 1)[1].lower() if '.' in original_filename else 'mp4'
            final_filename = secure_filename(f"video_{unique_id}.{file_ext}")
            final_path = os.path.join(UPLOAD_DIR, final_filename)
            
            logger.info(f"Merging {total_chunks} chunks for session {session_id}")
            logger.info(f"Final file will be: {final_filename}")
            
            # Merge chunks
            with open(final_path, 'wb') as final_file:
                for chunk_index in range(total_chunks):
                    chunk_filename = f"chunk_{chunk_index:06d}"
                    chunk_path = os.path.join(session_dir, chunk_filename)
                    
                    if not os.path.exists(chunk_path):
                        logger.error(f"Missing chunk: {chunk_path}")
                        raise Exception(f"Chunk {chunk_index} is missing")
                    
                    # Append chunk to final file
                    with open(chunk_path, 'rb') as chunk_file:
                        final_file.write(chunk_file.read())
                    
                    # Clean up chunk file
                    os.remove(chunk_path)
            
            # Clean up session directory
            try:
                os.rmdir(session_dir)
            except:
                pass
            
            final_size = os.path.getsize(final_path)
            logger.info(f"File merge complete: {final_filename} ({final_size} bytes)")
            
            return final_path
        
        except Exception as e:
            logger.error(f"Error merging chunks: {str(e)}", exc_info=True)
            return None
    
    @staticmethod
    def cleanup_session(session_id):
        """Clean up temporary files for a session"""
        try:
            session_dir = os.path.join(TEMP_CHUNK_DIR, session_id)
            if os.path.exists(session_dir):
                for file in os.listdir(session_dir):
                    os.remove(os.path.join(session_dir, file))
                os.rmdir(session_dir)
                logger.info(f"Cleaned up session: {session_id}")
        except Exception as e:
            logger.error(f"Error cleaning up session {session_id}: {str(e)}")
    
    @staticmethod
    def get_upload_stats():
        """Get statistics about uploads"""
        try:
            upload_count = len(os.listdir(UPLOAD_DIR)) if os.path.exists(UPLOAD_DIR) else 0
            temp_sessions = len(os.listdir(TEMP_CHUNK_DIR)) if os.path.exists(TEMP_CHUNK_DIR) else 0
            
            return {
                'uploaded_files': upload_count,
                'active_uploads': temp_sessions
            }
        except Exception as e:
            logger.error(f"Error getting upload stats: {str(e)}")
            return {}
