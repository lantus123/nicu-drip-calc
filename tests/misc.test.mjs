// Surfactant / AOP / PDA：資料完整性與換算邏輯
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require(new URL('../data/misc-data.js', import.meta.url).pathname);
const L = require(new URL('../lib/misc-logic.js', import.meta.url).pathname);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
};
const drug = id => D.drugs.find(d => d.id === id);
const rows = (id, w) => L.compute(drug(id), w).rows;

// 資料
eq('藥品數', D.drugs.length, 8);
eq('分類齊全', D.categories, ['Surfactant', 'AOP', 'PDA']);
eq('id 不重複', new Set(D.drugs.map(d => d.id)).size, 8);
eq('每藥都有 regimens', D.drugs.every(d => d.regimens.length > 0), true);
eq('裁決6：不含 Indomethacin', D.drugs.some(d => /indomethacin/i.test(d.name)), false);

// Surfactant：mL/kg
eq('Curosurf 1.5kg 初次 3.75 mL', rows('curosurf', 1500)[0].min, 3.75);
eq('Curosurf 重複劑量 1.875 mL', rows('curosurf', 1500)[1].min, 1.875);
eq('Survanta 1.5kg → 6 mL', rows('survanta', 1500)[0].min, 6);
eq('Survanta 只有一列', rows('survanta', 1500).length, 1);

// AOP
eq('Aminophylline 2kg loading 10 mg', rows('aminophylline', 2000)[0].min, 10);
eq('Aminophylline 2kg maintenance 4 mg', rows('aminophylline', 2000)[1].min, 4);
eq('Aminophylline maintenance interval', rows('aminophylline', 2000)[1].interval, 'Q12H');
eq('Theophylline 口服換算 10mg → 1.87 mL',
  Math.round(rows('aminophylline', 2000)[0].volume.value * 100) / 100, 1.87);
eq('Theophylline 換算為 exact', rows('aminophylline', 2000)[0].volume.kind, 'exact');
eq('Caffeine 1.2kg loading 24 mg', rows('caffeine_citrate', 1200)[0].min, 24);
eq('Caffeine maintenance 保留 6~12 範圍',
  [rows('caffeine_citrate', 1200)[1].min, rows('caffeine_citrate', 1200)[1].max], [6, 12]);
eq('Caffeine 有 toxic level', drug('caffeine_citrate').levels.toxic, '> 50 µg/mL');

// PDA
eq('Ibuprofen standard 1kg 第1劑 10 mg', rows('ibuprofen_standard', 1000)[0].min, 10);
eq('Ibuprofen standard 第2-3劑 5 mg', rows('ibuprofen_standard', 1000)[1].min, 5);
eq('Ibuprofen high 1kg 第1劑 20 mg', rows('ibuprofen_high', 1000)[0].min, 20);
eq('Ibuprofen 最高濃度 4mg/mL → 20mg 至少 5 mL', rows('ibuprofen_high', 1000)[0].volume.value, 5);
eq('Ibuprofen 容積為下限型', rows('ibuprofen_high', 1000)[0].volume.kind, 'min');
eq('Paracetamol 3kg → 45 mg q6h', [rows('paracetamol_po', 3000)[0].min, rows('paracetamol_po', 3000)[0].interval], [45, 'q6h']);
eq('Propacetamol 3kg → 90 mg', rows('propacetamol_iv', 3000)[0].min, 90);

// 錯誤輸入
eq('沒體重 → 拒答', L.compute(drug('curosurf'), 0).ok, false);
eq('沒選藥 → 拒答', L.compute(null, 1500).ok, false);

// 覆核
const caf = rows('caffeine_citrate', 1200)[1]; // 6~12 mg
eq('覆核 8 在 6~12 內 → 符合', L.reviewOrder(caf, 8).verdict, 'match');
eq('覆核 4 → 偏低', L.reviewOrder(caf, 4).verdict, 'low');
eq('覆核 24 → 偏高 +100%', [L.reviewOrder(caf, 24).verdict, Math.round(L.reviewOrder(caf, 24).deviation)], ['high', 100]);
eq('覆核未輸入 → n/a', L.reviewOrder(caf, NaN).verdict, 'n/a');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
