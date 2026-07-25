import { Settings, X, UserPlus, Music, PartyPopper, Star, Play, Users } from "lucide-react";

interface RoomSettingsData {
  autoPlay: boolean;
  guestPlayback: boolean;
  cheering: boolean;
  scoring: boolean;
  maxSongsPerGuest: number;
}

interface Props {
  settings: RoomSettingsData;
  onUpdate: (s: RoomSettingsData) => void;
  onClose: () => void;
}

export default function RoomSettings({ settings, onUpdate, onClose }: Props) {
  const toggle = (key: keyof RoomSettingsData) => {
    if (key === "maxSongsPerGuest") return;
    onUpdate({ ...settings, [key]: !settings[key] });
  };

  const setMax = (val: number) => {
    onUpdate({ ...settings, maxSongsPerGuest: Math.max(1, Math.min(20, val)) });
  };

  const items: { key: keyof RoomSettingsData; label: string; desc: string; icon: React.ReactNode }[] = [
    { key: "autoPlay", label: "Auto Play", desc: "Automatically play the next song", icon: <Play size="16" /> },
    { key: "guestPlayback", label: "Guest Control", desc: "Let guests skip and reorder", icon: <UserPlus size="16" /> },
    { key: "cheering", label: "Cheering", desc: "Allow guests to send cheers", icon: <PartyPopper size="16" /> },
    { key: "scoring", label: "Scoring", desc: "Rate performances after each song", icon: <Star size="16" /> },
    { key: "maxSongsPerGuest", label: "Max per Guest", desc: "Songs each guest can queue", icon: <Music size="16" /> },
  ];

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-background/95 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-border/50 shadow-2xl bg-card" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Settings size="18" className="text-primary" />
            <h2 className="font-semibold text-sm">Room Settings</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 transition-colors">
            <X size="18" />
          </button>
        </div>
        <div className="p-2 space-y-0.5">
          {items.map(({ key, label, desc, icon }) => (
            <div key={key} className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50">
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">{icon}</span>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
              {key === "maxSongsPerGuest" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMax(settings.maxSongsPerGuest - 1)}
                    className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center text-sm transition-colors"
                  >-</button>
                  <span className="text-sm font-mono w-6 text-center text-primary tabular-nums">{settings.maxSongsPerGuest}</span>
                  <button
                    onClick={() => setMax(settings.maxSongsPerGuest + 1)}
                    className="w-7 h-7 rounded-lg bg-secondary text-muted-foreground hover:text-foreground flex items-center justify-center text-sm transition-colors"
                  >+</button>
                </div>
              ) : (
                <button
                  onClick={() => toggle(key)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${settings[key] ? "bg-primary" : "bg-secondary"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${settings[key] ? "translate-x-5" : ""}`} />
                </button>
              )}
            </div>
          ))}
        </div>
        <div className="p-4 border-t border-border/50">
          <p className="text-xs text-muted-foreground/60 text-center">
            <Users size="12" className="inline mr-1" />Settings apply to all guests in the room
          </p>
        </div>
      </div>
    </div>
  );
}
