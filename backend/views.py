from flask import Blueprint, jsonify, request, Response
from . import db
from .models import Podcast
from .rss_finder import PodcastRSSFinder
import os 
import speech_recognition as sr 
import requests
import librosa
from pydub import AudioSegment
from pydub.silence import split_on_silence
import json
import time

main = Blueprint("main", __name__)

@main.route("/podcasts")
def podcasts():
    podcasts_list = Podcast.query.all()
    podcasts = []
    for podcast in podcasts_list:
        podcasts.append({"url": podcast.url, "transcript": podcast.transcript})
    return jsonify({"podcasts": podcasts})

@main.route("/get_podcast", methods=["GET"])
def get_podcast():
    url = request.args.get("url")
    podcast_list = Podcast.query.all()
    
    # Check if transcript already exists
    for podcast in podcast_list:
        if podcast.url == url:
            return podcast.transcript, 200
    
    try:
        transcript = transcribe_from_url(url)
        
        # Save to database
        new_podcast = Podcast(url=url, transcript=transcript)
        db.session.add(new_podcast)
        db.session.commit()
        
        return transcript, 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route("/get_podcast_progress", methods=["GET"])
def get_podcast_progress():
    url = request.args.get("url")
    
    # Check if transcript already exists
    podcast_list = Podcast.query.all()
    for podcast in podcast_list:
        if podcast.url == url:
            def generate():
                yield f"data: {json.dumps({'status': 'completed', 'transcript': podcast.transcript})}\n\n"
            return Response(generate(), mimetype='text/plain')
    
    def generate():
        try:
            for progress_data in transcribe_from_url_with_progress(url):
                yield f"data: {json.dumps(progress_data)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'status': 'error', 'error': str(e)})}\n\n"
    
    return Response(generate(), mimetype='text/plain')

@main.route("/search_podcast_rss", methods=["POST"])
def search_podcast_rss():
    """Search for podcast RSS feeds by name"""
    try:
        data = request.get_json()
        podcast_name = data.get('name', '').strip()
        
        if not podcast_name:
            return jsonify({"error": "Podcast name is required"}), 400
        
        finder = PodcastRSSFinder()
        results = finder.find_by_name(podcast_name)
        
        return jsonify({
            "results": results,
            "count": len(results)
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route("/validate_rss", methods=["POST"])
def validate_rss():
    """Validate an RSS feed and return episode info"""
    try:
        data = request.get_json()
        rss_url = data.get('rss_url', '').strip()
        
        if not rss_url:
            return jsonify({"error": "RSS URL is required"}), 400
        
        finder = PodcastRSSFinder()
        validation_result = finder.validate_feed(rss_url)
        
        return jsonify(validation_result), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@main.route("/get_episode_from_rss", methods=["POST"])
def get_episode_from_rss():
    """Get specific episode audio URL from RSS feed"""
    try:
        data = request.get_json()
        rss_url = data.get('rss_url', '').strip()
        episode_title = data.get('episode_title', '').strip()
        
        if not rss_url:
            return jsonify({"error": "RSS URL is required"}), 400
        
        finder = PodcastRSSFinder()
        episode_info = finder.get_episode_audio_url(rss_url, episode_title)
        
        if episode_info:
            return jsonify(episode_info), 200
        else:
            return jsonify({"error": "No episode found with audio"}), 404
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500


r = sr.Recognizer()

def transcribe_from_url(url):
    """Original transcription function without progress updates"""
    try:
        # Download audio
        downloaded_obj = requests.get(url, timeout=30)
        downloaded_obj.raise_for_status()
      
        with open("podcast.mp3", "wb") as file:
            file.write(downloaded_obj.content)
        
        # Convert to WAV
        AudioSegment.from_mp3("podcast.mp3").export("podcast.wav", format="wav")
     
        transcript = ""
        startTime = 0.000
        sound = AudioSegment.from_wav("podcast.wav") 
        chunks = split_on_silence(sound,
            min_silence_len = 500, 
            silence_thresh = sound.dBFS-14,
            keep_silence= 500,
        )

        folder_name = "backend/audio-chunks"
        if not os.path.isdir(folder_name):
            os.makedirs(folder_name, exist_ok=True)
        
        # Clean up any existing chunks
        for existing_file in os.listdir(folder_name):
            if existing_file.endswith('.wav'):
                try:
                    os.remove(os.path.join(folder_name, existing_file))
                except Exception as e:
                    print(f"Warning: Could not remove {existing_file}: {e}")

        for i, audio_chunk in enumerate(chunks, start=1):
            chunk_filename = os.path.join(folder_name, f"chunk{i}.wav")
            audio_chunk.export(chunk_filename, format="wav")
            
            with sr.AudioFile(chunk_filename) as source:
                audio_listened = r.record(source)
                try:
                    sentence = r.recognize_google(audio_listened)
                    sentence = f"{sentence.capitalize()}. "
                    duration = librosa.get_duration(filename=chunk_filename)
                    endTime = startTime + duration
                    transcript += "startTime: " + str(startTime) + ";endTime: " + str(endTime) + ";sentence: " + sentence
                    startTime += duration
                except sr.UnknownValueError:
                    # Skip chunks that couldn't be recognized
                    duration = librosa.get_duration(filename=chunk_filename)
                    startTime += duration
                except Exception as e:
                    print(f"Error processing chunk {i}: {str(e)}")
                    duration = librosa.get_duration(filename=chunk_filename)
                    startTime += duration
        
        return transcript
    
    finally:
        # Cleanup files
        try:
            if os.path.exists("podcast.mp3"):
                os.remove("podcast.mp3")
            if os.path.exists("podcast.wav"):
                os.remove("podcast.wav")
        except Exception as e:
            print(f"Cleanup error: {str(e)}")

def transcribe_from_url_with_progress(url):
    """Enhanced transcription function with progress updates"""
    try:
        yield {'status': 'downloading', 'progress': 0, 'message': 'Downloading audio file...'}
        
        # Download audio
        downloaded_obj = requests.get(url, timeout=30)
        downloaded_obj.raise_for_status()
      
        with open("podcast.mp3", "wb") as file:
            file.write(downloaded_obj.content)
        
        yield {'status': 'converting', 'progress': 10, 'message': 'Converting audio format...'}
        
        # Convert to WAV
        AudioSegment.from_mp3("podcast.mp3").export("podcast.wav", format="wav")
        
        yield {'status': 'analyzing', 'progress': 20, 'message': 'Analyzing audio structure...'}
     
        transcript = ""
        startTime = 0.000
        sound = AudioSegment.from_wav("podcast.wav") 
        chunks = split_on_silence(sound,
            min_silence_len = 500, 
            silence_thresh = sound.dBFS-14,
            keep_silence= 500,
        )

        folder_name = "backend/audio-chunks" 
        if not os.path.isdir(folder_name):
            os.makedirs(folder_name, exist_ok=True)
        
        # Clean up any existing chunks
        for existing_file in os.listdir(folder_name):
            if existing_file.endswith('.wav'):
                try:
                    os.remove(os.path.join(folder_name, existing_file))
                except Exception as e:
                    print(f"Warning: Could not remove {existing_file}: {e}")

        total_chunks = len(chunks)
        yield {'status': 'transcribing', 'progress': 30, 'message': f'Found {total_chunks} audio segments. Starting transcription...'}

        for i, audio_chunk in enumerate(chunks, start=1):
            chunk_filename = os.path.join(folder_name, f"chunk{i}.wav")
            
            try:
                audio_chunk.export(chunk_filename, format="wav")
                
                # Calculate progress (30% to 90% for transcription)
                progress = 30 + int((i / total_chunks) * 60)
                yield {'status': 'transcribing', 'progress': progress, 'message': f'Processing segment {i} of {total_chunks}...'}
                
                with sr.AudioFile(chunk_filename) as source:
                    audio_listened = r.record(source)
                    try:
                        sentence = r.recognize_google(audio_listened, timeout=10)
                        sentence = f"{sentence.capitalize()}. "
                        duration = librosa.get_duration(filename=chunk_filename)
                        endTime = startTime + duration
                        transcript += "startTime: " + str(startTime) + ";endTime: " + str(endTime) + ";sentence: " + sentence
                        startTime += duration
                    except sr.UnknownValueError:
                        # Skip chunks that couldn't be recognized
                        duration = librosa.get_duration(filename=chunk_filename)
                        startTime += duration
                    except Exception as e:
                        print(f"Error processing chunk {i}: {str(e)}")
                        try:
                            duration = librosa.get_duration(filename=chunk_filename)
                            startTime += duration
                        except Exception as duration_error:
                            print(f"Could not get duration for chunk {i}: {duration_error}")
                            startTime += 1.0  # Fallback duration
                            
                # Clean up chunk file immediately after processing
                try:
                    os.remove(chunk_filename)
                except Exception as cleanup_error:
                    print(f"Warning: Could not remove chunk file {chunk_filename}: {cleanup_error}")
                    
            except Exception as chunk_error:
                print(f"Error processing audio chunk {i}: {chunk_error}")
                startTime += 1.0  # Skip this chunk with fallback duration
        
        yield {'status': 'saving', 'progress': 95, 'message': 'Saving transcript to database...'}
        
        # Save to database
        new_podcast = Podcast(url=url, transcript=transcript)
        db.session.add(new_podcast)
        db.session.commit()
        
        yield {'status': 'completed', 'progress': 100, 'message': 'Transcription completed!', 'transcript': transcript}
    
    except Exception as e:
        yield {'status': 'error', 'error': str(e)}
    
    finally:
        # Cleanup files
        try:
            if os.path.exists("podcast.mp3"):
                os.remove("podcast.mp3")
            if os.path.exists("podcast.wav"):
                os.remove("podcast.wav")
        except Exception as e:
            print(f"Cleanup error: {str(e)}")