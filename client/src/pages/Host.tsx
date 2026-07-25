import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "../useSocket";
import YouTubePlayer, { type YouTubePlayerHandle } from "../components/YouTubePlayer";
import RoomSettings from "../components/RoomSettings";
import RoomQR from "../components/RoomQR";
import {
  Play, SkipForward, Trash2, Settings, Users, Music, Search, Mic2,
  ArrowLeft, QrCode, ExternalLink, ThumbsUp, Clock, PartyPopper, List, Heart, Pause
} from "lucide-react";

interface Song {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  thumbnail: string;
  duration?: string;
}

export default function Host() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { connected, connecting, queue, nowPlaying, guests, settings, joinError, addSong, playNext, removeSong, updateSettings, voteSong, socket } = useSocket(code!, "", true);
  const [search, setSearch] = useState("Videoke");
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [cheers, setCheers] = useState<number[]>([]);
  const [tab, setTab] = useState<"queue" | "search">("queue");
  const [isPlaying, setIsPlaying] = useState(true);
  const [playerErrorVideoId, setPlayerErrorVideoId] = useState<string | null>(null);
  const [mutedRetry, setMutedRetry] = useState(false);
  const [mutedKey, setMutedKey] = useState(0);
  const playerRef = useRef<YouTubePlayerHandle>(null);
  const searchTimer = useRef<any>(null);
  const cheerTimer = useRef<any>(null);

  useEffect(() => {
    setPlayerErrorVideoId(null);
    setMutedRetry(false);
    setMutedKey(0);
  }, [nowPlaying?.song?.videoId]);

  useEffect(() => {
    if (playerErrorVideoId && !mutedRetry) {
      setMutedRetry(true);
      setMutedKey((k) => k + 1);
      setPlayerErrorVideoId(null);
    }
  }, [playerErrorVideoId, mutedRetry]);

  useEffect(() => {
    if (!socket) return;
    const handler = () => {
      setCheers((prev) => [...prev, Date.now()]);
      clearTimeout(cheerTimer.current);
      cheerTimer.current = setTimeout(() => setCheers([]), 2000);
    };
    const playbackHandler = (data: { action: string }) => {
      if (data.action === "play") { playerRef.current?.play(); setIsPlaying(true); }
      if (data.action === "pause") { playerRef.current?.pause(); setIsPlaying(false); }
      if (data.action === "stop") { playerRef.current?.stop(); setIsPlaying(false); }
      if (data.action === "skip") { playNext(); }
    };
    socket.on("cheer", handler);
    socket.on("guest-playback-control", playbackHandler);
    return () => { socket.off("cheer", handler); socket.off("guest-playback-control", playbackHandler); };
  }, [socket]);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search/songs?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults(data.songs || []);
      } catch { setResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  return (
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0 z-20">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <ArrowLeft size="20" />
          </button>
          <Mic2 size="22" className="text-primary" />
          <div>
            <h1 className="font-bold text-sm">AGZ VIDEOKE</h1>
            <span className="text-primary font-mono text-xs tracking-widest">Room: {code}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-muted-foreground text-sm">
            <Users size="16" />
            <span>{guests.length}</span>
          </div>
          {cheers.map((t) => (
            <span key={t} className="text-primary animate-bounce text-sm">🎉</span>
          ))}
          <button onClick={() => setShowQR(true)} className="text-muted-foreground hover:text-foreground p-1 transition-colors" title="Show QR code">
            <QrCode size="18" />
          </button>
          <button onClick={() => setShowSettings(true)} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <Settings size="18" />
          </button>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-primary" : "bg-destructive"}`} />
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex min-h-0">
        {/* Center - Now Playing */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {connecting && (
            <div className="bg-secondary/30 border-b border-border/50 text-muted-foreground px-4 py-2 text-xs text-center">
              Connecting to server...
            </div>
          )}
          {joinError && (
            <div className="bg-destructive/10 border-b border-destructive/40 text-destructive px-4 py-2 text-xs text-center">
              {joinError}
            </div>
          )}
          {!connected && !connecting && !joinError && (
            <div className="bg-destructive/10 border-b border-destructive/40 text-destructive px-4 py-2 text-xs text-center">
              Disconnected. Reconnecting...
            </div>
          )}

          {nowPlaying ? (
            <div className="flex-1 flex flex-col p-4 min-h-0">
              <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden border border-border/50 shadow-lg">
                {playerErrorVideoId === nowPlaying.song.videoId ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-gray-950/90 p-4">
                    <div className="text-destructive mb-1">
                      <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    </div>
                    <p className="text-foreground text-sm font-medium text-center">Video can't play here</p>
                    <p className="text-muted-foreground text-xs text-center">Try opening it in YouTube below</p>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => {
                          window.open(`https://www.youtube.com/watch?v=${nowPlaying.song.videoId}`, "yt-popup", "width=400,height=300,menubar=no,toolbar=no,location=no,status=no");
                        }}
                        className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                      >
                        <ExternalLink size="13" /> Play in Popup
                      </button>
                      <a
                        href={`https://www.youtube.com/watch?v=${nowPlaying.song.videoId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors"
                      >
                        <ExternalLink size="13" /> New Tab
                      </a>
                      <button onClick={() => playNext()} className="h-9 px-4 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors">
                        <SkipForward size="13" /> Skip
                      </button>
                    </div>
                  </div>
                ) : (
                  <YouTubePlayer key={mutedKey} ref={playerRef} videoId={nowPlaying.song.videoId} onEnd={() => playNext()} onError={(id) => setPlayerErrorVideoId(id)} muted={mutedRetry} />
                )}
              </div>
                <div className="flex items-center justify-between mt-3 px-1">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{nowPlaying.song.title}</p>
                    <p className="text-muted-foreground text-xs truncate mt-0.5">
                      {nowPlaying.song.artist}
                    {nowPlaying.song.duration && nowPlaying.song.duration !== "0:00" && (
                      <span className="ml-2 text-muted-foreground/60"><Clock size="10" className="inline" /> {nowPlaying.song.duration}</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => { isPlaying ? playerRef.current?.pause() : playerRef.current?.play(); setIsPlaying(!isPlaying); }}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause size="13" /> : <Play size="13" />}
                  </button>
                  <button
                    onClick={() => window.open(`https://www.youtube.com/watch?v=${nowPlaying.song.videoId}`, "yt-popup", "width=400,height=300,menubar=no,toolbar=no,location=no,status=no")}
                    className="h-8 w-8 rounded-lg flex items-center justify-center transition-colors bg-secondary text-muted-foreground hover:text-foreground border border-border/50"
                    title="Popout player"
                  >
                    <ExternalLink size="13" />
                  </button>
                  <a
                    href={`https://www.youtube.com/watch?v=${nowPlaying.song.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
                    title="Open in YouTube"
                  >
                    <ExternalLink size="16" />
                  </a>
                  <button onClick={() => playNext()} className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors bg-secondary text-muted-foreground hover:text-foreground border border-border/50">
                    Skip <SkipForward size="12" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              {guests.length === 0 ? (
                <div className="text-center">
                  <RoomQR code={code!} size={160} />
                  <p className="text-muted-foreground text-sm mt-4">No guests yet</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Share the QR code or room code above</p>
                </div>
              ) : (
                <div className="text-center">
                  <Music size="48" className="mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-sm">Nothing playing</p>
                  <p className="text-muted-foreground/60 text-xs mt-1">Add a song to the queue to get started</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right panel - Queue / Search */}
        <div className="w-80 lg:w-96 xl:w-[28rem] border-l border-border/50 bg-card/30 flex flex-col min-h-0 hidden md:flex">
          {/* Panel header tabs */}
          <div className="flex border-b border-border/50 shrink-0">
            <button
              onClick={() => setTab("queue")}
              className={`flex-1 px-4 py-3 text-xs font-semibold tracking-wider uppercase transition-colors relative ${
                tab === "queue" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <List size="14" className="inline mr-1.5" />
              Queue
              {queue.length > 0 && (
                <span className="ml-1.5 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">
                  {queue.length}
                </span>
              )}
              {tab === "queue" && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />}
            </button>
            <button
              onClick={() => { setTab("search"); setResults([]); }}
              className={`flex-1 px-4 py-3 text-xs font-semibold tracking-wider uppercase transition-colors relative ${
                tab === "search" ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Search size="14" className="inline mr-1.5" />
              Search
              {tab === "search" && <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />}
            </button>
          </div>

          {/* Panel content */}
          <div className="flex-1 min-h-0 overflow-y-auto panel-scroll">
            {tab === "search" ? (
              <div className="p-4">
                <div className="relative">
                  <Search size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"

                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setTab("search"); }}
                    className="w-full h-10 rounded-xl bg-background border border-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    autoFocus={tab === "search"}
                  />
                </div>
                {searching && <p className="text-muted-foreground text-xs mt-3">Searching...</p>}
                {!searching && search.length >= 2 && results.length === 0 && (
                  <p className="text-muted-foreground/60 text-xs mt-3 text-center py-8">No results found</p>
                )}
                {results.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {results.map((song) => (
                      <div
                        key={song.id}
                        onClick={() => { addSong(song); setSearch("Videoke"); setTab("queue"); }}
                        className="flex items-center gap-3 p-2 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border/50 cursor-pointer"
                      >
                        <div className="w-14 h-10 bg-black rounded overflow-hidden flex-shrink-0">
                          {song.thumbnail && <img src={song.thumbnail} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate text-foreground/90">{song.title}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{song.artist}</p>
                        </div>
                        {song.duration && song.duration !== "0:00" && (
                          <span className="text-muted-foreground/60 text-[10px] flex items-center gap-1 flex-shrink-0">
                            <Clock size="9" />{song.duration}
                          </span>
                        )}
                        <Music size="14" className="text-primary flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4">
                {queue.length === 0 ? (
                  <div className="text-center py-12 bg-card/30 rounded-xl border border-dashed border-border">
                    <Music size="32" className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground text-sm">No songs in queue</p>
                    <p className="text-muted-foreground/60 text-xs mt-1">Search and add songs to the queue</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {queue.map((item, i) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-2.5 bg-secondary/30 rounded-lg border border-border/50 group hover:bg-secondary/50 transition-colors"
                      >
                        <span className="text-muted-foreground text-[11px] w-5 text-right font-mono tabular-nums">{i + 1}</span>
                        <div className="w-14 h-10 bg-black rounded overflow-hidden flex-shrink-0">
                          {item.song.thumbnail && <img src={item.song.thumbnail} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/90 truncate leading-tight">{item.song.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                            {item.guestName}
                            {item.song.duration && item.song.duration !== "0:00" && (
                              <span className="text-muted-foreground/60">· <Clock size="9" className="inline" /> {item.song.duration}</span>
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => voteSong(item.id, 1)}
                            className="text-muted-foreground hover:text-primary p-1 flex items-center gap-0.5 text-[11px]"
                          >
                            <ThumbsUp size="12" />
                            {item.votes > 0 && <span className="text-primary">{item.votes}</span>}
                          </button>
                          <button
                            onClick={() => removeSong(item.id)}
                            className="text-muted-foreground hover:text-destructive p-1"
                          >
                            <Trash2 size="12" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom tab bar */}
      <div className="md:hidden fixed bottom-0 left-0 w-full bg-card border-t border-border/50 flex items-center justify-around p-2 pb-safe z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        <button
          onClick={() => setTab("queue")}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${
            tab === "queue" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <List size="18" />
          <span className="text-[10px] font-semibold">Queue</span>
          {queue.length > 0 && (
            <span className="absolute -top-0.5 right-1/4 bg-primary text-primary-foreground text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
              {queue.length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setTab("search"); setSearch("videoke"); }}
          className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg transition-all ${
            tab === "search" ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Search size="18" />
          <span className="text-[10px] font-semibold">Search</span>
        </button>
        <button
          onClick={() => setShowQR(true)}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-muted-foreground hover:text-foreground transition-all"
        >
          <QrCode size="18" />
          <span className="text-[10px] font-semibold">Share</span>
        </button>
      </div>

      {showSettings && settings && (
        <RoomSettings settings={settings} onUpdate={updateSettings} onClose={() => setShowSettings(false)} />
      )}
      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-xs border border-border/50 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <RoomQR code={code!} size={200} />
            <button onClick={() => setShowQR(false)} className="w-full mt-4 h-10 rounded-xl font-semibold text-sm bg-secondary text-muted-foreground hover:text-foreground border border-border/50 transition-colors">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
