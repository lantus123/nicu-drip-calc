// 端到端：把 index.html 的抗生素分頁腳本跑在最小 DOM 上，檢查畫面實際輸出的文字
import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const html = fs.readFileSync(new URL('../ui/abx.js', import.meta.url), 'utf8');
const code = html;

const els = new Map(); const docHandlers = {};
function makeEl(id) {
  const el = { id, value: '', checked: false, textContent: '', _html: '', children: [], _h: {},
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
                 toggle(c, on){ on === undefined ? (this._s.has(c)?this._s.delete(c):this._s.add(c)) : (on?this._s.add(c):this._s.delete(c)); },
                 contains(c){return this._s.has(c);} },
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = v; if (v === '') { this.children = []; this.value = ''; } },
    appendChild(c){ this.children.push(c); if (!this.value) this.value = c.value; },
    addEventListener(ev, fn){ this._h[ev] = fn; },
    setAttribute(k,v){ this['_'+k] = v; }, getAttribute(k){ return this['_'+k]; } };
  return el;
}
const document = {
  addEventListener: (ev, fn) => { docHandlers[ev] = fn; },
  getElementById: id => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: () => makeEl('opt'),
  querySelectorAll: () => [],
  body: { appendChild(){}, removeChild(){} },
};
globalThis.document = document;
globalThis.window = globalThis;
globalThis.ABX_DATA = require(new URL('../data/abx-data.js', import.meta.url).pathname);
globalThis.AbxLogic = require(new URL('../lib/abx-logic.js', import.meta.url).pathname);
globalThis.ABX_ADMIN = require(new URL('../data/abx-admin.js', import.meta.url).pathname);
globalThis.self = globalThis;
await import(new URL('../ui/render.js', import.meta.url));
vm.runInThisContext('(function(){' + code + '})()');
docHandlers.DOMContentLoaded();

const $ = id => document.getElementById(id);
const text = id => $(id).innerHTML.replace(/<[^>]+>/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();
const setVariant = label => {
  const sel = $('abxVariant');
  const i = sel.children.findIndex(o => o.textContent === label);
  if (i < 0) throw new Error('找不到變體 ' + label + '：' + sel.children.map(o=>o.textContent));
  sel.value = String(i);
};
function run({ drug, variant, bw, cw = '', days, ga = '', levels = false }) {
  $('abxDrug').value = drug; $('abxDrug')._h.change();
  if (variant) setVariant(variant);
  $('abxBirthWeight').value = String(bw); $('abxCurrentWeight').value = String(cw);
  $('abxAgeDays').value = String(days); $('abxGaWeeks').value = String(ga);
  $('abxHasLevels').checked = levels;
  $('abxCalcBtn')._h.click();
  return text('abxResult');
}
function review(dose, interval) {
  $('abxOrderedDose').value = String(dose);
  if (interval) $('abxOrderedInterval').value = interval;
  $('abxReviewBtn')._h.click();
  return text('abxReviewResult');
}
let pass = 0, fail = 0;
const has = (label, got, ...want) => {
  const ok = want.every(w => got.includes(w));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got: ${got}\n      want all of: ${want.join(' | ')}`));
};

has('Cefazolin 2.5kg d3 → 125 mg q12h',
  run({ drug: 'Cefazolin', bw: 2500, days: 3 }), 'Cefazolin', '>2000 g', '50 mg/kg/dose q12h', '125 mg q12h');
has('覆核 125 q12h → 符合', review(125, 'q12h'), '符合本表建議');
has('覆核 250 → 偏高 +100%', review(250, 'q12h'), '高於本表上限', '+100%');
has('覆核 interval 打錯會抓到', review(125, 'q8h'), 'Interval 不符', 'q12h');
has('體重改用當下（生1000→現1300）',
  run({ drug: 'Cefazolin', bw: 1000, cw: 1300, days: 3 }), '使用體重 1300 g', '當下體重已超過出生體重', '1200~2000 g');
has('生理性體重下降仍用出生體重',
  run({ drug: 'Cefazolin', bw: 1300, cw: 1150, days: 3 }), '使用體重 1300 g', '1200~2000 g');
has('Ciprofloxacin <1200g → 無建議劑量',
  run({ drug: 'Ciprofloxacin', bw: 1000, days: 3 }), '本表於此體重／日齡無建議劑量');
has('<1200g 且 >4 週：註1 藥改 q8h',
  run({ drug: 'Meropenem', variant: 'sepsis', bw: 1000, days: 40 }), 'q8h', '依註1', '20 mg');
has('<1200g 且 >4 週：非註1 藥拒答',
  run({ drug: 'Cefazolin', bw: 1000, days: 40 }), '超過 4 週無建議劑量');
has('Gentamicin 預設 ODD',
  run({ drug: 'Gentamicin', bw: 1500, days: 3, ga: 30 }), '(ODD)', '4 mg/kg/dose');
has('有血中濃度 → aminoglycoside 退場',
  run({ drug: 'Gentamicin', bw: 1500, days: 3, levels: true }), '請依血中濃度調整');
has('PMA>44 出註2提醒',
  run({ drug: 'Gentamicin', bw: 3000, days: 60, ga: 38 }), '註2');
has('Penicillin G 用 MU',
  run({ drug: 'Penicillin G', variant: 'sepsis', bw: 2000, days: 3 }), '5 MU/kg/dose', '10 MU q12h');
has('GBS meningitis 12.5 MU',
  run({ drug: 'Penicillin G', variant: 'GBS meningitis', bw: 2000, days: 3 }), '12.5 MU/kg/dose', '25 MU');
has('Clindamycin 範圍值不取中位數',
  run({ drug: 'Clindamycin', bw: 2000, days: 3 }), '5~7.5 mg/kg/dose', '10~15 mg');
has('Teicoplanin 不計算但顯示原文',
  run({ drug: 'Teicoplanin (Targocid)', bw: 2500, days: 10 }), '不做自動計算', '16 loading');
has('Pip/tazo 導回 Piperacillin',
  run({ drug: 'Piperacillin/tazobactam', bw: 2500, days: 10 }), 'Piperacillin');
has('原文一併顯示可回溯',
  run({ drug: 'Cefotaxime (Claforan)', variant: 'meningitis', bw: 2500, days: 3 }), '原文：100 q12h');

// ── 計算過程與給藥指引（2026-09-23 新增）──────────────
has('計算過程逐步列出，每行可獨立驗算',
  run({ drug: 'Cefazolin', bw: 1500, cw: 1420, days: 3 }),
  '計算過程', '有效體重', '1500 g = 1.5 kg', '查表欄位', '本表值', '原文「25 q12h」',
  '25 mg/kg × 1.5 kg', '37.5 mg q12h');
has('每日總量一併算出（摘要卡與步驟表單位一致）', text('abxResult'),
  '每日總量 75 mg/day', '24 ÷ 12 小時', '2 劑/日', '50 mg/kg/day');
has('體重來源在計算過程中說明', text('abxResult'), '當下體重未超過出生體重');
has('採當下體重時也說明', run({ drug: 'Cefazolin', bw: 1000, cw: 1300, days: 3 }), '當下體重已超過出生體重', '1300 g = 1.3 kg');
has('q48h 標為平均每日', run({ drug: 'Amikacin', bw: 1000, days: 3 }), '平均每日', '24 ÷ 48 小時');
has('拒答時也顯示走到哪一步', run({ drug: 'Cefazolin', bw: 1000, days: 40 }), '計算過程', '查表欄位', '超過 4 週無建議劑量');
has('給藥指引：Penicillin G 快速輸注警告',
  run({ drug: 'Penicillin G', variant: 'sepsis', bw: 2000, days: 3 }), '給藥指引', 'IVD > 30 分鐘', '心律不整');
has('給藥指引：Teicoplanin 不可推注',
  run({ drug: 'Teicoplanin (Targocid)', bw: 2500, days: 10 }), '最高濃度 4 mg/mL', '不可推注');
has('給藥指引：Metronidazole 鈉含量',
  run({ drug: 'Metronidazole', bw: 2500, days: 10 }), '13.5 mEq Sodium');
has('沒有指引資料的藥不顯示該區塊',
  run({ drug: 'Cefepime', bw: 2500, days: 3 }).includes('給藥指引') ? 'HAS' : 'NONE', 'NONE');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
