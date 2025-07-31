import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function RSSDiscover() {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const searchPodcasts = async () => {
    if (!searchTerm.trim()) return;
    
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch("/search_podcast_rss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: searchTerm }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSearchResults(data.results || []);
        if (data.results.length === 0) {
          setError("No podcasts found. Try a different search term.");
        }
      } else {
        setError(data.error || "Search failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const selectPodcast = async (podcast) => {
    setSelectedPodcast(podcast);
    setLoading(true);
    setError("");
    
    try {
      const response = await fetch("/validate_rss", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rss_url: podcast.rss_url }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.valid) {
        setEpisodes(data.sample_episodes || []);
      } else {
        setError(data.error || "Failed to load episodes");
        setEpisodes([]);
      }
    } catch (err) {
      setError("Failed to load episodes");
      setEpisodes([]);
    } finally {
      setLoading(false);
    }
  };

  const selectEpisode = (episode) => {
    // Navigate to Episode page with RSS episode data
    navigate("/episode", {
      state: {
        audio_preview_url: episode.audio_url,
        name: episode.title,
        description: episode.description || "Full episode from RSS feed",
        images: selectedPodcast.artwork ? [{ url: selectedPodcast.artwork }] : [],
        duration_ms: 1800000, // Default to 30 minutes, will be calculated during transcription
        isRSSEpisode: true,
        podcast_name: selectedPodcast.name
      }
    });
  };

  return (
    <div className="bg-spotifyDarkGray min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            Discover Full Podcast Episodes
          </h1>
          <p className="text-gray-300 text-lg">
            Search for podcasts and transcribe complete episodes (not just 30-second previews)
          </p>
        </div>

        {/* Search Bar */}
        <div className="bg-spotifyBlack rounded-lg p-6 mb-8">
          <div className="flex gap-4">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchPodcasts()}
              placeholder="Search for podcasts (e.g., 'This American Life', 'Serial', 'Conan O'Brien')"
              className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-spotifyLightGreen focus:outline-none"
            />
            <button
              onClick={searchPodcasts}
              disabled={loading || !searchTerm.trim()}
              className="bg-spotifyLightGreen text-black px-6 py-3 rounded-lg font-semibold hover:bg-green-400 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900 border border-red-600 text-red-200 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && !selectedPodcast && (
          <div className="bg-spotifyBlack rounded-lg p-6 mb-8">
            <h2 className="text-2xl font-bold text-white mb-4">Podcasts Found</h2>
            <div className="space-y-4">
              {searchResults.map((podcast, index) => (
                <div
                  key={index}
                  onClick={() => selectPodcast(podcast)}
                  className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                >
                  {podcast.artwork && (
                    <img
                      src={podcast.artwork}
                      alt={podcast.name}
                      className="w-16 h-16 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg">{podcast.name}</h3>
                    <p className="text-gray-300 text-sm">{podcast.artist}</p>
                    <p className="text-gray-400 text-sm">
                      {podcast.episode_count} episodes available
                    </p>
                  </div>
                  <div className="text-spotifyLightGreen">
                    →
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Episodes List */}
        {selectedPodcast && (
          <div className="bg-spotifyBlack rounded-lg p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => {
                  setSelectedPodcast(null);
                  setEpisodes([]);
                }}
                className="text-spotifyLightGreen hover:text-green-400"
              >
                ← Back to search
              </button>
              <div>
                <h2 className="text-2xl font-bold text-white">{selectedPodcast.name}</h2>
                <p className="text-gray-300">{selectedPodcast.artist}</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="text-white">Loading episodes...</div>
              </div>
            ) : episodes.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-xl font-semibold text-white mb-4">Recent Episodes</h3>
                {episodes.map((episode, index) => (
                  <div
                    key={index}
                    onClick={() => selectEpisode(episode)}
                    className="p-4 bg-gray-800 rounded-lg hover:bg-gray-700 cursor-pointer transition-colors"
                  >
                    <h4 className="text-white font-semibold mb-2">{episode.title}</h4>
                    <div className="flex gap-4 text-sm text-gray-400">
                      <span>Duration: {episode.duration || "Unknown"}</span>
                      <span>Published: {episode.published || "Unknown"}</span>
                    </div>
                    <div className="mt-2 text-spotifyLightGreen text-sm">
                      Click to transcribe full episode →
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                No episodes found with audio files.
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>This searches Apple Podcasts database for RSS feeds containing full episodes.</p>
          <p>Note: Some Spotify-exclusive podcasts (like Joe Rogan) won't appear here.</p>
        </div>
      </div>
    </div>
  );
}