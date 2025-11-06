from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
from audio_processor import AudioProcessor
from stt_service import SarvamSTTService
from upload_handler import UploadHandler

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024 * 1024  # 5GB max

# Initialize CORS
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Initialize Socket.IO
socketio = SocketIO(
    app, 
    cors_allowed_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "http://127.0.0.1:3000"],
    async_mode='eventlet'
)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize STT Service
try:
    stt_service = SarvamSTTService()
    logger.info("Sarvam STT service initialized successfully")
except Exception as e:
    logger.error(f"Failed to initialize STT service: {str(e)}")
    stt_service = None

# ==================== SOCKET.IO EVENTS ====================

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f'Client connected: {request.sid}')
    emit('connection_response', {
        'data': 'Connected to Sarvam AI Caption Server',
        'stt_ready': stt_service is not None
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f'Client disconnected: {request.sid}')

@socketio.on('youtube_video')
def handle_youtube_video(data):
    """Handle YouTube video request"""
    try:
        youtube_url = data.get('videoId')
        language = data.get('language', 'hi')
        
        logger.info(f'Processing YouTube video: {youtube_url}')
        emit('status', {'message': 'Downloading YouTube audio...'}, broadcast=False)
        
        # Extract audio from YouTube
        audio_file = AudioProcessor.extract_audio_from_youtube(youtube_url)
        emit('status', {'message': 'Audio extracted, starting transcription...'}, broadcast=False)
        
        # Get language code
        lang_code = stt_service.LANGUAGE_CODES.get(language, 'en-IN')
        
        # Transcribe audio
        result = stt_service.transcribe_audio(audio_file, 'en-IN')
        
        if result['status'] == 'success':
            # Send captions to frontend
            for caption in result['captions']:
                emit('caption', caption, broadcast=False)
            
            emit('transcription_complete', {
                'status': 'success',
                'total_captions': len(result['captions']),
                'language': language
            }, broadcast=False)
        else:
            emit('error', {'message': result['message']}, broadcast=False)
        
        # Cleanup
        AudioProcessor.cleanup_temp_file(audio_file)
    
    except Exception as e:
        logger.error(f'Error processing YouTube video: {str(e)}')
        emit('error', {'message': f'YouTube processing error: {str(e)}'}, broadcast=False)

@socketio.on('get_languages')
def handle_get_languages():
    """Return supported languages"""
    languages = stt_service.get_supported_languages()
    emit('supported_languages', {'languages': languages}, broadcast=False)

# ==================== HTTP FILE UPLOAD ENDPOINT ====================

@app.route('/upload', methods=['POST', 'OPTIONS'])
def upload_chunk():
    """Handle chunked file upload via HTTP"""
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        logger.info(f"Upload request received")
        logger.info(f"Files in request: {list(request.files.keys())}")
        logger.info(f"Form data: {list(request.form.keys())}")
        
        # Get upload parameters
        chunk_index = request.form.get('chunk_index')
        total_chunks = request.form.get('total_chunks')
        session_id = request.form.get('session_id')
        filename = request.form.get('filename')
        language = request.form.get('language', 'hi')
        
        logger.info(f"Parameters - chunk_index: {chunk_index}, total_chunks: {total_chunks}, session_id: {session_id}, filename: {filename}")
        
        # Validate parameters
        if not chunk_index or not total_chunks or not session_id or not filename:
            logger.error(f"Missing parameters")
            return jsonify({
                'status': 'error',
                'message': 'Missing required fields: chunk_index, total_chunks, session_id, filename'
            }), 400
        
        # Convert to integers
        try:
            chunk_index = int(chunk_index)
            total_chunks = int(total_chunks)
        except ValueError as e:
            logger.error(f"Invalid integer values: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'chunk_index and total_chunks must be integers'
            }), 400
        
        # Check if file is in request
        if 'file' not in request.files:
            logger.error("No file in request")
            return jsonify({
                'status': 'error',
                'message': 'No file in request'
            }), 400
        
        file = request.files['file']
        
        if file.filename == '':
            logger.error("Empty filename")
            return jsonify({
                'status': 'error',
                'message': 'No file selected'
            }), 400
        
        logger.info(f"File received: {file.filename}, MIME type: {file.content_type}")
        
        # Handle chunk upload
        result = UploadHandler.handle_chunk_upload(
            file,
            chunk_index,
            total_chunks,
            session_id,
            filename
        )
        
        logger.info(f"Chunk upload result: {result['status']}")
        
        # If all chunks received, process the video
        if result['status'] == 'success':
            logger.info("All chunks received, starting background processing")
            socketio.start_background_task(
                process_uploaded_video,
                result['file_path'],
                language,
                session_id
            )
            
            return jsonify({
                'status': 'success',
                'message': 'File upload complete, processing started',
                'file_path': result['file_path']
            }), 200
        
        elif result['status'] == 'chunk_received':
            return jsonify({
                'status': 'chunk_received',
                'message': result['message'],
                'chunk_index': result['chunk_index']
            }), 200
        
        else:
            return jsonify(result), 400
    
    except Exception as e:
        logger.error(f'Error handling upload: {str(e)}', exc_info=True)
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500
    
def process_uploaded_video(file_path, language, session_id):
    """Background task to process uploaded video"""
    try:
        logger.info(f"Starting video processing for session {session_id}")

        # Extract audio from the video file
        audio_file = AudioProcessor.extract_audio_from_file(file_path)

        # Get language code mapping, default to Hindi if missing
        target_lang_code = stt_service.LANGUAGE_CODES.get(language, 'hi-IN')

        # 1. Transcribe audio to English always
        asr_result = stt_service.transcribe_audio(audio_file, 'en-IN')

        if asr_result['status'] != 'success':
            logger.error(f"Transcription failed: {asr_result.get('message', 'STT failed')}")
            socketio.emit('error', {'message': asr_result.get('message', 'STT failed')}, namespace='/')
            return

        # 2. Translate each caption if requested language is non-English
        if language != 'en':
            translated_captions = []
            for cap in asr_result['captions']:
                translated = stt_service.translate_text(cap['text'], target_lang_code, 'en-IN')
                caption_obj = {
                    'text': translated,
                    'start_time': cap['start_time'],
                    'end_time': cap['end_time'],
                    'confidence': cap.get('confidence', 0.0)
                }
                translated_captions.append(caption_obj)
                # 3. Emit each caption as soon as it's ready for real-time frontend update
                socketio.emit('caption', caption_obj, namespace='/')
        else:
            translated_captions = asr_result['captions']
            for cap in translated_captions:
                socketio.emit('caption', cap, namespace='/')

        # Notify frontend transcription complete
        socketio.emit('transcription_complete', {
            'status': 'success',
            'message': f'Processed {len(translated_captions)} captions in {language}',
            'total_captions': len(translated_captions),
            'language': language
        }, namespace='/')

        # Cleanup temporary files
        AudioProcessor.cleanup_temp_file(audio_file)
        AudioProcessor.cleanup_temp_file(file_path)

    except Exception as e:
        logger.error(f"Error in background processing: {str(e)}", exc_info=True)
        socketio.emit('error', {'message': str(e)}, namespace='/')






# ==================== REGULAR ROUTES ====================

@app.route('/')
def index():
    return jsonify({
        "message": "Video Caption Backend Running",
        "service": "Sarvam AI",
        "status": "healthy" if stt_service else "error",
        "cors": "enabled"
    })

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "stt_service": "active" if stt_service else "inactive",
        "service_name": "Sarvam AI",
        "uploads": UploadHandler.get_upload_stats()
    })

# ==================== ERROR HANDLERS ====================

@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'status': 'error',
        'message': 'File too large. Maximum file size is 5GB.'
    }), 413

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'status': 'error',
        'message': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {error}")
    return jsonify({
        'status': 'error',
        'message': 'Internal server error'
    }), 500

# ==================== MAIN ====================

if __name__ == '__main__':
    if not stt_service:
        logger.error("Failed to start: STT service not initialized. Check your SARVAM_API_KEY")
        exit(1)
    
    PORT = int(os.getenv('PORT', 8080))
    logger.info(f'Starting Flask-SocketIO server with Sarvam AI on port {PORT}')
    logger.info('CORS enabled for: http://localhost:5173, http://localhost:3000')
    
    socketio.run(
        app, 
        host='0.0.0.0', 
        port=PORT, 
        debug=False,
        use_reloader=False,
        allow_unsafe_werkzeug=True
    )
