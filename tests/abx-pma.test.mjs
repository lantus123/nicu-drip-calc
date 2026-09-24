// PMA × 日齡型抗生素：interval 判定、每日/每劑換算、上限、拒答
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require(new URL('../data/abx-pma-data.js', import.meta.url).pathname);
const L = require(new URL('../lib/abx-pma-logic.js', import.meta.url).pathname);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
};
const drug = id => D.drugs.find(d => d.id === id);
const reg = (id, rid) => drug(id).regimens.find(r => r.id === rid);
const calc = (id, rid, w, pma, pna) => L.compute(drug(id), reg(id, rid), w, pma, pna);
const r2 = n => Math.round(n * 100) / 100;

// ── 資料 ────────────────────────────────────────────────
eq('三種藥', D.drugs.length, 3);
eq('全部標為 pma 型', D.drugs.every(d => d.kind === 'pma'), true);
eq('已標註出處', D.source.includes('院內新生兒工作手冊'), true);
// 濃度單位的判讀必須留在資料裡並顯示出來，不可默默正規化
const unasyn = D.drugs.find(d => d.id === 'unasyn');
eq('Unasyn 最高濃度 45 mg/mL', [unasyn.maxConcentration.value, unasyn.maxConcentration.unit], [45, 'mg/mL']);
eq('保留 g→mg 的判讀說明', unasyn.maxConcentration.note.includes('原文寫 g'), true);
eq('有 PMA 判讀說明', D.pmaWordingNote.includes('完成週數'), true);
eq('不含手寫註記 Augmentin', JSON.stringify(D).includes('Augmentin'), false);
eq('不含院內修訂標記', /\(20\d\d增\)/.test(JSON.stringify(D)), false);

// ── Ampicillin interval（PMA × 日齡）────────────────────
const ampIv = (pma, pna) => L.intervalFor(drug('ampicillin'), reg('ampicillin', 'usual'), pma, pna).hours;
eq('PMA 28 d3 → 12h', ampIv(28, 3), 12);
eq('PMA 28 d28 邊界仍 12h', ampIv(28, 28), 12);
eq('PMA 28 d29 → 8h', ampIv(28, 29), 8);
eq('PMA 29.9（<30）仍走第一帶', ampIv(29.9, 3), 12);
eq('PMA 30 d3 → 12h（30-36 帶）', ampIv(30, 3), 12);
eq('PMA 30 d14 邊界仍 12h', ampIv(30, 14), 12);
eq('PMA 30 d15 → 8h', ampIv(30, 15), 8);
eq('PMA 37 d7 邊界仍 12h', ampIv(37, 7), 12);
eq('PMA 37 d8 → 8h', ampIv(37, 8), 8);
eq('PMA 45 → 6h', ampIv(45, 3), 6);
eq('PMA 44.9 仍走 37-44 帶', ampIv(44.9, 30), 8);
eq('缺 PMA → 拒答', !!L.intervalFor(drug('ampicillin'), reg('ampicillin', 'usual'), 0, 3).error, true);

// Meningitis 走另一套 interval
const ampMenIv = (pma) => L.intervalFor(drug('ampicillin'), reg('ampicillin', 'meningitis'), pma, 3).hours;
eq('Meningitis PMA 40 → 8h', ampMenIv(40), 8);
eq('Meningitis PMA 44.9 → 8h', ampMenIv(44.9), 8);
eq('Meningitis PMA 45 → 6h', ampMenIv(45), 6);

// ── Ampicillin 劑量換算 ─────────────────────────────────
const a1 = calc('ampicillin', 'usual', 1200, 28, 3);
eq('1.2kg usual 每日 120 mg', a1.perDay.min, 120);
eq('1.2kg usual 每劑 60 mg q12h', [a1.perDose.min, a1.interval], [60, 'q12h']);
const a2 = calc('ampicillin', 'sepsis', 1200, 28, 3);
eq('sepsis 每日 240 mg', a2.perDay.min, 240);
const a3 = calc('ampicillin', 'meningitis', 3000, 40, 10);
eq('3kg meningitis 每劑 300 mg q8h', [a3.perDose.min, a3.interval], [300, 'q8h']);
eq('未超過 400 mg/kg/day 上限', a3.exceeded, null);

// ── Vancomycin ──────────────────────────────────────────
const v1 = calc('vancomycin', 'bacteremia', 1000, 27, 20);
eq('PMA27 d20 → q12h', v1.interval, 'q12h');
eq('bacteremia 每劑 10 mg', v1.perDose.min, 10);
eq('每日總量 20 mg/kg/day', v1.perKgPerDay.min, 20);
eq('PMA27 d10 → q18h', calc('vancomycin', 'bacteremia', 1000, 27, 10).interval, 'q18h');
eq('meningitis 每劑 15 mg/kg', calc('vancomycin', 'meningitis', 1000, 30, 3).perDose.min, 15);
const vlbw = calc('vancomycin', 'vlbw', 700, 25, 3);
eq('PMA<26 建議 8~12 mg/kg 保留範圍', [vlbw.perDose.min, r2(vlbw.perDose.max)], [5.6, 8.4]);
eq('PMA<26 附說明', vlbw.notes[0].includes('濃度過高'), true);
const picc = calc('vancomycin', 'picc', 2000, 38, 20);
eq('PICC 移除前為單次', picc.single, true);
eq('單次用法的計算過程不談每日總量',
  L.explain(picc, 2000, 38).some(s => s.label === '每日總量'), false);
const staph = calc('vancomycin', 'staph_cns', 5000, 50, 60);
eq('Staph CNS 固定 q6h', staph.interval, 'q6h');
eq('Staph CNS 5kg 每劑 75 mg', staph.perDose.min, 75);
eq('一般體重不會誤報超過上限', staph.exceeded, null);
// 1 g/dose 上限在新生兒體重下不會觸發（需約 66 kg），此處僅驗證守門邏輯有效
eq('極端體重時單劑上限守門會作用', calc('vancomycin', 'staph_cns', 70000, 50, 60).exceeded !== null, true);

// ── Unasyn（含來源未涵蓋的空窗）────────────────────────
eq('Unasyn PMA<37 → q12h', calc('unasyn', 'standard', 2000, 35, 3).interval, 'q12h');
eq('Unasyn PMA≥37 且 d≤8 → q8h', calc('unasyn', 'standard', 3000, 38, 5).interval, 'q8h');
const gap = calc('unasyn', 'standard', 3000, 38, 20);
eq('PMA≥37 且 d>8：來源未涵蓋 → 拒答', gap.ok, false);
eq('拒答理由點明來源未涵蓋', gap.reason.includes('來源未涵蓋'), true);
eq('≥1 個月用法固定 Q6H', calc('unasyn', 'infant', 5000, 45, 40).interval, 'q6h');
eq('≥1 個月保留 100~150 範圍',
  [calc('unasyn', 'infant', 5000, 45, 40).perDay.min, calc('unasyn', 'infant', 5000, 45, 40).perDay.max], [500, 750]);

// ── 覆核 ────────────────────────────────────────────────
eq('覆核 60 → 符合', L.reviewOrder(a1, 60, 'q12h').verdict, 'match');
eq('覆核 120 → 偏高 +100%', [L.reviewOrder(a1, 120, 'q12h').verdict, Math.round(L.reviewOrder(a1, 120, 'q12h').deviation)], ['high', 100]);
eq('覆核 interval 不符會標出', L.reviewOrder(a1, 60, 'q8h').intervalMatch, false);
eq('單次用法不比對 interval', L.reviewOrder(picc, 20, 'q12h').intervalMatch, undefined);
eq('拒答時無可比對', L.reviewOrder(gap, 60, 'q12h').verdict, 'na');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
