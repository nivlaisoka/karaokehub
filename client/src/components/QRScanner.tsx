import { useEffect, useRef, useState } from "react";
import { X, Camera, CameraOff } from "lucide-react";

interface Props {
  onScan: (code: string) => void;
  onClose: () => void;
}

export default function QRScanner({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let cancel = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancel) { stream.getTracks().forEach((t) => t.stop()); return; }
        if (videoRef.current) videoRef.current.srcObject = stream;
        setScanning(true);
      } catch {
        setError("Camera access denied or not available.");
      }
    }

    start();
    return () => { cancel = true; };
  }, []);

  useEffect(() => {
    if (!scanning) return;
    let active = true;

    async function scan() {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!active) return;

      const scanner = new Html5Qrcode("qr-reader");
      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (text) => {
            active = false;
            scanner.stop().catch(() => {});
            const match = text.match(/\/guest\/([A-Z0-9]{4,6})/i) || text.match(/^([A-Z0-9]{4,6})$/);
            if (match) onScan(match[1].toUpperCase());
          },
          () => {}
        );
      } catch {
        setError("Camera access failed.");
      }
    }

    scan();
    return () => { active = false; };
  }, [scanning, onScan]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-sm">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
          <h3 className="font-semibold text-sm">Scan QR Code</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size="20" />
          </button>
        </div>
        <div className="p-4">
          <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
            <div id="qr-reader" className="w-full h-full" />
            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-gray-500">
                <Camera size="32" className="animate-pulse" />
              </div>
            )}
          </div>
          {error && (
            <div className="mt-3 bg-red-900/50 border border-red-500 text-red-200 rounded-lg p-3 text-sm text-center">
              {error}
            </div>
          )}
          <p className="text-gray-500 text-xs text-center mt-3">
            Point your camera at the host's QR code
          </p>
        </div>
      </div>
    </div>
  );
}
