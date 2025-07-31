import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Discover() {
  const token = useAuth();
  const [searchKey, setSearchKey] = useState("");
  const [episodes, setEpisodes] = useState([]);

  const searchEpisodes = async (e) => {
    e.preventDefault();

    const { data } = await axios.get("https://api.spotify.com/v1/search", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: {
        q: searchKey,
        type: "episode",
      },
    });

    setEpisodes(data.episodes.items);
  };

  return (
    <main className="bg-spotifyDarkGray min-h-screen">
      <div className="text-center lg:w-10/12 w-12/12 pt-40 mb-32 mx-auto">
        <h1 className="text-white text-5xl text-semibold tracking-wider mb-12">
          Seach for a podcast
        </h1>

        <form onSubmit={searchEpisodes} className="mb-8">
          <input
            className="w-96 border-grey-light p-3 rounded-lg focus:ring-primary focus:border-primary border-black border-2 text-lg font-semibold mr-3 outline-none"
            type="text"
            placeholder="Search  . . ."
            onChange={(e) => setSearchKey(e.target.value)}
          />
          <button
            className="bg-spotifyLightGreen hover:bg-spotifyDarkGreen text-white px-5 rounded-lg py-3 cursor-pointer text-center text-lg font-semibold tracking-wide"
            type={"submit"}
          >
            Search
          </button>
        </form>
      </div>

      <div className="text-white text-md grid grid-cols-5 gap-8 w-10/12 mx-auto pb-32">
        {episodes.map((episode) => (
          <Link
            key={episode.id}
            to="/episode"
            state={episode}
            className="max-w-sm rounded-md overflow-hidden shadow-lg bg-spotifyMediumGray hover:bg-spotifyLightGray p-3.5"
          >
            <img className="w-full rounded" src={episode.images[0].url} alt={episode.name} />
            <div className="pt-3">
              <h1 className="font-medium text-lg mb-1 overflow-ellipsis overflow-hidden whitespace-nowrap">
                {episode.name}
              </h1>
              <div className="flex justify-starttext-xs gap-1 opacity-50 mb-3">
                <p>{episode.release_date}</p>
                <p>, </p>
                <p>{Math.floor(episode.duration_ms / 60000) + " MIN"}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
