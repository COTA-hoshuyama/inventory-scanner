"use client";

import { useState } from "react";
import BarcodeScanner from "@/components/BarcodeScanner";

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
      <header className="mb-4">
        <h1 className="text-xl font-bold text-gray-800">スマホ棚卸しスキャナー</h1>
        <p className="text-xs text-gray-500">
          カメラでバーコードを枠内に合わせると自動でカウントされます。
        </p>
      </header>

      <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <BarcodeScanner onScanSuccess={handleScanSuccess} />
      </section>

      <div className="flex justify-between items-center mb-3">
        <div className="text-sm font-medium text-gray-700">
          読み取り合計: <span className="text-lg font-bold text-blue-600">{totalCount}</span> 点（{itemList.length} SKU）
        </div>
        {itemList.length > 0 && (
          <button
            onClick={handleReset}
            className="text-xs text-red-500 hover:underline"
          >
            クリア
          </button>
        )}
      </div>

      <section className="space-y-2">
        {itemList.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
            スキャンした商品がここに表示されます
          </div>
        ) : (
          itemList.map((item) => (
            <div
              key={item.barcode}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="font-semibold text-gray-800 text-sm truncate">
                  {item.name}
                </div>
                <div className="text-xs text-gray-400 font-mono">
                  {item.barcode}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleManualCountChange(item.barcode, -1)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 active:bg-gray-200 text-gray-700 font-bold"
                >
                  -
                </button>
                <span className="w-8 text-center font-bold text-base text-gray-900">
                  {item.actualCount}
                </span>
                <button
                  onClick={() => handleManualCountChange(item.barcode, 1)}
                  className="w-8 h-8 flex items-center justify-center rounded bg-gray-100 active:bg-gray-200 text-gray-700 font-bold"
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
