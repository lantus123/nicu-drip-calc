// 端到端：把 index.html 的「其他藥物」分頁腳本跑在最小 DOM 上，檢查畫面實際輸出的文字
import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const html = fs.readFileSync(new URL('../ui/misc.js', import.meta.url), 'utf8');
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
globalThis.MISC_DATA = require(new URL('../data/misc-data.js', import.meta.url).pathname);
globalThis.MiscLogic = require(new URL('../lib/misc-logic.js', import.meta.url).pathname);
vm.runInThisContext('(function(){' + code + '})()');
docHandlers.DOMContentLoaded();

const $ = id => document.getElementById(id);
const text = id => $(id).innerHTML.replace(/<[^>]+>/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();

function run(drugId, weight) {
  $('miscDrug').value = drugId;
  $('miscWeight').value = String(weight);
  $('miscCalcBtn')._h.click();
  return text('miscResult');
}
function review(rowLabelFragment, dose) {
  const sel = $('miscReviewRow');
  const i = sel.children.findIndex(o => o.textContent.includes(rowLabelFragment));
  if (i < 0) throw new Error('找不到覆核項 ' + rowLabelFragment + '：' + sel.children.map(o => o.textContent));
  sel.value = String(i);
  $('miscOrderedDose').value = String(dose);
  $('miscReviewBtn')._h.click();
  return text('miscReviewResult');
}
let pass = 0, fail = 0;
const has = (label, got, ...want) => {
  const ok = want.every(w => got.includes(w));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got: ${got}\n      want all of: ${want.join(' | ')}`));
};

// 顯示一律四捨五入至小數第 2 位：1.25 × 1.5 = 1.875 → 顯示 1.88
has('Curosurf 1.5kg → 初次 3.75 mL、重複 1.88 mL（2 位小數）',
  run('curosurf', 1500), 'Curosurf', '初次劑量', '3.75 mL', '重複劑量', '1.88 mL');
has('Curosurf 顯示 timing', text('miscResult'), 'prophylactic', 'rescue');
has('Survanta 1.5kg → 6 mL', run('survanta', 1500), '4 mL/kg/dose', '6 mL');
has('Aminophylline 2kg loading 10mg + 口服換算',
  run('aminophylline', 2000), 'Loading', '10 mg', 'Theophylline Soln', '1.87 mL');
has('Aminophylline 顯示血中濃度與 toxic', text('miscResult'), '6~12 µg/mL', 'Toxic', '15-20');
has('Caffeine 1.2kg maintenance 保留 6~12 範圍',
  run('caffeine_citrate', 1200), 'Loading', '24 mg', '6~12 mg', 'QD');
has('Ibuprofen high 1kg 第1劑 20mg 且反推最小稀釋容積',
  run('ibuprofen_high', 1000), '第 1 劑', '20 mg', '至少需稀釋至', '5 mL');
has('Ibuprofen 顯示 drip 限制', text('miscResult'), 'drip > 15 minutes');
has('Ibuprofen standard 與 high 不同',
  run('ibuprofen_standard', 1000), '第 1 劑', '10 mg');
has('Paracetamol 3kg → 45 mg q6h', run('paracetamol_po', 3000), '45 mg', 'q6h', '3-7 days');
has('Propacetamol 3kg → 90 mg', run('propacetamol_iv', 3000), '90 mg', 'q6h');
has('沒填體重 → 拒答', run('curosurf', ''), '請輸入體重');

run('caffeine_citrate', 1200);
has('覆核 maintenance 8mg → 符合', review('Maintenance', 8), '符合本表建議');
has('覆核 maintenance 24mg → 偏高 +100%', review('Maintenance', 24), '高於本表上限', '+100%');
has('覆核 loading 10mg → 偏低', review('Loading', 10), '低於本表下限');
has('覆核可切換項目', review('Loading', 24), '符合本表建議');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
