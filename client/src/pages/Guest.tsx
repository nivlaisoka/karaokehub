import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { useSocket } from "../useSocket";
import { Music, Search, Mic2, ArrowLeft, Users, ExternalLink, Clock, ThumbsUp, PartyPopper, List, Play, Pause, SkipForward, Square } from "lucide-react";

interface Song {
  id: string;
  title: string;
  artist: string;
  videoId: string;
  thumbnail: string;
  duration?: string;
}

const API_URL = import.meta.env.VITE_SERVER_URL || "";

export default function Guest() {
  const { code } = useParams<{ code: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const urlName = searchParams.get("name");
  const [nameInput, setNameInput] = useState(urlName || "");
  const [nameConfirmed, setNameConfirmed] = useState(!!urlName);
  const guestName = nameInput || "Anonymous";

  if (!nameConfirmed) {
    return (
      <div className="min-h-[100dvh] bg-background text-foreground flex items-center justify-center p-8">
        <div className="max-w-sm w-full">
          <div className="text-center mb-8">
            <Mic2 size="48" className="mx-auto text-primary mb-4" />
            <h1 className="text-xl font-bold">AGZ VIDEOKE</h1>
            <p className="text-muted-foreground text-sm mt-2">Enter your name to join <span className="text-primary font-mono">{code}</span></p>
          </div>
          <input
            type="text"
            placeholder="Your name"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && nameInput.trim() && setNameConfirmed(true)}
            className="w-full h-12 rounded-xl bg-card border border-input px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mb-4"
            autoFocus
            maxLength={30}
          />
          <button
            onClick={() => nameInput.trim() && setNameConfirmed(true)}
            disabled={!nameInput.trim()}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            Join Room
          </button>
        </div>
      </div>
    );
  }

  return <GuestContent code={code!} guestName={guestName} />;
}

function GuestContent({ code, guestName }: { code: string; guestName: string }) {
  const navigate = useNavigate();
  const { connected, connecting, queue, nowPlaying, guests, settings, joinError, addSong, voteSong, cheer, sendPlaybackControl } = useSocket(code, guestName, false);
  const [search, setSearch] = useState("Videoke");
  const [results, setResults] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const [tab, setTab] = useState<"queue" | "search">("queue");
  const searchTimer = useRef<any>(null);

  useEffect(() => {
    if (search.length < 2) { setResults([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`${API_URL}/api/search/songs?q=${encodeURIComponent(search)}`);
        const data = await res.json();
        setResults(data.songs || []);
      } catch { setResults([]); }
      setSearching(false);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  return (
    <div className="min-h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-card border-b border-border/50 px-4 py-3 flex items-center justify-between shrink-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <ArrowLeft size="20" />
          </button>
          <Mic2 size="22" className="text-primary" />
          <div>
            <h1 className="font-bold text-sm">AGZ VIDEOKE</h1>
            <span className="text-muted-foreground text-xs">Room: <span className="text-primary font-mono">{code}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs">{guestName}</span>
          <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-primary" : "bg-destructive"}`} />
        </div>
      </header>

      {/* Status banners */}
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

      {/* Now Playing */}
      {nowPlaying && (
        <div className="bg-card border-b border-border/50 px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold tracking-[0.15em] uppercase text-primary">
              <Music size="12" className="inline mr-1" />Now Playing
            </span>
            {nowPlaying && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => sendPlaybackControl("play")}
                  className="text-muted-foreground hover:text-primary p-1.5 transition-colors"
                  title="Play"
                >
                  <Play size="16" />
                </button>
                <button
                  onClick={() => sendPlaybackControl("pause")}
                  className="text-muted-foreground hover:text-primary p-1.5 transition-colors"
                  title="Pause"
                >
                  <Pause size="16" />
                </button>
                <button
                  onClick={() => sendPlaybackControl("stop")}
                  className="text-muted-foreground hover:text-primary p-1.5 transition-colors"
                  title="Stop"
                >
                  <Square size="16" />
                </button>
                <button
                  onClick={() => sendPlaybackControl("skip")}
                  className="text-muted-foreground hover:text-primary p-1.5 transition-colors"
                  title="Skip"
                >
                  <SkipForward size="16" />
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="w-14 h-10 bg-black rounded overflow-hidden flex-shrink-0">
              {nowPlaying.song.thumbnail && (
                <img src={nowPlaying.song.thumbnail} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground/90 truncate">{nowPlaying.song.title}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {nowPlaying.song.artist}
                {nowPlaying.song.duration && nowPlaying.song.duration !== "0:00" && (
                  <span className="ml-2 text-muted-foreground/60"><Clock size="10" className="inline" /> {nowPlaying.song.duration}</span>
                )}
              </p>
            </div>
            <a
              href={`https://www.youtube.com/watch?v=${nowPlaying.song.videoId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground p-1.5 transition-colors flex-shrink-0"
              title="Open in YouTube"
            >
              <ExternalLink size="16" />
            </a>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* Tab content */}
        {tab === "search" ? (
          <div className="p-4">
            <div className="relative">
              <Search size="16" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"

                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-11 rounded-xl bg-background border border-input pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                autoFocus
              />
            </div>
            {searching && <p className="text-muted-foreground text-xs mt-3">Searching...</p>}
            {!searching && search.length >= 2 && results.length === 0 && (
              <p className="text-muted-foreground/60 text-xs mt-3 text-center py-8">No results found</p>
            )}
            {results.length > 0 && (
              <div className="mt-3 space-y-0.5">
                {results.map((song) => (
                  <div
                    key={song.id}
                    onClick={() => { addSong(song); setSearch("Videoke"); setTab("queue"); }}
                    className="flex items-center gap-3 p-2.5 hover:bg-secondary rounded-lg transition-colors border border-transparent hover:border-border/50 cursor-pointer"
                  >
                    <div className="w-16 h-11 bg-black rounded overflow-hidden flex-shrink-0">
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
              <div className="text-center py-16 bg-card/30 rounded-xl border border-dashed border-border">
                <Music size="32" className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">No songs in queue yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Search and add one!</p>
              </div>
            ) : (
              <div className="space-y-1">
                {queue.map((item, i) => (
                  <div key={item.id} className="flex items-center gap-3 p-2.5 bg-secondary/30 rounded-lg border border-border/50">
                    <span className="text-muted-foreground text-[11px] w-5 text-right font-mono tabular-nums">{i + 1}</span>
                    <div className="w-14 h-10 bg-black rounded overflow-hidden flex-shrink-0">
                      {item.song.thumbnail && <img src={item.song.thumbnail} alt="" className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground/90 truncate leading-tight">{item.song.title}</p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5 flex items-center gap-1">
                        added by {item.guestName}
                        {item.song.duration && item.song.duration !== "0:00" && (
                          <span className="text-muted-foreground/60">· <Clock size="9" className="inline" /> {item.song.duration}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => voteSong(item.id, 1)}
                      className="text-muted-foreground hover:text-primary p-1 flex items-center gap-0.5 text-[11px] flex-shrink-0 transition-colors"
                    >
                      <ThumbsUp size="12" />
                      {item.votes > 0 && <span className="text-primary">{item.votes}</span>}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center justify-center gap-4 mt-6 text-muted-foreground/60 text-xs">
              <span className="flex items-center gap-1"><Users size="12" /> {guests.length} in room</span>
              <button
                onClick={() => cheer()}
                className="flex items-center gap-1 hover:text-primary transition-colors"
                title="Send a cheer!"
              >
                <PartyPopper size="12" /> Cheer
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom tab bar */}
      <div className="bg-card border-t border-border/50 flex items-center justify-around p-2 pb-safe z-20 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
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
          onClick={() => cheer()}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-lg text-muted-foreground hover:text-primary transition-all"
        >
          <PartyPopper size="18" />
          <span className="text-[10px] font-semibold">Cheer</span>
        </button>
      </div>
    </div>
  );
}
