import subprocess
import sys

# Test if FFmpeg is available
try:
    result = subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True)
    print("✓ FFmpeg is installed!")
    print(result.stdout[:200])
except FileNotFoundError:
    print("✗ FFmpeg not found. Please install it first.")
    sys.exit(1)
