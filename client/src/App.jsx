import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import HostApp from "./pages/host/HostApp";
import JoinApp from "./pages/join/JoinApp";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <Routes>
          <Route path="/" element={<Navigate to="/host" replace />} />
          <Route path="/host" element={<HostApp />} />
          <Route path="/join" element={<JoinApp />} />
          <Route path="/join/:roomCode" element={<JoinApp />} />
          <Route path="*" element={<Navigate to="/host" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
