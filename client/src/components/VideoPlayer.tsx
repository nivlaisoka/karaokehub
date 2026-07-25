import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

interface Props {
  videoId: string;
  onEnd?: () => void;
  onError?: (videoId: string) => void;
  muted?: boolean;
}

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
}

const VideoPlayer = forwardRef<VideoPlayerHandle, Props>(({ videoId, onEnd, onError, muted }, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  onEndRef.current = onEnd;
  onErrorRef.current = onError;

  useImperativeHandle(ref, () => ({
    play: () => videoRef.current?.play().catch(() => {}),
    pause: () => videoRef.current?.pause(),
    stop: () => { if (videoRef.current) { videoRef.current.pause(); videoRef.current.src = ""; } },
    seekTo: (seconds: number) => { if (videoRef.current) videoRef.current.currentTime = seconds; },
  }));

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    let cancelled = false;

    fetch(`/api/video/url/${videoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.url) return;
        el.src = data.url;
        el.load();
        el.play().catch(() => {});
      })
      .catch(() => {
        if (!cancelled) onErrorRef.current?.(videoId);
      });

    return () => {
      cancelled = true;
      el.pause();
      el.src = "";
    };
  }, [videoId]);

  return (
    <video
      ref={videoRef}
      className="absolute inset-0 w-full h-full"
      muted={muted}
      playsInline
      onEnded={() => onEndRef.current?.()}
      onError={() => onErrorRef.current?.(videoId)}
    />
  );
});

VideoPlayer.displayName = "VideoPlayer";
export default VideoPlayer;
