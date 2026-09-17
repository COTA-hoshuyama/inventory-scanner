"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface Props {
  onScanSuccess: (decodedText: string) => void;
}

function BarcodeScanner({ onScanSuccess }: Props) {
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

      // バーコード認識に最適化した設定
      const config = {
        fps: 20, // 認識頻度を2倍に向上（より俊敏に反応）
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          // 画面幅に合わせた横長の読み取り枠を動的に設定
          const width = Math.floor(viewfinderWidth * 0.85);
          const height = Math.floor(viewfinderHeight * 0.35);
          return { width, height };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13, // 日本の標準JANコード
          Html5QrcodeSupportedFormats.EAN_8,  // 短縮JANコード
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true, // スマホ内蔵の高速ハードウェア検知機能を使用
        },
      };

      // 背面カメラかつ高画質（フルHD優先）で起動
      await scanner.start(
        {
          facingMode: "environment",
          width: { min: 640, ideal: 1280, max: 1920 },
          height: { min: 480, ideal: 720, max: 1080 },
        },
        config,
        (decodedText) => {
          const now = Date.now();
          // 同じバーコードの重複連続読み取りを防ぐ（1.2秒ディレイ）
          if (
            decodedText === lastScannedCodeRef.current &&
            now - lastScannedTimeRef.current < 1200
          ) {
            return;
          }

          lastScannedCodeRef.current = decodedText;
          lastScannedTimeRef.current = now;

          // バイブレーション通知
          if (typeof window !== "undefined" && window.navigator.vibrate) {
            window.navigator.vibrate(120);
          }

          onScanSuccess(decodedText);
        },
        () => {}
      );

      setIsScanning(true);
    } catch (err: any) {
      console.error("Camera start failed:", err);
      setErrorMessage("カメラの起動に失敗しました。カメラの利用権限を確認してください。");
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error("Failed to stop scanner", e);
      }
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
        className="w-full max-w-sm rounded-xl overflow-hidden bg-black border border-gray-700 min-h-[260px] shadow-inner"
      />

      {errorMessage && (
        <p className="text-red-500 text-sm mt-2">{errorMessage}</p>
      )}

      <div className="mt-4 flex gap-2">
        {!isScanning ? (
          <button
            onClick={startScanner}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold rounded-xl shadow-md active:scale-95 transition"
          >
            カメラを起動してスキャン
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 active:bg-gray-800 text-white font-semibold rounded-xl shadow-md active:scale-95 transition"
          >
            カメラを停止
          </button>
        )}
      </div>
    </div>
  );
}

interface InventoryItem {
  barcode: string;
  name: string;
  actualCount: number;
}

const PRODUCT_MASTER: Record<string, string> = {
  "4902370548433": "Nintendo Switch 本体",
  "4549660853502": "ONE PIECEカードゲーム ブースター",
  "4988601009999": "スクウェア・エニックス ゲームソフト",
};

export default function InventoryPage() {
  const [items, setItems] = useState<Record<string, InventoryItem>>({});

  const handleScanSuccess = (barcode: string) => {
    setItems((prev) => {
      const existing = prev[barcode];
      const name = PRODUCT_MASTER[barcode] || "未登録商品";

      return {
        ...prev,
        [barcode]: {
          barcode,
          name,
          actualCount: existing ? existing.actualCount + 1 : 1,
        },
      };
    });
  };

  const handleManualCountChange = (barcode: string, delta: number) => {
    setItems((prev) => {
      const existing = prev[barcode];
      if (!existing) return prev;
      const newCount = Math.max(0, existing.actualCount + delta);
      return {
        ...prev,
        [barcode]: { ...existing, actualCount: newCount },
      };
    });
  };

  const handleReset = () => {
    if (confirm("棚卸しカウントをリセットしますか？")) {
      setItems({});
    }
  };

  const itemList = Object.values(items);
  const totalCount = itemList.reduce((acc, cur) => acc + cur.actualCount, 0);

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-20 max-w-lg mx-auto">
      <header className="mb-4 text-center">
        <h1 className="text-xl font-bold text-gray-800">スマホ棚卸しスキャナー</h1>
        <p className="text-xs text-gray-500 mt-1">
          バーコードを横長枠の中央に合わせると自動で認識されます。
        </p>
      </header>

      <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-5">
        <BarcodeScanner onScanSuccess={handleScanSuccess} />
      </section>

      <div className="flex justify-between items-center mb-3 px-1">
        <div className="text-sm font-medium text-gray-700">
          合計数量: <span className="text-xl font-bold text-blue-600">{totalCount}</span> 点（{itemList.length} SKU）
        </div>
        {itemList.length > 0 && (
          <button
            onClick={handleReset}
            className="text-xs text-red-500 hover:underline px-2 py-1"
          >
            クリア
          </button>
        )}
      </div>

      <section className="space-y-2">
        {itemList.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
            スキャンした商品がここに表示されます
          </div>
        ) : (
          itemList.map((item) => (
            <div
              key={item.barcode}
              className="flex items-center justify-between p-3.5 bg-white border border-gray-200 rounded-xl shadow-sm"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="font-semibold text-gray-800 text-sm truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-400 font-mono mt-0.5">
                  {item.barcode}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleManualCountChange(item.barcode, -1)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200 text-gray-700 font-bold text-lg transition"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-base text-gray-900">
                  {item.actualCount}
                </span>
                <button
                  onClick={() => handleManualCountChange(item.barcode, 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200 text-gray-700 font-bold text-lg transition"
                >
                  +
                </button>
              </div>
            </div>
          ))
        )}
      </section>
    </main>
  );
}
