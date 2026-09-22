# NICU 藥物計算機

新生兒加護病房（NICU）點滴用藥「依目標劑量反推滴速」計算器。純前端單檔 HTML，
透過 GitHub Pages 發佈，可直接嵌入 Google Sites。

## 功能

- 依「體重 + 目標劑量」反推 pump 速度（`gtt/min`；RI Pump 為 `ml/hr`）
- 支援泡濃／泡稀倍數調整，同步換算 1 gtt 的等效劑量與可用範圍
- 目標劑量自動對照建議範圍，紅／綠標示是否超出
- RI Pump 額外檢查 SIR/RI 比值（建議 3~5）
- 一鍵複製完整醫囑文字（用 `execCommand` fallback，避免 iframe 內 Clipboard API 權限問題）

## 收錄藥品

| 藥品 | 標準配法 | 建議範圍 | 單位 |
|---|---|---|---|
| Dopamine | 6 mg/kg in 100 mL | 4~20 | mcg/kg/min |
| Dobutamine | 6 mg/kg in 100 mL | 4~20 | mcg/kg/min |
| Nitroprusside | 6 mg/kg in 100 mL | 0.5~8 | mcg/kg/min |
| Dormicum | 6 mg/kg in 100 mL | 1~10 | mcg/kg/min |
| Epinephrine (Bosmin) | 0.6 mg/kg in 100 mL | 0.02~0.2 | mcg/kg/min |
| Norepinephrine (Levophed) | 0.6 mg/kg in 100 mL | 0.02~0.2 | mcg/kg/min |
| Isoproterenol | 0.6 mg/kg in 100 mL | 0.1~1 | mcg/kg/min |
| Primacor | 0.6 mg/kg in 100 mL | 0.25~0.75 | mcg/kg/min |
| NTG | 0.6 mg/kg in 100 mL | 0.5~5 | mcg/kg/min |
| PGE1 | 6 mcg/kg in 10 mL | 10~100 | ng/kg/min |
| RI Pump | 100 U in 500 mL | 0.1~0.6 | U/kg/hr |

## 開發

單一檔案 `index.html`，無 build step。Tailwind 走 CDN，直接用瀏覽器開啟即可測試。

## 部署

push 到 `main` 後由 GitHub Pages 自動發佈。

## 注意

- 本工具僅供臨床人員輔助計算，**下醫囑前務必人工驗算**。
- 本 repo 不含任何病人資料，計算全在瀏覽器端進行，不傳送任何資料。
