import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface Props {
  code: string;
  size?: number;
}

export default function RoomQR({ code, size = 180 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const joinUrl = `${window.location.protocol}//${window.location.host}/guest/${code}`;
    setUrl(joinUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, joinUrl, {
        width: size,
        margin: 2,
        color: { dark: "#1a1a2e", light: "#ffffff" },
      });
    }
  }, [code, size]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="bg-white rounded-2xl p-3">
        <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />
      </div>
      <div className="text-center">
        <p className="text-primary font-mono text-2xl font-bold tracking-widest">{code}</p>
        <p className="text-muted-foreground text-xs mt-1">Scan to join or enter code</p>
      </div>
      <button
        onClick={copyLink}
        className="text-xs text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/70 px-3 py-1.5 rounded-lg transition-colors"
      >
        {copied ? "Copied!" : "Copy join link"}
      </button>
    </div>
  );
}
