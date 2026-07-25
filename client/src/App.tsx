import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Host from "./pages/Host";
import Guest from "./pages/Guest";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/host/:code" element={<Host />} />
        <Route path="/guest/:code" element={<Guest />} />
      </Routes>
    </div>
  );
}
