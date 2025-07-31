#!/bin/bash

# Start the backend
echo "Starting Flask backend..."
cd ~/Development/Personal/SpotifyTranscripts
source venv/bin/activate
export FLASK_APP=backend
export FLASK_DEBUG=1
flask run &

# Store the backend process ID
BACKEND_PID=$!

# Wait a bit for backend to start
sleep 3

# Start the frontend
echo "Starting React frontend..."
cd ~/Development/Personal/SpotifyTranscripts/frontend
npm start

# When frontend is stopped, also stop backend
kill $BACKEND_PID
