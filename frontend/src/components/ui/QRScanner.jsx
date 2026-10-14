import { useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";

export default function QRScanner({ onDetected, onClose }) {
  const scannerRef = useRef(null);
  const runningRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: 250,
        },
        (decodedText) => {
          if (!runningRef.current) return;

          runningRef.current = false;

          scanner.stop().then(() => {
            onDetected(decodedText);
          });
        },
        () => {},
      )
      .then(() => {
        runningRef.current = true;
      })
      .catch(console.error);

    return () => {
      if (runningRef.current && scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        runningRef.current = false;
      }
    };
  }, []);

  return (
    <div className="p-4">
      <div id="reader" className="w-full"></div>

      <div className="flex justify-end mt-4">
        <button
          onClick={() => {
            if (runningRef.current && scannerRef.current) {
              scannerRef.current.stop().catch(() => {});
              runningRef.current = false;
            }
            onClose();
          }}
          className="px-4 py-2 bg-red-500 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
}
