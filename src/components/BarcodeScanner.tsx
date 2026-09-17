"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface Props {
  onScanSuccess: (decodedText: string) => void;
}

export default function BarcodeScanner({ onScanSuccess }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const elementId = "html5-qrcode-reader";

  const startScanner = async () => {
    try {
      setErrorMessage(null);
      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
        ],
      };

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          const now = Date.now();
          if (
            decodedText === lastScannedCodeRef.current &&
            now - lastScannedTimeRef.current < 1500
          ) {
            return;
          }

          lastScannedCodeRef.current = decodedText;
          lastScannedTimeRef.current = now;

          if (typeof window !== "undefined" && window.navigator.vibrate) {
            window.navigator.vibrate(100);
          }

          onScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera start failed:", err);
      setErrorMessage("カメラの起動に失敗しました。カメラ権限を確認してください。");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      await scannerRef.current.stop();
      scannerRef.current.clear();
      setIsScanning(false);
    }
  };

  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="w-full flex flex-col items-center">
      <div
        id={elementId}
        className="w-full max-w-sm rounded-lg overflow-hidden bg-black border border-gray-700 min-h-[220px]"
      />

      {errorMessage && (
        <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
      )}

      <div className="mt-4 flex gap-2">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow active:scale-95 transition"
          >
            カメラを起動してスキャン
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="px-5 py-2.5 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg shadow active:scale-95 transition"
          >
            カメラを停止
          </button>
        )}
      </div>
    </div>
  );
}
