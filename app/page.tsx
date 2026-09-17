"use client";

import { useState, useEffect, useRef } from "react";

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
  const [isScanning, setIsScanning] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>("カメラ停止中");
  const [manualInput, setManualInput] = useState("");
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastScannedTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string | null>(null);

  // バーコード追加処理
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

  // 手動入力追加
  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manualInput.trim();
    if (!code) return;
    handleScanSuccess(code);
    setLastScanned(code);
    setManualInput("");
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

  // スキャン開始
  const startScanner = async () => {
    try {
      setStatusMsg("カメラ起動中...");

      // 既存ストリーム停止
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }

      // スマホ背面カメラを要求
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsScanning(true);
      setStatusMsg("バーコードをかざしてください");

      // BarcodeDetectorの存在確認
      let detector: any = null;
      if ("BarcodeDetector" in window) {
        try {
          detector = new (window as any).BarcodeDetector({
            formats: ["ean_13", "ean_8", "code_128", "upc_a", "upc_e", "qr_code"],
          });
        } catch (e) {
          console.warn("BarcodeDetector formats error:", e);
        }
      }

      // ループスキャン処理
      const scanLoop = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animFrameRef.current = requestAnimationFrame(scanLoop);
          return;
        }

        if (detector) {
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const code = barcodes[0].rawValue;
              const now = Date.now();
              if (
                code !== lastScannedCodeRef.current ||
                now - lastScannedTimeRef.current > 1500
              ) {
                lastScannedCodeRef.current = code;
                lastScannedTimeRef.current = now;
                setLastScanned(code);
                handleScanSuccess(code);

                if (navigator.vibrate) {
                  navigator.vibrate(100);
                }
              }
            }
          } catch (e) {
            // detect error ignore
          }
        }

        animFrameRef.current = requestAnimationFrame(scanLoop);
      };

      animFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: any) {
      console.error(err);
      setStatusMsg("カメラの起動に失敗しました。カメラ権限を確認してください。");
    }
  };

  // スキャン停止
  const stopScanner = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsScanning(false);
    setStatusMsg("カメラ停止中");
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const itemList = Object.values(items);
  const totalCount = itemList.reduce((acc, cur) => acc + cur.actualCount, 0);

  return (
    <main className="min-h-screen bg-gray-50 p-4 pb-20 max-w-lg mx-auto">
      <header className="mb-4 text-center">
        <h1 className="text-xl font-bold text-gray-800">スマホ棚卸しスキャナー</h1>
        <p className="text-xs text-gray-500 mt-1">{statusMsg}</p>
      </header>

      {/* カメラプレビュー */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 mb-4 flex flex-col items-center">
        <div className="relative w-full aspect-[4/3] max-w-sm rounded-xl overflow-hidden bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            className={`w-full h-full object-cover ${!isScanning ? "hidden" : ""}`}
          />
          {!isScanning && (
            <div className="text-gray-400 text-sm">カメラ未起動</div>
          )}
          {isScanning && (
            <div className="absolute inset-0 border-2 border-dashed border-red-500/50 pointer-events-none flex items-center justify-center">
              <div className="w-3/4 h-24 border-2 border-red-500 rounded-lg"></div>
            </div>
          )}
        </div>

        {lastScanned && (
          <div className="mt-2 py-1 px-4 bg-emerald-100 text-emerald-800 font-mono font-bold text-sm rounded-full animate-bounce">
            読取成功: {lastScanned}
          </div>
        )}

        <div className="mt-3">
          {!isScanning ? (
            <button
              onClick={startScanner}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-semibold rounded-xl shadow transition"
            >
              カメラを起動
            </button>
          ) : (
            <button
              onClick={stopScanner}
              className="px-6 py-2.5 bg-gray-600 hover:bg-gray-700 active:scale-95 text-white font-semibold rounded-xl shadow transition"
            >
              カメラを停止
            </button>
          )}
        </div>
      </div>

      {/* 手動バーコード入力フォーム */}
      <form onSubmit={handleManualAdd} className="mb-5 flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="バーコード手動入力 (例: 4902370...)"
          value={manualInput}
          onChange={(e) => setManualInput(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-xl text-sm outline-none focus:border-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-gray-800 text-white text-sm font-semibold rounded-xl active:scale-95"
        >
          追加
        </button>
      </form>

      {/* 棚卸し集計リスト */}
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
            スキャンまたは手動入力した商品がここに表示されます
          </div>
        ) : (
          itemList.map((item) => (
            <div
              key={item.barcode}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-xl shadow-sm"
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
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200 text-gray-700 font-bold text-lg"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-base text-gray-900">
                  {item.actualCount}
                </span>
                <button
                  onClick={() => handleManualCountChange(item.barcode, 1)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 active:bg-gray-200 text-gray-700 font-bold text-lg"
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
