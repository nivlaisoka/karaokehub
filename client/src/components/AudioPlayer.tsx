import { useEffect, useRef, forwardRef, useImperativeHandle, useState } from "react";

interface Props {
  videoId: string;
  onEnd?: () => void;
  onError?: (videoId: string) => void;
}

export interface AudioPlayerHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
}

const AudioPlayer = forwardRef<AudioPlayerHandle, Props>(({ videoId, onEnd, onError }, ref) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [loading, setLoading] = useState(true);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  onEndRef.current = onEnd;
  onErrorRef.current = onError;

  useImperativeHandle(ref, () => ({
    play: () => audioRef.current?.play(),
    pause: () => audioRef.current?.pause(),
    stop: () => { audioRef.current?.pause(); if (audioRef.current) audioRef.current.currentTime = 0; },
    seekTo: (seconds: number) => { if (audioRef.current) audioRef.current.currentTime = seconds; },
  }));

  useEffect(() => {
    setLoading(true);
    const audio = audioRef.current;
    if (!audio) return;

    audio.src = `/api/audio/${videoId}`;
    audio.load();

    const onCanPlay = () => setLoading(false);
    const onEnded = () => onEndRef.current?.();
    const onAudioError = () => {
      setLoading(false);
      onErrorRef.current?.(videoId);
    };

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onAudioError);

    let stuckTimer = setTimeout(() => {
      if (loading) onErrorRef.current?.(videoId);
    }, 15000);

    return () => {
      clearTimeout(stuckTimer);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onAudioError);
      audio.pause();
      audio.src = "";
    };
  }, [videoId]);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-950/90">
      {loading && (
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground text-xs">Loading audio stream...</p>
        </div>
      )}
      <audio ref={audioRef} className="hidden" playsInline controls={false} />
    </div>
  );
});

AudioPlayer.displayName = "AudioPlayer";
export default AudioPlayer;
