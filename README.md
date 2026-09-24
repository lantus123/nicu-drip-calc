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

## 病人資料共用

出生體重、當下體重、日齡、出生 GA、CCr 填在頁面最上方，**四個分頁共用**，同一個病人不必重複輸入。

「用哪個體重」的規則集中在 `lib/patient.js`，各分頁不自行判斷：

| 規則 | 用於 | 定義 |
|---|---|---|
| `effectiveWeight` | 抗生素表 | `max(出生體重, 當下體重)` —— 當下體重超過出生體重後才改用當下體重 |
| `currentWeight` | 其他藥物、Fluconazole、點滴滴速 | 當下體重優先，未填則退回出生體重 |

兩者在生理性體重下降期間會給出不同答案（生 1500 g／現 1200 g → 抗生素用 1500、其他用 1200），
因此刻意分成兩個具名規則而非共用一個，並有測試釘住這個差異。

## 抗生素多選

抗生素分頁可同時選入多種藥（NICU 常同時給兩三種），每種各一張卡，各自有劑量、
計算過程、給藥指引與覆核欄。改動病人資料時**所有卡片一起重算**，不必逐一重按。

重複選入同一藥不會產生第二張卡；每張卡可單獨移除，或按「清空」全部清掉。

## 來源對照

每張卡可展開「來源對照」，看到**該藥在本表的五個格**與目前用的是哪一格：

```
        <1200 g        1200~2000 g          >2000 g
        0-4 wks    0~7 days   >7 days   0~7 days   >7 days
        25 q12h   [25 q12h]   25 q8h    50 q12h    50 q8h
                   ▲ 用這格
```

本表無建議劑量的格顯示為「—」。拒答時也會附上，讓人看得出是這一格沒有、還是整列都沒有。

另有**完整劑量表**（29 列），選入的藥會在整張表裡一起標出用了哪一格，
多選時可同時看到三種藥各自落在哪裡；改體重或日齡時標記會跟著移動。
藥名欄固定，橫向捲動時不會跑掉。自由文字用法（Teicoplanin、Pip/tazo）以整列呈現。

兩者都是以本表數值自行渲染的呈現（數值屬事實），**版面為本工具自訂，不重製來源文件的排版**，並附出處。

**接近分界提醒**：體重或日齡再動一點就會換一格、劑量可能整個不同時會出現提示 ——
例如「體重距 2000 g 分界僅 50 g」、「體重正好在 2000 g 分界上：本表 2000 g 屬
1200~2000 g 帶，非 >2000 g」。`<1200 g` 的日齡分界是第 28 天，其餘是第 7 天。

## 版面原則

卡片的排列順序是刻意的：**警示 → 答案 → 覆核 → 細節**。

會改變劑量決策的警示（接近分界、血中濃度退場、PMA 註記）一律排在「每劑」數字**之前** ——
趕時間的人看到數字就會走，警示放在底部等於沒有。此順序有測試釘住。

覆核排在計算過程之前，因為「我要開 X，幫我檢查」比「解釋給我聽」更常用。

顏色有分工：**cyan 只用於答案**（每劑）與導覽狀態（目前分頁）與標題，
其餘一律中性灰，避免整頁同色而失去著力點。可展開區塊為灰色，不與答案搶。

病人資料列填完可**收合成一行**（`1500 g・當下 1420 g・日齡 3 天・GA 30 週`），
在窄螢幕上把版面讓給結果。

## 覆核設計

這個工具的重點不是算出數字，是**讓醫師能驗算**。**四個分頁**的結果都附「計算過程」，
每一行都是獨立可驗的一步：

```
有效體重   當下體重未超過出生體重，採出生體重      1500 g = 1.5 kg
查表欄位   體重帶 × 日齡帶                    1200~2000 g ／ Age 0~7 days
本表值     原文「25 q12h」                   25 mg/kg/dose q12h
每劑       25 mg/kg × 1.5 kg                37.5 mg q12h
每日總量   37.5 mg × (24 ÷ 12 小時) = 2 劑/日  75 mg/day（50 mg/kg/day）
```

抗生素分頁拒答時同樣列出計算過程，讓人看得出是走到哪一步、為什麼停下來。
interval 超過 24 小時者（q36h／q48h）標示為「平均每日」而非每日總量。

各分頁另有各自需要展開的步驟：Surfactant／AOP 的口服藥水抽取容積、Ibuprofen 的
最小稀釋量、Fluconazole 的 interval 判定依據、腎功能調整倍率、稀釋容積與最短輸注時間
（取「至少 2 小時」與「最高 200 mg/hr」較長者，並標明是哪一項在限制）。

呈現元件集中在 `ui/render.js`，調整計算過程或指引的版面只需要改這一個檔案。

「給藥指引」另外收合呈現，**四個分頁統一格式**，只放來源文件明載的中性給藥事實
（稀釋、輸注時間、途徑限制、血中濃度、已知不良反應）。說明與警告分開，警告以紅底標示
（例如 Fluconazole 的「不可 IM／IVP」是警告，「口服與靜脈劑量相同」是說明）。
抗生素的指引資料在 `data/abx-admin.js`，與程式產生的劑量資料分開。

會影響劑量正確性的事項**不收合**，常駐顯示為警示列 —— 例如來源表格的合併儲存格、
缺漏欄位、GA 分界判讀、腎功能調整。

**劑量範圍帶**：覆核結果附一條帶子，畫出建議範圍與你輸入的值落在哪裡。
只給百分比看不出離邊界多近，畫出來才知道。

## 開發

無 build step，Tailwind 走 CDN，直接用瀏覽器開啟 `index.html` 即可。
介面邏輯一律放在 `ui/`，**HTML 內不得有 inline script**（`tests/html-scripts.test.mjs` 把關）。

```
index.html          只有骨架與版面，不含程式邏輯
lib/patient.js      共用病人資料與「用哪個體重」的規則
ui/render.js        各分頁共用的呈現元件（計算過程、指引、來源對照、範圍帶、完整表）
ui/patient-bar.js   病人資料列的收合與摘要
ui/                 各分頁的介面邏輯（drip / abx / misc / flu）
data/abx-data.js    抗生素劑量查詢資料（程式產生，請勿手改）
data/abx-admin.js   抗生素給藥指引（人工整理）
data/misc-data.js   Surfactant／AOP／PDA 資料
data/flu-data.js    Fluconazole 資料
lib/abx-logic.js    抗生素選格／換算／覆核
lib/misc-logic.js   其他藥物換算／覆核
lib/flu-logic.js    Fluconazole 換算／腎功能調整／輸注限制／覆核
tests/              node 原生執行，無相依套件
```

顯示的數值一律四捨五入至**小數第 2 位**（例：1.25 mL/kg × 1.5 kg = 1.875 → 顯示 1.88 mL）。

測試（共 300 項）：

```bash
node tests/abx.test.mjs       # 抗生素資料 + 選格 + 覆核 + 分界（60）
node tests/abx-ui.test.mjs    # 抗生素分頁端到端＋多選＋來源對照＋完整表＋版面順序（59）
node tests/misc.test.mjs      # 其他藥物資料 + 換算（30）
node tests/misc-ui.test.mjs   # 其他藥物分頁端到端＋計算過程（24）
node tests/flu.test.mjs       # Fluconazole 資料 + 換算 + 腎調整（48）
node tests/flu-ui.test.mjs    # Fluconazole 分頁端到端＋計算過程（26）
node tests/patient.test.mjs   # 病人資料與體重規則（15）
node tests/patient-bar.test.mjs # 病人資料列收合與摘要（9）
node tests/wiring.test.mjs    # DOM 接線靜態檢查（8）
node tests/html-scripts.test.mjs # 腳本外置與可解析性（21）
```

## 部署

push 到 `main` 後由 GitHub Pages 自動發佈。

## 注意

- 本工具僅供臨床人員輔助計算，**下醫囑前務必人工驗算**。
- 本 repo 不含任何病人資料，計算全在瀏覽器端進行，不傳送任何資料。
