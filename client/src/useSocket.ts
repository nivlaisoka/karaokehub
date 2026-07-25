import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "";

export function useSocket(code: string, guestName?: string, isHost?: boolean) {
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [queue, setQueue] = useState<any[]>([]);
  const [nowPlaying, setNowPlaying] = useState<any>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [guestId, setGuestId] = useState<string | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ["websocket", "polling"] });
    socketRef.current = socket;
    setConnecting(true);
    setJoinError(null);

    socket.on("connect", () => {
      setConnected(true);
      setConnecting(false);
      socket.emit("join-room", { code, guestName, isHost });
    });

    socket.on("connect_error", () => {
      setConnecting(false);
      setJoinError("Cannot connect to server. Make sure the server is running.");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setConnecting(true);
    });

    socket.on("room-joined", (data) => {
      if (data.role === "host") setSettings(data.settings);
      if (data.role === "guest") { setGuestId(data.guestId); if (data.settings) setSettings(data.settings); }
      if (data.nowPlaying) setNowPlaying(data.nowPlaying);
      if (data.queue) setQueue(data.queue);
    });

    socket.on("queue-updated", (q) => setQueue(q));
    socket.on("now-playing", (song) => setNowPlaying(song));
    socket.on("guests-updated", (g) => setGuests(g));
    socket.on("settings-updated", (s) => setSettings(s));
    socket.on("error", (msg) => {
      setJoinError(String(msg));
    });

    return () => { socket.disconnect(); };
  }, [code, guestName, isHost]);

  const addSong = (song: any) => {
    socketRef.current?.emit("add-song", { code, song });
  };

  const playNext = () => {
    socketRef.current?.emit("play-next", { code });
  };

  const removeSong = (songId: string) => {
    socketRef.current?.emit("remove-song", { code, songId });
  };

  const updateSettings = (newSettings: any) => {
    socketRef.current?.emit("update-settings", { code, settings: newSettings });
  };

  const voteSong = (songId: string, delta: number) => {
    socketRef.current?.emit("vote-song", { code, songId, delta });
  };

  const cheer = () => {
    socketRef.current?.emit("cheer", { code });
  };

  const sendPlaybackControl = (action: "play" | "pause" | "stop" | "skip") => {
    socketRef.current?.emit("guest-playback-control", { code, action });
  };

  return {
    connected,
    connecting,
    queue,
    nowPlaying,
    guests,
    guestId,
    settings,
    joinError,
    addSong,
    playNext,
    removeSong,
    updateSettings,
    voteSong,
    cheer,
    sendPlaybackControl,
    socket: socketRef.current,
  };
}
