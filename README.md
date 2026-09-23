# NICU 計算機

馬偕紀念醫院新生兒科內部使用的劑量輔助工具，純前端，透過 GitHub Pages 發佈，
可直接嵌入 Google Sites。目前有兩個分頁：

1. **點滴滴速** — 依目標劑量反推 pump 滴速
2. **抗生素劑量** — 依體重／日齡查建議劑量，並覆核欲開立的醫囑

> ⚠ 本工具僅供院內臨床人員輔助計算，**非通用臨床指引**，下醫囑前務必人工驗算。
> 頁面設 `noindex`，不希望被搜尋引擎索引。

## 分頁一：點滴滴速

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

## 分頁二：抗生素劑量

依「有效體重 × 日齡」選出對應的劑量格，換算每劑劑量，並提供覆核模式。

**選格規則**（2026-09-23 定案）

| 規則 | 實作 |
|---|---|
| 有效體重 | `max(出生體重, 當下體重)` — 當下體重超過出生體重後才改用當下體重 |
| 體重帶 | `<1200 g` ／ `1200~2000 g` ／ `>2000 g`（2000 g 屬中間帶） |
| 日齡帶 | `0~7 days` ／ `>7 days`（第 7 天仍屬前者） |
| `<1200 g` 且 >4 週 | 僅原表標註1的 5 項（Ceftazidime／Meropenem×2／Oxacillin×2）interval 改 `q8h`；其餘藥明確拒答 |
| Aminoglycoside | Gentamicin 預設 ODD；勾選「已有血中濃度」後停止給建議 |
| Penicillin G | 以 `MU` 為單位 |

**安全原則**

- 範圍劑量（如 `5-7.5`）保留上下限，**不取中位數**
- 原表為空或 `------` 的格子一律拒答，**不 fallback 到鄰格**
- 每次結果都顯示「用了哪一格」與**原表字串**，可回溯
- 自由文字用法（Teicoplanin、Metronidazole loading）不做自動計算，原文呈現

資料僅含計算所需的查詢值，不重現原表版面，出處見 `data/abx-data.js` 的 `source`。

## 開發

無 build step，Tailwind 走 CDN，直接用瀏覽器開啟 `index.html` 即可。

```
index.html          兩個分頁的 UI 與滴速計算邏輯
data/abx-data.js    抗生素劑量查詢資料（程式產生，請勿手改）
lib/abx-logic.js    選格／換算／覆核邏輯（瀏覽器與測試共用）
tests/              node 原生執行，無相依套件
```

測試：

```bash
node tests/abx.test.mjs      # 資料完整性 + 選格 + 覆核（50 項）
node tests/abx-ui.test.mjs   # 抗生素分頁端到端（18 項）
node tests/wiring.test.mjs   # DOM 接線靜態檢查（9 項）
```

## 部署

push 到 `main` 後由 GitHub Pages 自動發佈。

## 注意

- 本工具僅供臨床人員輔助計算，**下醫囑前務必人工驗算**。
- 本 repo 不含任何病人資料，計算全在瀏覽器端進行，不傳送任何資料。
