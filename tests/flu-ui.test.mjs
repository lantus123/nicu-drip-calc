// 端到端：把 index.html 的 Fluconazole 分頁腳本跑在最小 DOM 上，檢查畫面實際輸出的文字
import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const code = html.split('    // ───────── Fluconazole 分頁 ─────────')[1].split('\n  </script>')[0];

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
globalThis.FLU_DATA = require(new URL('../data/flu-data.js', import.meta.url).pathname);
globalThis.FluLogic = require(new URL('../lib/flu-logic.js', import.meta.url).pathname);
vm.runInThisContext('(function(){' + code + '})()');
docHandlers.DOMContentLoaded();

const $ = id => document.getElementById(id);
const text = id => $(id).innerHTML.replace(/<[^>]+>/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();
const hidden = id => $(id).classList.contains('hidden');

function run({ mode, w, ga = '', pna = '', ccr = '', indication = '' }) {
  $('fluMode').value = mode; $('fluMode')._h.change();
  $('fluWeight').value = String(w); $('fluGa').value = String(ga);
  $('fluPna').value = String(pna); $('fluCcr').value = String(ccr);
  if (indication) $('fluIndication').value = indication;
  $('fluCalcBtn')._h.click();
  return text('fluResult');
}
function review(rowFragment, dose) {
  const sel = $('fluReviewRow');
  const i = sel.children.findIndex(o => o.textContent.includes(rowFragment));
  if (i < 0) throw new Error('找不到覆核項 ' + rowFragment + '：' + sel.children.map(o => o.textContent));
  sel.value = String(i);
  $('fluOrderedDose').value = String(dose);
  $('fluReviewBtn')._h.click();
  return text('fluReviewResult');
}
let pass = 0, fail = 0;
const has = (label, got, ...want) => {
  const ok = want.every(w => got.includes(w));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got: ${got}\n      want all of: ${want.join(' | ')}`));
};
const is = (label, got, want) => {
  const ok = got === want; ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : ` got=${got} want=${want}`));
};

// 欄位依用途顯示
// （stub 讀不到寫在 HTML 裡的 <option>，真實瀏覽器預設值為第一個選項 treatment，故此處明確設定）
$('fluMode').value = 'treatment'; $('fluMode')._h.change();
is('治療模式顯示 GA', hidden('fluGaWrap'), false);
is('治療模式隱藏適應症', hidden('fluIndicationWrap'), true);
$('fluMode').value = 'prophylaxis'; $('fluMode')._h.change();
is('預防模式隱藏 GA', hidden('fluGaWrap'), true);
is('預防模式隱藏適應症', hidden('fluIndicationWrap'), true);
$('fluMode').value = 'indication'; $('fluMode')._h.change();
is('適應症模式顯示適應症', hidden('fluIndicationWrap'), false);

has('治療 1kg GA28 d10 → loading 12~25、maintenance 12 q48h',
  run({ mode: 'treatment', w: 1000, ga: 28, pna: 10 }),
  'Loading', '12~25 mg', 'Maintenance', '12 mg q48h', 'interval q48h');
has('治療顯示 GA 判讀說明', text('fluResult'), '≦GA29wk', 'GA 30 週為分界');
has('治療顯示輸注限制', text('fluResult'), 'mL', '至少輸注', '不可 IM／IVP');
has('GA32 d10 → q24h', run({ mode: 'treatment', w: 2000, ga: 32, pna: 10 }), 'q24h');
has('GA29+5 走 <30 規則 → q48h', run({ mode: 'treatment', w: 1000, ga: 29.7, pna: 10 }), 'q48h');
has('缺 GA → 拒答', run({ mode: 'treatment', w: 1000, pna: 10 }), '請輸入出生 GA');
has('缺體重 → 拒答', run({ mode: 'treatment', w: '', ga: 28, pna: 10 }), '請輸入體重');

has('CCr 40 → 劑量減半並提示',
  run({ mode: 'treatment', w: 1000, ga: 28, pna: 10, ccr: 40 }), '6~12.5 mg', '50%');
has('CCr 60 → 不調整', run({ mode: 'treatment', w: 1000, ga: 28, pna: 10, ccr: 60 }), '12~25 mg');

has('預防 1.1kg → 3.3 mg 並顯示進位後 4 mg',
  run({ mode: 'prophylaxis', w: 1100 }), '3.3 mg', '無條件進位後', '4 mg', 'Twice weekly', 'IVD 60 分鐘');

has('Systemic candidiasis 5kg → Day1 與 daily 同為 30~60',
  run({ mode: 'indication', w: 5000, indication: 'systemic' }),
  'Systemic candidiasis', 'Day 1', '30~60 mg', 'Daily therapy', '合併儲存格', '28 d');
has('Relapse 只有 Day1 且標記原表不完整',
  run({ mode: 'indication', w: 5000, indication: 'relapse' }), 'Relapse', 'Day 1', '缺 Daily therapy');
has('Esophageal 帶 up to 註記',
  run({ mode: 'indication', w: 5000, indication: 'esophageal' }), 'up to 12 mg/kg/d');
has('適應症模式提醒 0-14 天用法', text('fluResult'), '24-72h');

run({ mode: 'treatment', w: 1000, ga: 28, pna: 10 });
has('覆核 loading 20 → 符合', review('Loading', 20), '符合本表建議');
has('覆核 loading 30 → 偏高 +20%', review('Loading', 30), '高於本表上限', '+20%');
has('覆核可切到 maintenance', review('Maintenance', 5), '低於本表下限');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
