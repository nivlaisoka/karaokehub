import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";

interface Props {
  videoId: string;
  onEnd?: () => void;
  onError?: (videoId: string) => void;
  muted?: boolean;
}

export interface YouTubePlayerHandle {
  play: () => void;
  pause: () => void;
  stop: () => void;
  seekTo: (seconds: number) => void;
}

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: HTMLElement,
        config: {
          videoId?: string;
          width?: string | number;
          height?: string | number;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: any }) => void;
            onStateChange?: (event: { data: number }) => void;
            onError?: (event: { data: number }) => void;
          };
        }
      ) => any;
      PlayerState?: { ENDED: number; PLAYING: number; PAUSED: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const PLAYER_STATE_ENDED = 0;

const YouTubePlayer = forwardRef<YouTubePlayerHandle, Props>(({ videoId, onEnd, onError, muted }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const onEndRef = useRef(onEnd);
  const onErrorRef = useRef(onError);
  const startedRef = useRef(false);
  onEndRef.current = onEnd;
  onErrorRef.current = onError;

  useImperativeHandle(ref, () => ({
    play: () => playerRef.current?.playVideo?.(),
    pause: () => playerRef.current?.pauseVideo?.(),
    stop: () => playerRef.current?.stopVideo?.(),
    seekTo: (seconds: number) => playerRef.current?.seekTo?.(seconds, true),
  }));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    startedRef.current = false;

    let stuckTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      if (!startedRef.current) {
        onErrorRef.current?.(videoId);
      }
    }, 20000);

    const apiReady = () => {
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }
      playerRef.current = new window.YT!.Player(container, {
        videoId,
        width: "100%",
        height: "100%",
        playerVars: {
          autoplay: 1,
          controls: muted ? 1 : 0,
          disablekb: 1,
          rel: 0,
          modestbranding: 1,
          iv_load_policy: 3,
          fs: 0,
          playsinline: 1,
          mute: muted ? 1 : 0,
          origin: window.location.origin,
        },
        events: {
          onStateChange: (e: { data: number }) => {
            if (e.data === PLAYER_STATE_ENDED) {
              onEndRef.current?.();
            } else if (e.data === 1) {
              startedRef.current = true;
              if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; }
            }
          },
          onError: (e: { data: number }) => {
            console.warn(`YT player error (videoId=${videoId}) code=${e.data}`);
            onErrorRef.current?.(videoId);
          },
        },
      });
    };

    if (window.YT?.Player) {
      apiReady();
    } else {
      if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
      const existing = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        existing?.();
        apiReady();
      };
    }

    return () => {
      if (stuckTimer) { clearTimeout(stuckTimer); stuckTimer = null; }
      if (playerRef.current) {
        try { playerRef.current.stopVideo(); } catch {}
        try { if (container?.isConnected) playerRef.current.destroy(); } catch {}
        playerRef.current = null;
      }
    };
  }, [videoId]);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full" />;
});

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;
