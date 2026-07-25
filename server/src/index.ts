import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { search as ytSearch } from "yt-search";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLIENT_DIR = process.env.CLIENT_DIR
  ? path.resolve(process.env.CLIENT_DIR)
  : path.resolve(__dirname, "../../client/dist");

app.use(express.static(CLIENT_DIR));
interface Song {
  id: string;
  title: string;
  artist: string;
  duration: string;
  videoId: string;
  thumbnail: string;
}

interface QueueItem {
  id: string;
  song: Song;
  guestId: string;
  guestName: string;
  votes: number;
}

interface Room {
  id: string;
  code: string;
  hostId: string;
  queue: QueueItem[];
  nowPlaying: QueueItem | null;
  guests: Map<string, { id: string; name: string }>;
  settings: RoomSettings;
  startedAt: number;
}

interface RoomSettings {
  autoPlay: boolean;
  guestPlayback: boolean;
  cheering: boolean;
  scoring: boolean;
  maxSongsPerGuest: number;
}

const rooms = new Map<string, Room>();

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

app.get("/api/search/songs", async (req, res) => {
  const query = req.query.q as string;
  if (!query) return res.json({ songs: [] });

  try {
    const results = await ytSearch(query);
    const videos = (results.videos || []).slice(0, 15);
    const songs: Song[] = videos.map((v: any) => ({
      id: uuidv4(),
      title: v.title || "Unknown",
      artist: v.author?.name || "Unknown",
      duration: formatDuration(v.duration?.seconds || v.seconds || 0),
      videoId: v.videoId,
      thumbnail: `https://i.ytimg.com/vi/${v.videoId}/default.jpg`,
    }));
    return res.json({ songs });
  } catch (err) {
    console.error("yt-search error:", err);
    return res.json({ songs: [] });
  }
});

app.post("/api/rooms", (req, res) => {
  const { hostName } = req.body;
  const id = uuidv4();
  const code = generateCode();
  const room: Room = {
    id,
    code,
    hostId: id,
    queue: [],
    nowPlaying: null,
    guests: new Map(),
    settings: {
      autoPlay: true,
      guestPlayback: false,
      cheering: true,
      scoring: false,
      maxSongsPerGuest: 5,
    },
    startedAt: Date.now(),
  };
  rooms.set(code, room);
  res.json({ code, roomId: id });
});

app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code);
  if (!room) return res.status(404).json({ error: "Room not found" });
  res.json({
    code: room.code,
    queue: room.queue,
    nowPlaying: room.nowPlaying,
    settings: room.settings,
    guests: Array.from(room.guests.values()),
    startedAt: room.startedAt,
  });
});

io.on("connection", (socket) => {
  let currentRoom: string | null = null;

  socket.on("join-room", ({ code, guestName, isHost }) => {
    const room = rooms.get(code);
    if (!room) {
      socket.emit("error", "Room not found");
      return;
    }
    currentRoom = code;
    socket.join(code);

    const state = {
      queue: room.queue,
      nowPlaying: room.nowPlaying,
      settings: room.settings,
    };
    if (isHost) {
      socket.emit("room-joined", { role: "host", code, ...state });
    } else {
      const guestId = uuidv4();
      room.guests.set(guestId, { id: guestId, name: guestName || "Anonymous" });
      socket.data.guestId = guestId;
      socket.emit("room-joined", { role: "guest", code, guestId, ...state });
      io.to(code).emit("guests-updated", Array.from(room.guests.values()));
    }
  });

  socket.on("add-song", ({ code, song }) => {
    const room = rooms.get(code);
    if (!room) return;
    const guestId = socket.data.guestId;
    const guest = room.guests.get(guestId);
    if (guestId && room.settings.maxSongsPerGuest > 0) {
      const guestCount = room.queue.filter((q) => q.guestId === guestId).length;
      if (guestCount >= room.settings.maxSongsPerGuest) {
        socket.emit("error", `You can only queue up to ${room.settings.maxSongsPerGuest} songs`);
        return;
      }
    }
    const item: QueueItem = {
      id: uuidv4(),
      song,
      guestId,
      guestName: guest?.name || "Unknown",
      votes: 0,
    };
    room.queue.push(item);
    room.queue = sortQueue(room.queue);
    io.to(code).emit("queue-updated", room.queue);
    if (!room.nowPlaying && room.settings.autoPlay) {
      playNext(room, code);
    }
  });

  socket.on("play-next", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    const guestId = socket.data.guestId;
    if (!guestId) { playNext(room, code); return; }
    if (room.nowPlaying && room.nowPlaying.guestId !== guestId) {
      socket.emit("error", "Only the person who added this song can skip it");
      return;
    }
    playNext(room, code);
  });

  socket.on("remove-song", ({ code, songId }) => {
    const room = rooms.get(code);
    if (!room) return;
    const guestId = socket.data.guestId;
    if (guestId) {
      const item = room.queue.find((q) => q.id === songId);
      if (item && item.guestId !== guestId) {
        socket.emit("error", "You can only remove songs you added");
        return;
      }
    }
    room.queue = sortQueue(room.queue.filter((q) => q.id !== songId));
    io.to(code).emit("queue-updated", room.queue);
  });

  socket.on("cheer", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    io.to(code).emit("cheer", { guestId: socket.data.guestId });
  });

  socket.on("guest-playback-control", ({ code, action }) => {
    const room = rooms.get(code);
    if (!room) return;
    const guestId = socket.data.guestId;
    if (guestId && room.nowPlaying && room.nowPlaying.guestId !== guestId) {
      socket.emit("error", "Only the person who added this song can control it");
      return;
    }
    if (action === "skip") {
      playNext(room, code);
    } else {
      socket.to(code).emit("guest-playback-control", { action, guestId });
    }
  });

  socket.on("vote-song", ({ code, songId, delta }) => {
    const room = rooms.get(code);
    if (!room) return;
    const item = room.queue.find((q) => q.id === songId);
    if (item) {
      item.votes = Math.max(0, (item.votes || 0) + delta);
      io.to(code).emit("queue-updated", room.queue);
    }
  });

  socket.on("update-settings", ({ code, settings }) => {
    const room = rooms.get(code);
    if (!room) return;
    Object.assign(room.settings, settings);
    io.to(code).emit("settings-updated", room.settings);
  });

  socket.on("disconnect", () => {
    if (currentRoom) {
      const room = rooms.get(currentRoom);
      if (room && socket.data.guestId) {
        room.guests.delete(socket.data.guestId);
        io.to(currentRoom).emit("guests-updated", Array.from(room.guests.values()));
      }
    }
  });
});

function sortQueue(queue: QueueItem[]) {
  return queue.sort((a, b) => (b.votes || 0) - (a.votes || 0));
}

function playNext(room: Room, code: string) {
  if (room.queue.length === 0) {
    room.nowPlaying = null;
    io.to(code).emit("now-playing", null);
    return;
  }
  room.queue = sortQueue(room.queue);
  room.nowPlaying = room.queue.shift()!;
  io.to(code).emit("queue-updated", room.queue);
  io.to(code).emit("now-playing", room.nowPlaying);
}



app.get("*", (_req, res) => {
  res.sendFile("index.html", { root: CLIENT_DIR });
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT:", err);
});
process.on("unhandledRejection", (err) => {
  console.error("UNHANDLED:", err);
});

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
