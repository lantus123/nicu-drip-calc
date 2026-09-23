// 抗生素劑量：資料完整性 + 選格邏輯 + 覆核。node tests/abx.test.mjs
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const DATA = require('../data/abx-data.js');
const L = require('../lib/abx-logic.js');

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got=${JSON.stringify(got)}\n      want=${JSON.stringify(want)}`));
};
const drug = (name, extra = {}) => DATA.drugs.find(d => d.name === name
  && (extra.indication === undefined || d.indication === extra.indication)
  && (extra.regimen === undefined || d.regimen === extra.regimen));

// ── 資料完整性 ──────────────────────────────────────────────
eq('藥品項目數', DATA.drugs.length, 29);
eq('每項都有五個體重／日齡帶', DATA.drugs.every(d => DATA.bands.every(b => b.id in d.doses)), true);
eq('標註出處', DATA.source.includes('Remington'), true);
eq('註1 項目正好五項', DATA.drugs.filter(d => d.note1Bands).length, 5);
eq('id 不重複', new Set(DATA.drugs.map(d => d.id)).size, DATA.drugs.length);

// ── 裁決1：有效體重 ─────────────────────────────────────────
eq('生1000/現900 → 用1000（生理性體重下降）', L.effectiveWeight(1000, 900).g, 1000);
eq('生1000/現1100 → 用1100', L.effectiveWeight(1000, 1100).g, 1100);
eq('生1000/現1100 依據=current', L.effectiveWeight(1000, 1100).basis, 'current');
eq('只有出生體重', L.effectiveWeight(1000, 0).g, 1000);

// ── 裁決2：帶別與邊界 ───────────────────────────────────────
eq('1000g d3', L.selectBand(1000, 3).band, 'lt1200_0_4w');
eq('1199g 仍屬 <1200', L.selectBand(1199, 3).band, 'lt1200_0_4w');
eq('1200g 進入 1200~2000 帶', L.selectBand(1200, 3).band, 'w1200_2000_le7d');
eq('2000g 仍屬 1200~2000 帶', L.selectBand(2000, 3).band, 'w1200_2000_le7d');
eq('2001g 進入 >2000 帶', L.selectBand(2001, 3).band, 'gt2000_le7d');
eq('d7 仍算 0~7 days', L.selectBand(2500, 7).band, 'gt2000_le7d');
eq('d8 進入 >7 days', L.selectBand(2500, 8).band, 'gt2000_gt7d');
eq('d28 仍在 0-4 wks', !!L.selectBand(1000, 28).over4w, false);
eq('d29 觸發第四狀態', L.selectBand(1000, 29).over4w, true);

// ── 註1：<1200g 且 >4 週 ────────────────────────────────────
const s4w = L.selectBand(1000, 40);
eq('Meropenem/sepsis >4wk → q8h', L.resolveDose(drug('Meropenem', { indication: 'sepsis' }), s4w).interval, 'q8h');
eq('Meropenem/sepsis >4wk 附說明', !!L.resolveDose(drug('Meropenem', { indication: 'sepsis' }), s4w).intervalNote, true);
eq('Oxacillin/meningitis >4wk → q8h', L.resolveDose(drug('Oxacillin', { indication: 'meningitis' }), s4w).interval, 'q8h');
eq('Cefazolin（非註1）>4wk 拒答', L.resolveDose(drug('Cefazolin'), s4w).ok, false);
eq('Cefazolin >4wk 理由', L.resolveDose(drug('Cefazolin'), s4w).reason, '原表 <1200 g 僅涵蓋 Age 0-4 wks，超過 4 週無建議劑量');
eq('未滿4週的註1藥維持原 interval', L.resolveDose(drug('Meropenem', { indication: 'sepsis' }), L.selectBand(1000, 5)).interval, 'q12h');

// ── 無建議劑量一律拒答，不 fallback ─────────────────────────
eq('Ciprofloxacin <1200g 拒答', L.resolveDose(drug('Ciprofloxacin'), L.selectBand(1000, 3)).ok, false);
eq('Ciprofloxacin 1200~2000 >7d 可算', L.resolveDose(drug('Ciprofloxacin'), L.selectBand(1500, 10)).min, 10);
eq('Penicillin benzathine <1200g 拒答', L.resolveDose(drug('Penicillin benzathine'), L.selectBand(1000, 3)).ok, false);
eq('Teicoplanin 不計算', L.resolveDose(drug('Teicoplanin (Targocid)'), L.selectBand(2500, 10)).ok, false);

// ── 裁決3／4：ODD 與血中濃度退場 ────────────────────────────
eq('Gentamicin ODD 存在', !!drug('Gentamicin', { regimen: 'ODD' }), true);
eq('Gentamicin SDD 存在', !!drug('Gentamicin', { regimen: 'SDD' }), true);
eq('Gentamicin 有 levels → 退場', L.resolveDose(drug('Gentamicin', { regimen: 'ODD' }), L.selectBand(1500, 5), { hasLevels: true }).ok, false);
eq('Amikacin 有 levels → 退場', L.resolveDose(drug('Amikacin'), L.selectBand(1500, 5), { hasLevels: true }).ok, false);
eq('Cefazolin 有 levels 不受影響', L.resolveDose(drug('Cefazolin'), L.selectBand(1500, 5), { hasLevels: true }).ok, true);

// ── 裁決5：MU ───────────────────────────────────────────────
const pen = L.resolveDose(drug('Penicillin G', { indication: 'sepsis' }), L.selectBand(1500, 5));
eq('Penicillin G 單位 MU', pen.unit, 'MU');
eq('Penicillin G 5 MU/kg', pen.min, 5);
eq('Penicillin G 2kg → 10 MU/dose', L.perDose(pen, 2000).min, 10);
const gbs = L.resolveDose(drug('Penicillin G', { indication: 'GBS meningitis' }), L.selectBand(1500, 5));
eq('GBS meningitis 12.5 MU/kg', gbs.min, 12.5);

// ── 範圍值不得取中位數 ──────────────────────────────────────
const cl = L.resolveDose(drug('Clindamycin'), L.selectBand(1500, 5));
eq('Clindamycin 保留 5~7.5', [cl.min, cl.max], [5, 7.5]);
eq('Clindamycin 2kg → 10~15 mg/dose', [L.perDose(cl, 2000).min, L.perDose(cl, 2000).max], [10, 15]);

// ── 覆核 ────────────────────────────────────────────────────
const cz = L.resolveDose(drug('Cefazolin'), L.selectBand(2500, 3)); // 50 q12h
eq('Cefazolin 2.5kg 建議 125 mg/dose', L.perDose(cz, 2500).min, 125);
eq('覆核 125 → 符合', L.reviewOrder(cz, 2500, 125, 'q12h').verdict, 'match');
eq('覆核 200 → 偏高', L.reviewOrder(cz, 2500, 200, 'q12h').verdict, 'high');
eq('覆核 60 → 偏低', L.reviewOrder(cz, 2500, 60, 'q12h').verdict, 'low');
eq('覆核 60 偏離 -52%', Math.round(L.reviewOrder(cz, 2500, 60, 'q12h').deviation), -52);
eq('覆核 interval 不符會標出', L.reviewOrder(cz, 2500, 125, 'q8h').intervalMatch, false);
eq('範圍內任一點都算符合', L.reviewOrder(cl, 2000, 12, 'q12h').verdict, 'match');

// ── 警示 ────────────────────────────────────────────────────
eq('Gentamicin PMA45 出註2提醒', L.warnings(drug('Gentamicin', { regimen: 'ODD' }), 45).some(w => w.includes('註2')), true);
eq('Gentamicin PMA38 不出註2', L.warnings(drug('Gentamicin', { regimen: 'ODD' }), 38).some(w => w.includes('註2')), false);
eq('Metronidazole PMA41 出 Q6H', L.warnings(drug('Metronidazole'), 41).some(w => w.includes('Q6H')), true);
eq('Pip/tazo 導向 Piperacillin', L.warnings(drug('Piperacillin/tazobactam'), 38)[0].includes('Piperacillin'), true);

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
