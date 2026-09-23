# NICU 計算機

馬偕紀念醫院新生兒科內部使用的劑量輔助工具，純前端，透過 GitHub Pages 發佈，
可直接嵌入 Google Sites。目前有兩個分頁：

1. **點滴滴速** — 依目標劑量反推 pump 滴速
2. **抗生素劑量** — 依體重／日齡查建議劑量，並覆核欲開立的醫囑
3. **其他藥物** — Surfactant／AOP／PDA 依體重換算劑量，並覆核
4. **Fluconazole** — 治療／預防／依適應症三種用途，含腎功能調整與輸注限制

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

## 分頁三：其他藥物

| 分類 | 收錄 |
|---|---|
| Surfactant | Curosurf（初次 2.5 mL/kg、重複 1.25 mL/kg）、Survanta（4 mL/kg） |
| AOP | Aminophylline（loading 5／maintenance 2 mg/kg Q12H）、Caffeine citrate（loading 20／maintenance 5-10 mg/kg QD） |
| PDA | Ibuprofen standard／high-dose 三劑療程、Paracetamol PO、Propacetamol IV |

除了每劑劑量，另外反推兩種容積：

- **Ibuprofen**：依 IV 最高濃度 4 mg/mL 算出「至少需稀釋至幾 mL」
- **Aminophylline**：改用 Theophylline Soln（5.34 mg/mL）口服時需抽取的容積

Aminophylline 與 Caffeine 另顯示有效血中濃度與 toxic level。
依裁決 6，**不收錄 Indomethacin**（院內無藥），並有測試把關。

## 分頁四：Fluconazole

三種用途：

| 用途 | 劑量 | interval |
|---|---|---|
| 治療（早產兒） | loading 12~25、maintenance 12 mg/kg/dose | 依 GA × 日齡：GA <30 週以 14 天為界、GA ≥30 週以 7 天為界，q48h／q24h |
| 預防 | 3 mg/kg/dose | Twice weekly，IVD 60 分鐘 |
| 依適應症 | Day 1 與 daily therapy 依適應症 | QD |

另外計算：

- **腎功能調整**：填入 CCr，< 50 時自動給 50% 並標示
- **輸注限制**：依 2 mg/mL 算稀釋容積，並取「至少 2 小時」與「最高 200 mg/hr」兩者中較長者為最短輸注時間
- **預防劑量無條件進位至整數**（1.1 kg → 3.3 mg → 4 mg）

⚠ **GA 分界的判讀**：來源文件原文為「≦GA29wk」與「＞GA30wk」，字面上 29~30 週之間沒有規則。
本工具以 **GA 30 週**為分界銜接（GA <30 走前者、≥30 走後者），並在畫面上標示此判讀。

原表兩處結構缺陷已標記於畫面：Systemic candidiasis 的 Day 1 與 Daily therapy 是合併儲存格；
Relapse 列缺 Daily therapy 與 duration，因此只提供 Day 1。

## 開發

無 build step，Tailwind 走 CDN，直接用瀏覽器開啟 `index.html` 即可。

```
index.html          四個分頁的 UI 與滴速計算邏輯
data/abx-data.js    抗生素劑量查詢資料（程式產生，請勿手改）
data/misc-data.js   Surfactant／AOP／PDA 資料
data/flu-data.js    Fluconazole 資料
lib/abx-logic.js    抗生素選格／換算／覆核
lib/misc-logic.js   其他藥物換算／覆核
lib/flu-logic.js    Fluconazole 換算／腎功能調整／輸注限制／覆核
tests/              node 原生執行，無相依套件
```

顯示的數值一律四捨五入至**小數第 2 位**（例：1.25 mL/kg × 1.5 kg = 1.875 → 顯示 1.88 mL）。

測試（共 196 項）：

```bash
node tests/abx.test.mjs       # 抗生素資料 + 選格 + 覆核（50）
node tests/abx-ui.test.mjs    # 抗生素分頁端到端（18）
node tests/misc.test.mjs      # 其他藥物資料 + 換算（30）
node tests/misc-ui.test.mjs   # 其他藥物分頁端到端（16）
node tests/flu.test.mjs       # Fluconazole 資料 + 換算 + 腎調整（48）
node tests/flu-ui.test.mjs    # Fluconazole 分頁端到端（22）
node tests/wiring.test.mjs    # DOM 接線靜態檢查（12）
```

## 部署

push 到 `main` 後由 GitHub Pages 自動發佈。

## 注意

- 本工具僅供臨床人員輔助計算，**下醫囑前務必人工驗算**。
- 本 repo 不含任何病人資料，計算全在瀏覽器端進行，不傳送任何資料。
