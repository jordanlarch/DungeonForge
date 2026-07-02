import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import TopNav from "./components/TopNav";
import ForgePage from "./pages/ForgePage";
import CharactersPage from "./pages/CharactersPage";
import PlayPage from "./pages/PlayPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <TopNav />
        <Routes>
          <Route path="/" element={<Navigate to="/forge" replace />} />
          <Route path="/forge" element={<ForgePage />} />
          <Route path="/characters" element={<CharactersPage />} />
          <Route path="/play" element={<PlayPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
