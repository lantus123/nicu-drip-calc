// Fluconazole：資料、interval 判定、腎功能調整、輸注限制、覆核
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require(new URL('../data/flu-data.js', import.meta.url).pathname);
const L = require(new URL('../lib/flu-logic.js', import.meta.url).pathname);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
};
const round = (n, p = 2) => Math.round(n * 10 ** p) / 10 ** p;

// ── 資料 ────────────────────────────────────────────────
eq('vial 濃度 2 mg/mL', D.vial.concentration, 2);
eq('適應症 5 項', D.indications.length, 5);
eq('Systemic 標記為合併儲存格', D.indications.find(i => i.id === 'systemic').spanned, true);
eq('Relapse 標記為原表不完整', D.indications.find(i => i.id === 'relapse').incomplete, true);
eq('Relapse 沒有 daily', D.indications.find(i => i.id === 'relapse').daily, null);

// ── interval：GA × 日齡 ─────────────────────────────────
eq('GA28 d10 → q48h', L.intervalFor(D, 28, 10).interval, 'q48h');
eq('GA28 d20 → q24h', L.intervalFor(D, 28, 20).interval, 'q24h');
eq('GA28 d14 邊界仍 q48h', L.intervalFor(D, 28, 14).interval, 'q48h');
eq('GA28 d15 → q24h', L.intervalFor(D, 28, 15).interval, 'q24h');
eq('GA32 d5 → q48h', L.intervalFor(D, 32, 5).interval, 'q48h');
eq('GA32 d8 → q24h', L.intervalFor(D, 32, 8).interval, 'q24h');
eq('GA32 d7 邊界仍 q48h', L.intervalFor(D, 32, 7).interval, 'q48h');
// 原文 ≦GA29wk 與 ＞GA30wk 之間的空隙：本工具以 30 週銜接
eq('GA29+5（29.71）走 <30 規則', L.intervalFor(D, 29.71, 10).interval, 'q48h');
eq('GA30+0 走 ≥30 規則（d10 → q24h）', L.intervalFor(D, 30, 10).interval, 'q24h');
eq('缺 GA → 拒答', !!L.intervalFor(D, 0, 10).error, true);
eq('缺日齡 → 拒答', !!L.intervalFor(D, 30, undefined).error, true);

// ── 治療劑量 ────────────────────────────────────────────
const t = L.computeTreatment(D, 1000, 28, 10, 0);
eq('1kg loading 12~25 mg', [t.rows[0].amount.min, t.rows[0].amount.max], [12, 25]);
eq('1kg maintenance 12 mg', t.rows[1].amount.min, 12);
eq('maintenance 帶 interval', t.rows[1].interval, 'q48h');
eq('顯示 GA 判讀說明', t.gaWordingNote.includes('30 週'), true);
eq('沒體重 → 拒答', L.computeTreatment(D, 0, 28, 10, 0).ok, false);

// ── 腎功能調整 ──────────────────────────────────────────
eq('CCr 40 → 減半', L.renalFactor(D, 40).factor, 0.5);
eq('CCr 60 → 不調整', L.renalFactor(D, 60).factor, 1);
eq('CCr 50 邊界 → 不調整', L.renalFactor(D, 50).factor, 1);
eq('未填 CCr → 不調整', L.renalFactor(D, 0).factor, 1);
const tr = L.computeTreatment(D, 1000, 28, 10, 40);
eq('CCr40 時 loading 減半為 6~12.5', [tr.rows[0].amount.min, tr.rows[0].amount.max], [6, 12.5]);
eq('CCr40 有提示', tr.renalNote.includes('50%'), true);

// ── 預防劑量與無條件進位 ────────────────────────────────
const p = L.computeProphylaxis(D, 1100, 0);
eq('1.1kg 預防劑量 3.3 mg', round(p.rows[0].amount.min), 3.3);
eq('無條件進位至 4 mg', p.rows[0].amount.rounded.min, 4);
eq('預防為 twice weekly', p.rows[0].interval, 'Twice weekly');
eq('預防 IVD 60 分鐘', p.infusionMinutes, 60);
eq('整數劑量不被多進一位', L.computeProphylaxis(D, 2000, 0).rows[0].amount.rounded.min, 6);

// ── 適應症 ──────────────────────────────────────────────
const sys = L.computeIndication(D, 5000, 'systemic', 0);
eq('Systemic 5kg Day1 30~60 mg', [sys.rows[0].amount.min, sys.rows[0].amount.max], [30, 60]);
eq('Systemic daily 與 Day1 同（合併格）', [sys.rows[1].amount.min, sys.rows[1].amount.max], [30, 60]);
eq('Systemic duration 28 d', sys.duration, '28 d');
const rel = L.computeIndication(D, 5000, 'relapse', 0);
eq('Relapse 只有 Day1 一列', rel.rows.length, 1);
eq('Relapse 標記原表不完整', rel.incomplete, true);
eq('Relapse 無 duration', rel.duration, null);
const eso = L.computeIndication(D, 5000, 'esophageal', 0);
eq('Esophageal daily 帶 up to 註記', eso.rows[1].note, 'up to 12 mg/kg/d');

// ── 輸注限制 ────────────────────────────────────────────
eq('100 mg → 50 mL（2 mg/mL）', L.infusion(D, 100).volumeMl, 50);
eq('100 mg 受最短 2 小時限制', L.infusion(D, 100).minHours, 2);
eq('100 mg 限制原因', L.infusion(D, 100).limitedBy.includes('最短輸注時間'), true);
eq('600 mg 受 200 mg/hr 限制 → 3 小時', L.infusion(D, 600).minHours, 3);
eq('600 mg 限制原因', L.infusion(D, 600).limitedBy.includes('200 mg/hr'), true);

// ── 覆核 ────────────────────────────────────────────────
eq('覆核 loading 20 在 12~25 → 符合', L.reviewOrder(t.rows[0], 20).verdict, 'match');
eq('覆核 loading 30 → 偏高 +20%', [L.reviewOrder(t.rows[0], 30).verdict, round(L.reviewOrder(t.rows[0], 30).deviation)], ['high', 20]);
eq('覆核 loading 6 → 偏低', L.reviewOrder(t.rows[0], 6).verdict, 'low');
eq('未輸入 → n/a', L.reviewOrder(t.rows[0], NaN).verdict, 'n/a');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
