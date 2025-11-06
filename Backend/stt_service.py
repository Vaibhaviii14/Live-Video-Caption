import os
import logging
import requests
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

class SarvamSTTService:
    """Handles speech-to-text conversion using Sarvam AI"""
    
    # Language code mappings for Indian languages
    LANGUAGE_CODES = {
        'hi': 'hi-IN',      # Hindi
        'en': 'en-IN',      # English (India)
        'ta': 'ta-IN',      # Tamil
        'te': 'te-IN',      # Telugu
        'kn': 'kn-IN',      # Kannada
        'ml': 'ml-IN',      # Malayalam
        'bn': 'bn-IN',      # Bengali
        'gu': 'gu-IN',      # Gujarati
        'mr': 'mr-IN',      # Marathi
        'pa': 'pa-IN',      # Punjabi
        'od': 'od-IN',      # Odia
    }
    
    # Sarvam API endpoints
    SPEECH_TO_TEXT_URL = "https://api.sarvam.ai/speech-to-text"
    TRANSLATE_URL = "https://api.sarvam.ai/translate"
    
    def __init__(self):
        """Initialize Sarvam AI service"""
        self.api_key = os.getenv('SARVAM_API_KEY')
        
        if not self.api_key:
            raise ValueError("SARVAM_API_KEY not found in environment variables. "
                           "Get your API key from https://dashboard.sarvam.ai")
        
        self.headers = {
            'api-subscription-key': self.api_key,
            'Accept': 'application/json'
        }
        
        logger.info("Sarvam AI STT Service initialized")

    
    def transcribe_audio(self, audio_file_path, language_code='en-IN'):
        """Transcribe audio file to text
            
            Args:
                audio_file_path: Path to audio file (WAV, MP3, FLAC, OGG)
                language_code: Language code (e.g., 'hi-IN' for Hindi)
                
            Returns:
                Dictionary with transcription and confidence"""
        try:
            logger.info(f"Transcribing audio: {audio_file_path} with language: {language_code}")
            
            # Check if file exists
            if not os.path.exists(audio_file_path):
                logger.error(f"Audio file not found: {audio_file_path}")
                return {
                    'status': 'error',
                    'message': f'Audio file not found: {audio_file_path}'
                }
            
            file_size = os.path.getsize(audio_file_path)
            logger.info(f"Audio file size: {file_size} bytes")
            
            # Get file extension
            file_ext = audio_file_path.lower().split('.')[-1]
            logger.info(f"Audio file extension: {file_ext}")
            
            # Map extension to MIME type
            mime_types = {
                'wav': 'audio/wav',
                'mp3': 'audio/mpeg',
                'flac': 'audio/flac',
                'ogg': 'audio/ogg',
                'aac': 'audio/aac',
                'm4a': 'audio/x-m4a',
                'webm': 'audio/webm'
            }
            
            mime_type = mime_types.get(file_ext, 'audio/wav')
            logger.info(f"MIME type: {mime_type}")
            
            # Prepare file for upload
            with open(audio_file_path, 'rb') as audio_file:
                files = {
                    'file': (os.path.basename(audio_file_path), audio_file, mime_type)
                }
                
                data = {
                    'language_code': language_code,
                    'model': 'saarika:v2'
                }
                
                logger.info(f"Sending request to Sarvam API")
                logger.info(f"Language: {language_code}")
                
                # Make request to Sarvam API
                response = requests.post(
                    self.SPEECH_TO_TEXT_URL,
                    headers=self.headers,
                    files=files,
                    data=data,
                    timeout=300
                )
            
            logger.info(f"Sarvam API response status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Sarvam API error: {response.text}")
                return {
                    'status': 'error',
                    'message': f"API error: {response.status_code}"
                }
            
            result = response.json()
            logger.info(f"Sarvam API response: {result}")
            
            # Extract transcript
            transcript = result.get('transcript', '')
            confidence = result.get('confidence', 0.0)
            
            # Parse timestamps if available
            captions = self._parse_timestamps(result, language_code)
            
            logger.info(f"Transcription successful. Captions: {len(captions)}, Confidence: {confidence:.2f}")
            
            return {
                'status': 'success',
                'text': transcript,
                'confidence': confidence,
                'captions': captions,
                'language': language_code,
                'raw_response': result
            }
            
        except requests.exceptions.Timeout:
            logger.error("Sarvam API request timed out")
            return {
                'status': 'error',
                'message': 'Transcription timed out'
            }
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(e)
            }

    def translate_text(self, text, target_language='en-IN', source_language='en-IN'):
        """
        Translate text using Sarvam Translate API
        
        Args:
            text: Text to translate
            target_language: Target language code
            source_language: Source language code (default: English)
            
        Returns:
            Translated text
        """
        try:
            if not text or text.strip() == '':
                return text
            
            logger.info(f"Translating text from {source_language} to {target_language}")
            logger.info(f"Original text: {text[:100]}...")
            
            payload = {
                'input': text,
                'source_language_code': source_language,
                'target_language_code': target_language,
                'model': 'mayura:v1',
                'mode': 'formal'
            }
            
            response = requests.post(
                self.TRANSLATE_URL,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            logger.info(f"Translation API response status: {response.status_code}")
            
            if response.status_code != 200:
                logger.error(f"Sarvam Translation API error: {response.text}")
                return text  # Return original if translation fails
            
            result = response.json()
            translated_text = result.get('translated_text', text)
            
            logger.info(f"Translated text: {translated_text[:100]}...")
            return translated_text
            
        except Exception as e:
            logger.error(f"Error translating text: {str(e)}", exc_info=True)
            return text  # Return original if translation fails

    def transcribe_audio_with_translation(self, audio_file_path, language_code='en-IN'):
        """
        Transcribe audio and automatically translate to target language
        
        Args:
            audio_file_path: Path to audio file
            language_code: Target language code
            
        Returns:
            Dictionary with transcription, translation, and captions
        """
        try:
            logger.info(f"Transcribing and translating audio to: {language_code}")
            
            # First transcribe in English
            result = self.transcribe_audio(audio_file_path, 'en-IN')
            
            if result['status'] != 'success':
                return result
            
            # Extract English text
            english_text = result.get('text', '')
            
            # Translate to target language if not English
            if language_code != 'en-IN':
                logger.info(f"Translating English text to {language_code}")
                translated_text = self.translate_text(english_text, language_code, 'en-IN')
                
                # Re-parse captions with translated text
                translated_captions = []
                english_captions = result.get('captions', [])
                
                # For now, apply translation to each caption
                for caption in english_captions:
                    translated_caption_text = self.translate_text(caption['text'], language_code, 'en-IN')
                    translated_captions.append({
                        'text': translated_caption_text,
                        'start_time': caption['start_time'],
                        'end_time': caption['end_time'],
                        'confidence': caption.get('confidence', 0)
                    })
                
                result['text'] = translated_text
                result['captions'] = translated_captions
                result['translated_to'] = language_code
                
            return result
            
        except Exception as e:
            logger.error(f"Error in transcribe_audio_with_translation: {str(e)}", exc_info=True)
            return {
                'status': 'error',
                'message': str(e)
            }

    
    def translate_text(self, text, target_language='en-IN', source_language='en-IN'):
        """
        Translate text using Sarvam Translate API
        
        Args:
            text: Text to translate
            target_language: Target language code
            source_language: Source language code (default: English)
            
        Returns:
            Translated text
        """
        try:
            logger.info(f"Translating text from {source_language} to {target_language}")
            logger.info(f"Text to translate (first 60 chars): {text[:60]}")
            
            payload = {
                'input': text,
                'source_language_code': source_language,
                'target_language_code': target_language,
                'model': 'mayura:v1',
                'mode': 'formal'
            }
            
            response = requests.post(
                self.TRANSLATE_URL,
                headers=self.headers,
                json=payload,
                timeout=30
            )
            
            if response.status_code != 200:
                logger.error(f"Sarvam Translation API error: {response.text}")
                return text  # Return original if translation fails
            
            result = response.json()
            translated_text = result.get('translated_text', text)
            
            logger.info("Translation successful")
            logger.info(f"Translated text (first 60 chars): {translated_text[:60]}")
            return translated_text
            
        except Exception as e:
            logger.error(f"Error translating text: {str(e)}")
            return text  # Return original if translation fails

    
    @staticmethod
    def _parse_timestamps(api_response, language_code):
        captions = []
        try:
            if 'timestamps' in api_response:
                timestamps = api_response['timestamps']
                words_per_caption = 8
                current_caption = []
                for ts_item in timestamps:
                    current_caption.append(ts_item)
                    if len(current_caption) >= words_per_caption:
                        caption = {
                            'text': ' '.join([item.get('word', '') for item in current_caption]),
                            'start_time': current_caption[0].get('start_time', 0) / 1000.0,  # convert ms to s
                            'end_time': current_caption[-1].get('end_time', 0) / 1000.0,     # convert ms to s
                            'confidence': sum([item.get('confidence', 0) for item in current_caption]) / len(current_caption)
                        }
                        captions.append(caption)
                        current_caption = []
                if current_caption:
                    caption = {
                        'text': ' '.join([item.get('word', '') for item in current_caption]),
                        'start_time': current_caption[0].get('start_time', 0) / 1000.0,
                        'end_time': current_caption[-1].get('end_time', 0) / 1000.0,
                        'confidence': sum([item.get('confidence', 0) for item in current_caption]) / len(current_caption)
                    }
                    captions.append(caption)
            else:
                transcript = api_response.get('transcript', '')
                if transcript:
                    captions.append({
                        'text': transcript,
                        'start_time': 0,
                        'end_time': 0,
                        'confidence': api_response.get('confidence', 0)
                    })
        except Exception as e:
            logger.error(f"Error parsing timestamps: {str(e)}")
        return captions

    
    def get_supported_languages(self):
        """Return list of supported Indian languages"""
        return self.LANGUAGE_CODES
