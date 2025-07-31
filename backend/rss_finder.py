import requests
import feedparser
import json
from urllib.parse import quote

class PodcastRSSFinder:
    def __init__(self):
        self.itunes_search_url = "https://itunes.apple.com/search"
    
    def find_by_name(self, podcast_name):
        """Find RSS feed by podcast name using iTunes API"""
        try:
            params = {
                'term': podcast_name,
                'media': 'podcast',
                'limit': 10
            }
            
            response = requests.get(self.itunes_search_url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            results = []
            for result in data.get('results', []):
                rss_url = result.get('feedUrl')
                if rss_url:
                    results.append({
                        'name': result.get('collectionName'),
                        'rss_url': rss_url,
                        'artwork': result.get('artworkUrl600'),
                        'description': result.get('description', ''),
                        'artist': result.get('artistName', ''),
                        'episode_count': result.get('trackCount', 0)
                    })
            
            return results
        except Exception as e:
            print(f"Error searching iTunes: {str(e)}")
            return []
    
    def validate_feed(self, rss_url):
        """Validate RSS feed and return episode info"""
        try:
            # First check if URL is accessible
            response = requests.get(rss_url, timeout=15)
            response.raise_for_status()
            
            # Parse RSS feed
            feed = feedparser.parse(rss_url)
            
            # Check if feed is valid and has episodes
            if not feed.entries:
                return {
                    'valid': False, 
                    'error': 'No episodes found in RSS feed'
                }
            
            # Get episodes with audio files
            episodes_with_audio = []
            for entry in feed.entries[:10]:  # Check first 10 episodes
                if hasattr(entry, 'enclosures') and entry.enclosures:
                    for enclosure in entry.enclosures:
                        if 'audio' in enclosure.get('type', ''):
                            episodes_with_audio.append({
                                'title': entry.get('title', 'Unknown'),
                                'audio_url': enclosure.get('href'),
                                'duration': entry.get('itunes_duration', 'Unknown'),
                                'published': entry.get('published', 'Unknown')
                            })
                            break
            
            return {
                'valid': True,
                'podcast_title': feed.feed.get('title', ''),
                'description': feed.feed.get('description', ''),
                'total_episodes': len(feed.entries),
                'episodes_with_audio': len(episodes_with_audio),
                'sample_episodes': episodes_with_audio[:5],
                'rss_url': rss_url
            }
            
        except Exception as e:
            return {
                'valid': False,
                'error': f'Error validating RSS feed: {str(e)}'
            }
    
    def get_episode_audio_url(self, rss_url, episode_title=None):
        """Get direct audio URL for a specific episode"""
        try:
            feed = feedparser.parse(rss_url)
            
            for entry in feed.entries:
                # If specific episode requested, match by title
                if episode_title and episode_title.lower() not in entry.get('title', '').lower():
                    continue
                
                # Find audio enclosure
                if hasattr(entry, 'enclosures') and entry.enclosures:
                    for enclosure in entry.enclosures:
                        if 'audio' in enclosure.get('type', ''):
                            return {
                                'title': entry.get('title'),
                                'audio_url': enclosure.get('href'),
                                'duration': entry.get('itunes_duration'),
                                'published': entry.get('published'),
                                'description': entry.get('summary', '')
                            }
                
                # If no specific episode requested, return first one found
                if not episode_title:
                    break
            
            return None
            
        except Exception as e:
            print(f"Error getting episode audio URL: {str(e)}")
            return None