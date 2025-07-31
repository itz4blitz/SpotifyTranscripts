import Color from "color-thief-react";
import { useLocation } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import Search from "../components/Search";
import Jumbotron from "../components/Jumbotron";
import Overview from "../components/Overview";
import Description from "../components/Description";
import Chapters from "../components/Chapters";
import Footer from "../components/Footer";
import Subtitles from "../components/Subtitles";

export default function Episode() {
  const OPEN_AI_KEY = process.env.REACT_APP_OPEN_AI_KEY;
  const location = useLocation();
  const [playing, setPlaying] = useState(false);
  const [showSearch, setShowSearch] = useState(true);
  let player = document.getElementById("Player");
  const intervalRef = useRef();
  const [transcript, setTranscript] = useState([]);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [transcriptProgress, setTranscriptProgress] = useState(0);
  const [transcriptMessage, setTranscriptMessage] = useState('');
  const [transcriptError, setTranscriptError] = useState(null);

  const [time, setTime] = useState(0);
  const [fullScreenSubtitles, setFullScreenSubtitles] = useState(false);
  const [dominantColor, setDominantColor] = useState("");
  const [chapters, setChapters] = useState([]);
  const episode = location.state;

  const callOpenAIAPI = useCallback(async (input) => {
    if (!OPEN_AI_KEY) {
      console.error('OpenAI API key not found');
      setChapters([{
        title: "Full Episode",
        time: [0, 30000],
        active: false
      }]);
      return;
    }

    console.log("Calling OpenAI API for chapter generation...");

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + OPEN_AI_KEY,
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content:
                "You are an assistant that receives podcast transcripts and segments them into chapters. Based on the transcript with timestamps, identify major topics and create chapter titles. Return ONLY a valid JSON array in this exact format: [{\"title\": \"Chapter Title\", \"time\": [startTimeInMs, endTimeInMs], \"active\": false}]. The last chapter should end at 30000ms (30 seconds). Ensure the JSON is properly formatted.",
            },
            { role: "user", content: JSON.stringify(input) },
          ],
          temperature: 0.3,
          max_tokens: 800,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format from OpenAI API');
      }

      const content = data.choices[0].message.content.trim();
      console.log('OpenAI response:', content);
      
      try {
        const parsedChapters = JSON.parse(content);
        if (Array.isArray(parsedChapters) && parsedChapters.length > 0) {
          setChapters(parsedChapters);
        } else {
          throw new Error('Invalid chapter format returned');
        }
      } catch (parseError) {
        console.warn('Failed to parse OpenAI response, using fallback chapters:', parseError);
        // Fallback: create simple chapters based on transcript length
        const fallbackChapters = createFallbackChapters(input);
        setChapters(fallbackChapters);
      }
    } catch (error) {
      console.error('OpenAI API error:', error);
      // Create fallback chapters when API fails
      const fallbackChapters = createFallbackChapters(input);
      setChapters(fallbackChapters);
    }
  }, [OPEN_AI_KEY]);

  const createFallbackChapters = (transcript) => {
    if (!transcript || transcript.length === 0) {
      return [{
        title: "Full Episode",
        time: [0, 30000],
        active: false
      }];
    }

    const totalDuration = 30000; // 30 seconds
    const chaptersCount = Math.min(3, Math.ceil(transcript.length / 5)); // Max 3 chapters
    const chapterDuration = totalDuration / chaptersCount;
    
    return Array.from({ length: chaptersCount }, (_, index) => ({
      title: `Chapter ${index + 1}`,
      time: [index * chapterDuration, (index + 1) * chapterDuration],
      active: false
    }));
  };

  useEffect(() => {
    async function fetchTranscriptWithProgress() {
      if (!episode.audio_preview_url) return;
      
      setTranscriptLoading(true);
      setTranscriptError(null);
      setTranscriptProgress(0);
      setTranscriptMessage('Initializing...');
      
      try {
        const response = await fetch(
          `/get_podcast_progress?url=${encodeURIComponent(episode.audio_preview_url)}`
        );
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.status === 'error') {
                  setTranscriptError(data.error);
                  setTranscriptLoading(false);
                  return;
                }
                
                setTranscriptProgress(data.progress || 0);
                setTranscriptMessage(data.message || '');
                
                if (data.status === 'completed' && data.transcript) {
                  parseTranscript(data.transcript);
                  setTranscriptLoading(false);
                  return;
                }
              } catch (e) {
                console.warn('Failed to parse progress data:', e);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching transcript:', error);
        setTranscriptError(error.message);
        setTranscriptLoading(false);
        
        // Fallback to original method
        try {
          const fallbackResponse = await fetch(
            `/get_podcast?url=${encodeURIComponent(episode.audio_preview_url)}`
          );
          
          if (fallbackResponse.ok) {
            const transcript = await fallbackResponse.text();
            parseTranscript(transcript);
            setTranscriptLoading(false);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    }
    
    function parseTranscript(inputString) {
      const tmpResult = [];
      const segments = inputString.split(". ");
      segments.pop();

      segments.forEach((segment) => {
        const tmpArray = segment.split(";");
        if (tmpArray.length >= 3) {
          const obj = {
            startTime: tmpArray[0].substring(tmpArray[0].indexOf(" ") + 1),
            endTime: tmpArray[1].substring(tmpArray[1].indexOf(" ") + 1),
            sentence: tmpArray[2].substring(tmpArray[2].indexOf(" ") + 1),
          };
          tmpResult.push(obj);
        }
      });
      
      if (tmpResult.length > 0) {
        setTranscript(tmpResult);
      }
    }

    fetchTranscriptWithProgress();
  }, [episode.audio_preview_url]);

  useEffect(() => {
    if (transcript.length > 1) {
      callOpenAIAPI(transcript);
    }
  }, [transcript, callOpenAIAPI]);

  const startTimer = () => {
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      updateTime(player.currentTime);
    }, [1000]);
  };

  function generateTimestamp(time_in_s) {
    var h = Math.floor(time_in_s / 3600);
    var m = Math.floor((time_in_s % 3600) / 60);
    var s = Math.floor((time_in_s % 3600) % 60);

    var hDisplay = "";
    var mDisplay = "";
    var sDisplay = "";

    if (h > 0) {
      hDisplay = h + ":";
    }

    mDisplay = m + ":";

    if (s >= 0) {
      if (s > 9) {
        sDisplay = s;
      } else {
        sDisplay = "0" + s;
      }
    }

    return hDisplay + mDisplay + sDisplay;
  }

  useEffect(() => {
    if (episode) {
      let tmp = [...chapters];

      tmp?.forEach((chapter, i) => {
        if (
          time >= parseFloat(chapter.time[0] / 1000) &&
          time < parseFloat(chapter.time[1] / 1000)
        ) {
          tmp[i].active = true;
        } else {
          tmp[i].active = false;
        }
      });

      setChapters(tmp);
    }

    if (time) {
      let player = document.getElementById("Player");
      player.currentTime = time;
    }
  }, [time, chapters, episode]);

  function updateTime(newTime) {
    if (newTime < 0) {
      setTime(0);
    } else if (newTime > episode.duration_ms / 1000) {
      setTime(episode.duration_ms / 1000);
    } else {
      setTime(newTime);
    }
  }

  function handleUpdateTime(value) {
    setTime(value);
  }

  function handleToggleSearch(value) {
    setShowSearch(!value);
  }

  function handleToggleTranscriptFullscreen(value) {
    setFullScreenSubtitles(!value);
  }

  function handleTogglePlay(value) {
    if (value) {
      player.pause();
      clearInterval(intervalRef.current);
    } else {
      startTimer();
      player.play();
    }

    setPlaying(!value);
  }

  if (transcriptLoading || transcript.length === 0 || (transcript.length > 0 && chapters.length === 0)) {
    return (
      <div className="bg-spotifyDarkGray h-screen pt-32">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div role="status">
              <svg
                aria-hidden="true"
                className="inline w-14 mb-4 h-14 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-spotifyLightGreen"
                viewBox="0 0 100 101"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                  fill="currentColor"
                />
                <path
                  d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
                  fill="currentFill"
                />
              </svg>
              <span className="sr-only">Loading...</span>
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h1 className="text-2xl text-white font-semibold mb-2">
              {transcriptError ? 'Error Processing Podcast' : 
               transcript.length > 0 ? 'Generating Chapters...' : 'Processing Your Podcast'}
            </h1>
            
            {transcriptError ? (
              <div className="text-red-400 text-sm mb-4">
                <p>Error: {transcriptError}</p>
                <p className="mt-2">Please try again or check if the audio URL is valid.</p>
              </div>
            ) : (
              <p className="text-gray-300 text-sm mb-4">
                {transcriptMessage || 'Processing audio and generating transcript...'}
              </p>
            )}
          </div>
          
          {!transcriptError && (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div 
                className="bg-spotifyLightGreen h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${transcript.length > 0 ? 95 : transcriptProgress}%` }}
              ></div>
            </div>
          )}
          
          <div className="text-center text-sm text-gray-400">
            {transcriptError ? (
              <button 
                onClick={() => window.location.reload()} 
                className="bg-spotifyLightGreen text-black px-4 py-2 rounded-full hover:bg-green-400 transition-colors"
              >
                Try Again
              </button>
            ) : (
              <p>{transcript.length > 0 ? 'Almost done...' : `${transcriptProgress}% complete`}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Color src={episode.images[0].url} crossOrigin="anonymous" format="hex">
        {({ data }) => {
          setDominantColor(data);
        }}
      </Color>

      <div className="bg-black h-screen overflow-y-hidden ">
        <div className="grid grid-cols-12 gap-3 p-4">
          {fullScreenSubtitles ? (
            <div
              style={{
                backgroundColor: dominantColor,
              }}
              className={`pb-24 h-screen rounded-lg ${
                showSearch ? "col-span-9" : "col-span-12"
              }`}
            >
              <Subtitles
                time={time}
                transcript={transcript}
                fullScreenSubtitles={fullScreenSubtitles}
                handleToggleTranscriptFullscreen={
                  handleToggleTranscriptFullscreen
                }
                dominantColor={dominantColor}
              />
            </div>
          ) : (
            <div
              className={`bg-spotifyDarkGray pb-40  h-screen overflow-auto rounded-lg ${
                showSearch ? "col-span-9" : "col-span-12"
              }`}
            >
              <Jumbotron
                episode={episode}
                dominantColor={dominantColor}
                handleToggleSearch={handleToggleSearch}
                showSearch={showSearch}
              />

              <div className="text-white mx-6 mt-4">
                <Overview
                  playing={playing}
                  handleTogglePlay={handleTogglePlay}
                  episode={episode}
                  time={time}
                />

                <Description episode={episode} />

                <div className="w-full rounded  mt-12">
                  <Chapters
                    chapters={chapters}
                    time={time}
                    handleUpdateTime={handleUpdateTime}
                    generateTimestamp={generateTimestamp}
                  />

                  <Subtitles
                    time={time}
                    transcript={transcript}
                    fullScreenSubtitles={fullScreenSubtitles}
                    handleToggleTranscriptFullscreen={
                      handleToggleTranscriptFullscreen
                    }
                    dominantColor={dominantColor}
                  />
                </div>
              </div>
            </div>
          )}

          <Search
            transcript={transcript}
            handleUpdateTime={handleUpdateTime}
            showSearch={showSearch}
            handleToggleSearch={handleToggleSearch}
            generateTimestamp={generateTimestamp}
          />

          <Footer
            episode={episode}
            chapters={chapters}
            handleUpdateTime={handleUpdateTime}
            time={time}
            playing={playing}
            handleTogglePlay={handleTogglePlay}
            generateTimestamp={generateTimestamp}
          />
        </div>
      </div>
    </>
  );
}
