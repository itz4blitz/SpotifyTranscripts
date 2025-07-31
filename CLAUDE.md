# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
Spotify Transcripts is an AI-powered podcast player that provides transcriptions, searchable subtitles, and auto-generated chapters for podcast episodes. The project combines React frontend with Python Flask backend to process audio and generate AI-powered insights.

**Key Features:**
- Speech-to-text transcription with timestamps using Google Speech Recognition API
- AI-generated chapter segmentation using OpenAI GPT-3.5
- Searchable transcript functionality
- Subtitle display synchronized with audio playback
- Spotify API integration for podcast discovery

**Architecture:** Full-stack application with React (TypeScript) frontend and Python Flask backend, using SQLite for data persistence.

## Development Commands

### Running the Application
```bash
# Start both frontend and backend (recommended)
./run.sh

# Or start individually:
# Backend (from root directory)
source venv/bin/activate
export FLASK_APP=backend
export FLASK_DEBUG=1
flask run

# Frontend (from frontend/ directory)
cd frontend
npm start
```

### Frontend Commands
```bash
cd frontend
npm start          # Start development server (port 3000)
npm run build      # Build for production
npm test           # Run tests
```

### Backend Commands
```bash
# Activate virtual environment first
source venv/bin/activate

# Set Flask environment variables
export FLASK_APP=backend
export FLASK_DEBUG=1

# Run Flask development server (port 5000)
flask run
```

### Dependencies
```bash
# Install Python dependencies
pip install -r requirements.txt

# Install frontend dependencies
cd frontend && npm install
```

## Environment Configuration

### Required API Keys (.env file in root)
```
REACT_APP_SPOTIFY_CLIENT_ID=your_spotify_client_id
REACT_APP_OPEN_AI_KEY=your_openai_api_key
```

## Architecture & Key Components

### Backend Structure (`backend/`)
- `__init__.py`: Flask app factory with SQLAlchemy and CORS setup
- `models.py`: SQLAlchemy model for Podcast table (stores URL and transcript)
- `views.py`: Main application logic including audio processing and transcription
  - `/podcasts`: Get all stored podcasts
  - `/get_podcast`: Transcribe audio from URL or return cached transcript

### Frontend Structure (`frontend/src/`)
- `App.js`: Main routing component with Spotify authentication checks
- `hooks/useAuth.js`: Spotify OAuth token management
- `pages/`: Main application pages (Home, Discover, Episode)
- `components/`: Reusable UI components for subtitles, chapters, search, etc.

### Audio Processing Pipeline (backend/views.py)
1. Downloads MP3 from Spotify preview URL
2. Converts MP3 to WAV format using pydub
3. Splits audio on silence (500ms+, <14dB threshold) to create sentence chunks
4. Processes each chunk through Google Speech Recognition API
5. Calculates timestamps using librosa duration analysis
6. Returns formatted transcript with startTime/endTime for each sentence

### Key Technologies
- **Frontend**: React 17, TypeScript, Tailwind CSS, React Router
- **Backend**: Flask, SQLAlchemy, SpeechRecognition, librosa, pydub
- **APIs**: Spotify Web API, Google Speech Recognition, OpenAI GPT-3.5
- **Database**: SQLite (database.db)

## Development Notes

### Current Issues
- Duplicate route definition in App.js:20-21 for `/episode`
- Limited to 30-second Spotify preview clips due to API restrictions

### File Locations
- Audio chunks stored temporarily in `backend/audio-chunks/`
- Database: `backend/database.db`
- Temporary audio files: `podcast.mp3`, `podcast.wav` (cleaned up after processing)

### Proxy Configuration
Frontend proxies API requests to Flask backend via `"proxy": "http://localhost:5000"` in package.json.