"use client";

import { useState, useEffect, useRef } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";

interface Props {
  onScanSuccess: (decodedText: string) => void;
}

function BarcodeScanner({ onScanSuccess }: Props) {
  const [isScanning, setIsScanning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [zoomSupported, setZoomSupported] = useState<boolean>(false);
  const [minZoom, setMinZoom] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(3);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const elementId = "html5-qrcode-reader";

  const startScanner = async () => {
    try {
      setErrorMessage(null);

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (_) {}
      }

      const scanner = new Html5Qrcode(elementId);
      scannerRef.current = scanner;

      const config = {
        fps: 20,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const width = Math.min(Math.floor(viewfinderWidth * 0.88), 320);
          const height = Math.min(Math.floor(viewfinderHeight * 0.4), 160);
          return { width, height };
        },
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
        ],
      };

      // 背面カメラかつフォーカス優先
      await scanner.start(
        {
          facingMode: "environment",
          advanced: [{ focusMode: "continuous" } as any],
        } as any,
        config,
        (decodedText) => {
          const now = Date.now();
          if (
            decodedText === lastScannedCodeRef.current &&
            now - lastScannedTimeRef.current < 1200
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

      // カメラのハードウェア機能（ズーム/ライト）を検出
      try {
        const capabilities = scanner.getRunningTrackCapabilities() as any;
        if (capabilities?.zoom) {
          setZoomSupported(true);
          setMinZoom(capabilities.zoom.min || 1);
          setMaxZoom(capabilities.zoom.max || 5);
          setZoomLevel(capabilities.zoom.min || 1);
        }
        if (capabilities?.torch) {
          setTorchSupported(true);
        }
      } catch (e) {
        console.warn("Capabilities not supported", e);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setErrorMessage(
        "カメラを起動できませんでした。ブラウザのカメラ権限を確認してください。"
      );
    }
  };

  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (scannerRef.current) {
      try {
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ zoom: newZoom } as any],
        } as any);
      } catch (e) {
        console.warn("Failed to apply zoom", e);
      }
    }
  };

  const handleToggleTorch = async () => {
    if (scannerRef.current && torchSupported) {
      try {
        const nextTorch = !torchOn;
        await scannerRef.current.applyVideoConstraints({
          advanced: [{ torch: nextTorch } as any],
        } as any);
        setTorchOn(nextTorch);
      } catch (e) {
        console.warn("Failed to toggle torch", e);
      }
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
      setTorchOn(false);
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
        className="w-full max-w-sm rounded-xl overflow-hidden bg-black border border-gray-700 min-h-[240px] relative shadow-inner"
      />

      {isScanning && (
        <div className="w-full max-w-sm mt-3 space-y-2 bg-gray-50 p-3 rounded-xl border border-gray-200">
          {zoomSupported ? (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 font-semibold w-12">ズーム</span>
              <input
                type="range"
                min={minZoom}
                max={Math.min(maxZoom, 4)}
                step="0.1"
                value={zoomLevel}
                onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
                className="w-full accent-blue-600 h-2 bg-gray-200 rounded-lg cursor-pointer"
              />
              <span className="text-xs font-mono text-gray-700 w-8 text-right">
                {zoomLevel.toFixed(1)}x
              </span>
            </div>
          ) : (
            <p className="text-[11px] text-gray-500 text-center">
              💡 ピントが合わない時は、スマホを15〜20cmほど離して撮影してください
            </p>
          )}

          {torchSupported && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleToggleTorch}
                className={`text-xs px-3 py-1 rounded-full font-medium transition ${
                  torchOn
                    ? "bg-amber-400 text-gray-900 shadow"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {torchOn ? "🔦 ライトON" : "🔦 ライトOFF"}
              </button>
            </div>
          )}
        </div>
      )}

      {errorMessage && (
        <div className="p-3 mt-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs text-center w-full max-w-sm">
          {errorMessage}
        </div>
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
          バーコードを枠の中央に合わせてください。
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
