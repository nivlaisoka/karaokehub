import { useState } from "react";
import { useNavigate } from "react-router-dom";
import QRScanner from "../components/QRScanner";
import { Mic2, Play, Users, QrCode, Music } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();
  const [hostName, setHostName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [guestName, setGuestName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showScanner, setShowScanner] = useState(false);

  async function createRoom() {
    if (!hostName.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostName: hostName.trim() }),
      });
      const data = await res.json();
      navigate(`/host/${data.code}`);
    } catch {
      setError("Failed to create room. Is the server running?");
    } finally {
      setLoading(false);
    }
  }

  function joinRoom() {
    if (!roomCode.trim() || !guestName.trim()) return;
    navigate(`/guest/${roomCode.toUpperCase()}?name=${encodeURIComponent(guestName.trim())}`);
  }

  function handleQRScan(code: string) {
    setRoomCode(code);
    setShowScanner(false);
    if (guestName.trim()) {
      navigate(`/guest/${code}?name=${encodeURIComponent(guestName.trim())}`);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md animate-slide-up relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-primary mb-6 pulse-glow shadow-[0_0_30px_rgba(249,115,22,0.35)]">
              <Mic2 size="40" className="text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-extrabold tracking-tighter">
              <span className="text-primary">AGZ</span>
              <span className="text-foreground"> VIDEOKE</span>
            </h1>
            <p className="text-muted-foreground mt-2 text-sm">Unleash Your Voice. The ultimate party command center.</p>
          </div>

          {error && (
            <div className="bg-destructive/10 border border-destructive/40 text-destructive rounded-lg p-3 mb-4 text-sm text-center">
              {error}
            </div>
          )}

          <div className="bg-card border border-border/50 rounded-2xl p-6 mb-4 shadow-lg">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Play size="18" className="text-primary" />
              Host a Room
            </h2>
            <input
              type="text"
              placeholder="Your name"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="w-full h-11 rounded-xl bg-background border border-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-3"
              onKeyDown={(e) => e.key === "Enter" && createRoom()}
            />
            <button
              onClick={createRoom}
              disabled={loading || !hostName.trim()}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Room"}
            </button>
          </div>

          <div className="bg-card border border-border/50 rounded-2xl p-6 shadow-lg">
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-4">
              <Users size="18" className="text-primary" />
              Join a Room
            </h2>
            <div className="flex gap-2 mb-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full h-11 rounded-xl bg-background border border-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-center font-mono text-lg tracking-widest uppercase"
                  maxLength={5}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                />
              </div>
              <button
                onClick={() => setShowScanner(true)}
                className="h-11 w-11 rounded-xl border border-input bg-background text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors flex-shrink-0"
                title="Scan QR code"
              >
                <QrCode size="20" />
              </button>
            </div>
            <input
              type="text"
              placeholder="Your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full h-11 rounded-xl bg-background border border-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-3"
              onKeyDown={(e) => e.key === "Enter" && joinRoom()}
            />
            <button
              onClick={joinRoom}
              disabled={!roomCode.trim() || !guestName.trim()}
              className="w-full h-11 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors border border-white/15 text-muted-foreground hover:text-foreground hover:bg-white/5 disabled:opacity-50"
            >
              Join Room
            </button>
          </div>

          <p className="text-center text-muted-foreground text-xs mt-6 flex items-center justify-center gap-1">
            <Music size="12" /> Built with React + Socket.IO
          </p>
        </div>
      </div>

      {showScanner && (
        <QRScanner
          onScan={handleQRScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );
}
