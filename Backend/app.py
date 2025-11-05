from flask import Flask, render_template
from flask_socketio import SocketIO, emit, join_room, leave_room
from dotenv import load_dotenv
import os
import logging

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-here')

# Initialize Socket.IO with CORS enabled
socketio = SocketIO(app, cors_allowed_origins="*")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ==================== SOCKET.IO EVENTS ====================

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f'Client connected: {request.sid}')
    emit('connection_response', {'data': 'Connected to server'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f'Client disconnected: {request.sid}')

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """Handle incoming audio chunk from frontend"""
    logger.info(f'Received audio chunk: {len(data)} bytes')
    # We'll process this in the next step
    emit('chunk_received', {'status': 'success'}, broadcast=False)

@socketio.on('youtube_video')
def handle_youtube_video(data):
    """Handle YouTube video request"""
    logger.info(f'Received YouTube video request: {data}')
    # We'll process this in the next step
    emit('processing_started', {'status': 'processing youtube'}, broadcast=False)

# ==================== REGULAR ROUTES ====================

@app.route('/')
def index():
    return {"message": "Video Caption Backend Running"}

@app.route('/health')
def health():
    return {"status": "healthy"}

# ==================== MAIN ====================

if __name__ == '__main__':
    PORT = int(os.getenv('PORT', 8080))
    logger.info(f'Starting Flask-SocketIO server on port {PORT}')
    socketio.run(app, host='0.0.0.0', port=PORT, debug=True, allow_unsafe_werkzeug=True)
