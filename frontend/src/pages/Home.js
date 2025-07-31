import overview from "../images/overview.png";

export default function Home() {
  const CLIENT_ID = process.env.REACT_APP_SPOTIFY_CLIENT_ID;
  console.log("Spotify Client ID:", CLIENT_ID); // Debug log
  const REDIRECT_URI = "http://localhost:3001/discover";
  const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
  const RESPONSE_TYPE = "token";

  return (
    <div className="text-white bg-spotifyDarkGray h-screen">
      <div className="mx-auto grid grid-cols-5 gap-20 lg:w-10/12 w-12/12 pt-60 ">
        <div className="col-span-2 pt-16 ">
          <h1 className="text-5xl font-bold">Spotify Transcripts</h1>
          <p className="text-lg mt-4 mb-12">
            A proof of concept for an improved podcast experience powered by AI.
          </p>

          <div className="space-y-4">
            <a
              className="block bg-spotifyLightGreen hover:bg-spotifyDarkGreen text-spotifyDarkGray px-6 py-4 rounded-full cursor-pointer text-center text-sm font-semibold uppercase tracking-wider"
              href={`${AUTH_ENDPOINT}?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&response_type=${RESPONSE_TYPE}`}
            >
              Log in with Spotify
            </a>
            
            <div className="text-center text-gray-400 text-sm">or</div>
            
            <a
              href="/rss"
              className="block bg-gray-700 hover:bg-gray-600 text-white px-6 py-4 rounded-full cursor-pointer text-center text-sm font-semibold uppercase tracking-wider"
            >
              Transcribe Full Episodes (RSS)
            </a>
            
            <p className="text-gray-400 text-xs mt-2">
              Skip Spotify's 30-second limitation and transcribe complete podcast episodes
            </p>
          </div>
        </div>

        <div className="col-span-3">
          <img
            src={overview}
            alt="Spotify Transcripts application overview"
            className="rounded-lg shadow border-2 border-black"
          />
        </div>
      </div>
    </div>
  );
}
