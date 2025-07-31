import "./styles/tailwind.css";
import Home from "./pages/Home";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Episode from "./pages/Episode";
import { useAuth } from "./hooks/useAuth";
import Discover from "./pages/Discover";
import RSSDiscover from "./pages/RSSDiscover";

function App() {
  const token = useAuth();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" exact element={<Home />} />
        <Route
          path="/discover"
          exact
          element={token ? <Discover /> : <Home />}
        />
        <Route
          path="/rss"
          exact
          element={<RSSDiscover />}
        />
        <Route path="/episode" exact element={<Episode />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
