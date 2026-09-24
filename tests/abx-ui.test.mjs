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
    set innerHTML(v){ this._html = v; this._vals = {}; if (v === '') { this.children = []; this.value = ''; } },
    // 卡片是字串渲染出來的，這裡從 HTML 取出欄位預設值，讓覆核流程可被測試
    querySelector(sel){
      const self = this;
      if (!self._vals) self._vals = {};
      if (!(sel in self._vals)) {
        let def = '';
        const mD = /^\[data-dose="(\d+)"\]$/.exec(sel);
        const mI = /^\[data-interval="(\d+)"\]$/.exec(sel);
        if (mD) { const m = new RegExp('data-dose="' + mD[1] + '" value="([^"]*)"').exec(self._html); def = m ? m[1] : ''; }
        else if (mI) { const seg = (self._html.split('data-interval="' + mI[1] + '"')[1] || ''); const m = /<option value="([^"]*)" selected>/.exec(seg); def = m ? m[1] : ''; }
        self._vals[sel] = def;
      }
      return { get value(){ return self._vals[sel]; }, set value(v){ self._vals[sel] = v; } };
    },
    appendChild(c){ this.children.push(c); if (!this.value) this.value = c.value; },
    addEventListener(ev, fn){ this._h[ev] = fn; },
    setAttribute(k,v){ this['_'+k] = v; if (k === 'data-quick') this._quick = v; }, getAttribute(k){ return this['_'+k]; } };
  return el;
}
const document = {
  addEventListener: (ev, fn) => { docHandlers[ev] = fn; },
  getElementById: id => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
  createElement: (tag) => { const el = makeEl(tag || 'opt'); el.tag = tag; return el; },
  querySelectorAll: () => [],
  body: { appendChild(){}, removeChild(){} },
};
globalThis.document = document;
globalThis.window = globalThis;
globalThis.ABX_DATA = require(new URL('../data/abx-data.js', import.meta.url).pathname);
globalThis.AbxLogic = require(new URL('../lib/abx-logic.js', import.meta.url).pathname);
globalThis.ABX_ADMIN = require(new URL('../data/abx-admin.js', import.meta.url).pathname);
globalThis.ABX_PMA_DATA = require(new URL('../data/abx-pma-data.js', import.meta.url).pathname);
globalThis.AbxPmaLogic = require(new URL('../lib/abx-pma-logic.js', import.meta.url).pathname);
globalThis.self = globalThis;
globalThis.Patient = require(new URL('../lib/patient.js', import.meta.url).pathname);
await import(new URL('../ui/render.js', import.meta.url));
vm.runInThisContext('(function(){' + code + '})()');
docHandlers.DOMContentLoaded();

const $ = id => document.getElementById(id);
const text = id => $(id).innerHTML.replace(/<[^>]+>/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/\s+/g, ' ').trim();

const setPatient = ({ bw = '', cw = '', days = '', ga = '' }) => {
  $('pBirthWeight').value = String(bw); $('pCurrentWeight').value = String(cw);
  $('pAgeDays').value = String(days); $('pGaWeeks').value = String(ga);
};
// 點 chip 加入；需要特定適應症時再於卡片上切換
const clickChip = name => $('abxChips')._h.click({ target: { getAttribute: k => (k === 'data-drug' ? name : null) } });
const setCardVariant = (idx, label) => {
  const html = $('abxResult').innerHTML;
  const seg = html.split(`data-variant="${idx}"`)[1] || '';
  const opts = [...seg.matchAll(/<option value="(\d+)"[^>]*>([^<]*)<\/option>/g)];
  const hit = opts.find(o => o[2] === label);
  if (!hit) throw new Error('找不到適應症 ' + label + '：' + opts.map(o => o[2]));
  $('abxResult')._h.change({ target: { getAttribute: k => (k === 'data-variant' ? String(idx) : null), value: hit[1] } });
};
const addDrug = (drug, variant) => {
  clickChip(drug);
  if (variant) setCardVariant(selectedCount() - 1, variant);
};
const selectedCount = () => ($('abxResult').innerHTML.match(/data-remove="/g) || []).length;
const clearAll = () => $('abxClearBtn')._h.click();
// 事件委派：模擬點到帶有該屬性的按鈕
const clickIn = (attr, idx) => $('abxResult')._h.click({ target: { getAttribute: k => (k === attr ? String(idx) : null) } });

function run({ drug, variant, bw, cw = '', days, ga = '', levels = false }) {
  clearAll();
  setPatient({ bw, cw, days, ga });
  $('abxHasLevels').checked = levels;
  addDrug(drug, variant);
  return text('abxResult');
}
function review(idx, dose, interval) {
  const box = $('abxResult');
  box.querySelector(`[data-dose="${idx}"]`).value = String(dose);
  if (interval !== undefined) box.querySelector(`[data-interval="${idx}"]`).value = interval;
  clickIn('data-review', idx);
  return text('abxResult');
}
let pass = 0, fail = 0;
const has = (label, got, ...want) => {
  const ok = want.every(w => got.includes(w));
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got: ${got.slice(0, 400)}\n      want all of: ${want.join(' | ')}`));
};
const is = (label, got, want) => { const ok = got === want; ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : ` got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };

// ── 單一藥品：沿用原有斷言 ──────────────────────────────
has('Cefazolin 2.5kg d3 → 125 mg q12h',
  run({ drug: 'Cefazolin', bw: 2500, days: 3 }), 'Cefazolin', '>2000 g', '50 mg/kg/dose q12h', '125 mg q12h');
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
has('Gentamicin 預設 ODD（4 mg/kg/dose 為 ODD 的值）',
  run({ drug: 'Gentamicin', bw: 1500, days: 3, ga: 30 }), '4 mg/kg/dose');
is('ODD 在卡片的適應症選單中被選取',
  /data-variant="0"[^]*?<option value="(\d+)" selected>ODD</.test($('abxResult').innerHTML), true);
has('有血中濃度 → aminoglycoside 退場',
  run({ drug: 'Gentamicin', bw: 1500, days: 3, levels: true }), '請依血中濃度調整');
has('PMA>44 出註2提醒', run({ drug: 'Gentamicin', bw: 3000, days: 60, ga: 38 }), '註2');
has('Penicillin G 用 MU', run({ drug: 'Penicillin G', variant: 'sepsis', bw: 2000, days: 3 }), '5 MU/kg/dose', '10 MU q12h');
has('GBS meningitis 12.5 MU', run({ drug: 'Penicillin G', variant: 'GBS meningitis', bw: 2000, days: 3 }), '12.5 MU/kg/dose', '25 MU');
has('Clindamycin 範圍值不取中位數', run({ drug: 'Clindamycin', bw: 2000, days: 3 }), '5~7.5 mg/kg/dose', '10~15 mg');
has('Teicoplanin 不計算但顯示原文', run({ drug: 'Teicoplanin (Targocid)', bw: 2500, days: 10 }), '不做自動計算', '16 loading');
has('原文一併顯示可回溯', run({ drug: 'Cefotaxime (Claforan)', variant: 'meningitis', bw: 2500, days: 3 }), '原文「100 q12h」');
has('缺出生體重 → 拒答', run({ drug: 'Cefazolin', bw: '', days: 3 }), '請輸入出生體重');

// ── 計算過程與給藥指引 ──────────────────────────────────
has('計算過程逐步列出', run({ drug: 'Cefazolin', bw: 1500, cw: 1420, days: 3 }),
  '計算過程', '有效體重', '1500 g = 1.5 kg', '查表欄位', '原文「25 q12h」', '25 mg/kg × 1.5 kg', '37.5 mg q12h');
has('每日總量（摘要卡與步驟表單位一致）', text('abxResult'),
  '每日總量 75 mg/day', '24 ÷ 12 小時', '2 劑/日', '50 mg/kg/day');
has('q48h 標為平均每日', run({ drug: 'Amikacin', bw: 1000, days: 3 }), '平均每日', '24 ÷ 48 小時');
has('拒答時也顯示走到哪一步', run({ drug: 'Cefazolin', bw: 1000, days: 40 }), '計算過程', '查表欄位', '超過 4 週無建議劑量');
has('給藥指引：Penicillin G 快速輸注警告',
  run({ drug: 'Penicillin G', variant: 'sepsis', bw: 2000, days: 3 }), '給藥指引', 'IVD > 30 分鐘', '心律不整');
has('給藥指引：Teicoplanin 不可推注', run({ drug: 'Teicoplanin (Targocid)', bw: 2500, days: 10 }), '最高濃度 4 mg/mL', '不可推注');
has('沒有指引資料的藥不顯示該區塊',
  run({ drug: 'Cefepime', bw: 2500, days: 3 }).includes('給藥指引') ? 'HAS' : 'NONE', 'NONE');

// ── 多選（2026-09-24 新增）──────────────────────────────
clearAll(); setPatient({ bw: 2000, days: 3 });
addDrug('Cefazolin'); addDrug('Gentamicin', 'ODD'); addDrug('Penicillin G', 'sepsis');
has('三種藥同時列出', text('abxResult'), 'Cefazolin', 'Gentamicin', 'Penicillin G');
has('各藥各自算出劑量（2000 g 屬 1200~2000 帶，含上界）',
  text('abxResult'), '50 mg q12h', '8 mg q36h', '10 MU q12h');
is('三張卡片', (text('abxResult').match(/計算過程/g) || []).length, 3);
addDrug('Cefazolin');
is('重複加入同一藥不會變成兩張', (text('abxResult').match(/Cefazolin/g) || []).length, 1);
clickIn('data-remove', 1);
has('移除中間一張後其餘保留', text('abxResult'), 'Cefazolin', 'Penicillin G');
is('Gentamicin 已移除', text('abxResult').includes('Gentamicin'), false);
clearAll();
is('清空後結果區隱藏', $('abxResult').classList.contains('hidden'), true);

// 改病人資料後整批重算
clearAll(); setPatient({ bw: 2000, days: 3 });
addDrug('Cefazolin'); addDrug('Cefepime');
has('改體重前（Cefepime 2kg → 100 mg）', text('abxResult'), '100 mg q12h');
$('pBirthWeight').value = '3000'; $('pBirthWeight')._h.change();
has('改體重後兩張卡都跟著重算', text('abxResult'), '150 mg q12h', 'Cefazolin', 'Cefepime');

// ── 覆核（每張卡各自比對）────────────────────────────────
clearAll(); setPatient({ bw: 2500, days: 3 });
addDrug('Cefazolin');
has('覆核 interval 預設帶入本表值', text('abxResult'), '覆核：我打算開每劑');
has('覆核 125 → 符合', review(0, 125), '符合本表建議');
has('覆核 250 → 偏高 +100%', review(0, 250), '高於本表上限', '+100%');
has('覆核 60 → 偏低', review(0, 60), '低於本表下限');
has('覆核 interval 打錯會抓到', review(0, 125, 'q8h'), 'Interval 不符', 'q12h');
clearAll(); setPatient({ bw: 2500, days: 3 });
addDrug('Cefazolin'); addDrug('Cefepime');
review(1, 125);
has('第二張卡的覆核不影響第一張', text('abxResult'), '符合本表建議');
is('只有一個覆核結果', (text('abxResult').match(/符合本表建議|高於本表上限|低於本表下限/g) || []).length, 1);

// ── 來源小表與分界提醒（2026-09-24 新增）──────────────
has('來源小表列出該藥五格並標出出處',
  run({ drug: 'Cefazolin', bw: 1500, days: 3 }),
  '來源對照', '本表該藥的 5 格', '25 q12h', '25 q8h', '50 q12h', '50 q8h', 'Remington');
has('無建議劑量的格顯示為破折號',
  run({ drug: 'Ciprofloxacin', bw: 1500, days: 10 }), '來源對照', '10-20 q24h', '20-30 q12h', '—');
has('拒答時也附來源小表（看得到其他格有沒有值）',
  run({ drug: 'Ciprofloxacin', bw: 1000, days: 3 }), '本表於此體重／日齡無建議劑量', '來源對照');
has('2000 g 正好在分界上會提醒', run({ drug: 'Cefazolin', bw: 2000, days: 3 }), '正好在 2000 g 分界上', '非「>2000 g」');
has('1950 g 接近分界會提醒', run({ drug: 'Cefazolin', bw: 1950, days: 3 }), '距 2000 g 分界僅 50 g');
has('d7 正好在日齡分界上會提醒', run({ drug: 'Cefazolin', bw: 2500, days: 7 }), '第 7 天仍屬前一欄');
has('一般情況不出現分界提醒',
  run({ drug: 'Cefazolin', bw: 2500, days: 3 }).includes('分界') ? 'HAS' : 'NONE', 'NONE');

has('覆核附上劑量範圍帶', review(0, 250), '建議 125 mg', '312.5');

// ── 完整劑量表（2026-09-24 新增）──────────────────────
const fullText = () => $('abxFullTable').innerHTML.replace(/<[^>]+>/g, ' ')
  .replace(/&gt;/g, '>').replace(/&lt;/g, '<').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
clearAll();
has('未選藥時仍可瀏覽整張表', fullText(), '完整劑量表（29 列）', 'Amikacin', 'Teicoplanin');
has('自由文字用法以整列呈現', fullText(), 'For intact renal function', 'same as for piperacillin');
has('無建議劑量顯示破折號', fullText(), '—');
setPatient({ bw: 2500, days: 3 });
addDrug('Cefazolin');
has('選藥後標出格數', fullText(), '已標出選用的 1 格');
is('高亮一格', ($('abxFullTable').innerHTML.match(/ring-cyan-500/g) || []).length, 1);
addDrug('Cefepime'); addDrug('Clindamycin');
has('多選時同時標出多格', fullText(), '已標出選用的 3 格');
is('高亮三格', ($('abxFullTable').innerHTML.match(/ring-cyan-500/g) || []).length, 3);
$('pBirthWeight').value = '1000'; $('pBirthWeight')._h.change();
has('改體重後整張表的標記跟著移動', fullText(), '已標出選用的 3 格');
clearAll();
has('清空後標記消失', fullText(), '完整劑量表（29 列）');
has('表格附出處', fullText(), 'Remington');

// ── 版面順序（2026-09-24）：會改變劑量決策的警示必須排在數字前面 ──
const order = run({ drug: 'Cefazolin', bw: 1950, days: 3 });
is('分界警示排在「每劑」之前', order.indexOf('分界僅 50 g') < order.indexOf('每劑'), true);
const order2 = run({ drug: 'Gentamicin', bw: 1500, days: 3, levels: true });
is('血中濃度退場訊息排在最前段', order2.indexOf('請依血中濃度調整') < order2.indexOf('計算過程'), true);
const order3 = run({ drug: 'Cefazolin', bw: 2500, days: 3 });
is('覆核排在計算過程之前', order3.indexOf('覆核：我打算開每劑') < order3.indexOf('計算過程'), true);

// ── PMA 型藥品併入同一個分頁（2026-09-24）──────────────
clearAll(); setPatient({ bw: 1200, days: 3, ga: 28 });
is('Ampicillin 出現在 chip 清單', $('abxChips').innerHTML.includes('data-drug="Ampicillin"'), true);
addDrug('Ampicillin', 'Usual');
has('Ampicillin 三種用法都在卡片的選單裡', $('abxResult').innerHTML, 'Usual', 'Sepsis', 'Meningitis');
has('Ampicillin 1.2kg PMA28.4 d3 → 60 mg q12h',
  text('abxResult'), 'Ampicillin', 'Usual', 'PMA', '每劑', '60 mg q12h', '每日總量 120 mg/day');
has('依 PMA 帶判定並顯示依據', text('abxResult'), 'PMA <30 週，日齡 0-28 天');
has('PMA 判讀說明以警示呈現', text('abxResult'), '完成週數');
has('計算過程含 PMA 一行', text('abxResult'), '計算過程', 'PMA', '出生 GA ＋ 日齡 ÷ 7');
has('給藥指引含每日上限', text('abxResult'), '每日上限 400 mg/kg/day');
has('出處顯示在畫面上', text('abxResult'), '資料出處：院內新生兒工作手冊');

clearAll(); setPatient({ bw: 1000, days: 20, ga: 26 });
addDrug('Vancomycin', 'Bacteremia');
has('Vancomycin PMA28.9 d20 → q12h、每劑 10 mg', text('abxResult'), 'Vancomycin', '10 mg q12h');
has('Vancomycin 顯示 MIC 警告', text('abxResult'), 'resistance');

clearAll(); setPatient({ bw: 3000, days: 20, ga: 38 });
addDrug('Ampicillin/sulbactam (Unasyn)', '標準');
has('Unasyn 來源未涵蓋的組合會拒答', text('abxResult'), '來源未涵蓋', '無建議 interval');
clearAll(); setPatient({ bw: 2000, days: 3, ga: 34 });
addDrug('Ampicillin/sulbactam (Unasyn)', '標準');
has('Unasyn 濃度單位的判讀顯示於畫面',
  text('abxResult'), '最高濃度 45 mg/mL', '原文寫 g，本工具判讀為 mg');

// band 型與 pma 型可同時選入
clearAll(); setPatient({ bw: 1200, days: 3, ga: 28 });
addDrug('Ampicillin', 'Usual'); addDrug('Gentamicin', 'ODD');
has('兩種查表型態可並存', text('abxResult'), 'Ampicillin', 'Gentamicin');
is('兩張卡', (text('abxResult').match(/計算過程/g) || []).length, 2);
has('完整劑量表只標 band 型的那一格', fullText(), '已標出選用的 1 格');

// 覆核在 pma 型卡片上也要能用
clearAll(); setPatient({ bw: 1200, days: 3, ga: 28 });
addDrug('Ampicillin', 'Usual');
has('pma 卡片覆核 60 → 符合', review(0, 60), '符合本表建議');
has('pma 卡片覆核 120 → 偏高', review(0, 120), '高於本表上限');

// ── chip 選藥（2026-09-24）──────────────────────────────
const chipsHtml = $('abxChips').innerHTML;
const posOf = n => chipsHtml.indexOf('data-drug="' + n + '"');
const detailsAt = chipsHtml.indexOf('<details');
is('常用三種都在可展開區之前（即置頂）',
  ['Ampicillin', 'Gentamicin', 'Cefotaxime (Claforan)'].every(n => posOf(n) > -1 && posOf(n) < detailsAt), true);
is('常用列依 COMMON 順序排列',
  posOf('Ampicillin') < posOf('Gentamicin') && posOf('Gentamicin') < posOf('Cefotaxime (Claforan)'), true);
is('全部藥品收在可展開區', /<details[^]*?全部藥品（27）/.test(chipsHtml), true);
is('chip 總數 = 3 常用 + 27 全部', (chipsHtml.match(/data-drug="/g) || []).length, 30);

clearAll(); setPatient({ bw: 1200, days: 3, ga: 28 });
clickChip('Ampicillin');
has('點 chip 直接加入（帶預設用法）', text('abxResult'), 'Ampicillin', 'Usual', '60 mg q12h');
clickChip('Gentamicin');
clickChip('Cefotaxime (Claforan)');
is('三下點出三張卡', (text('abxResult').match(/計算過程/g) || []).length, 3);
clickChip('Ampicillin');
is('重複點同一個 chip 不會變成兩張', (text('abxResult').match(/Ampicillin/g) || []).length, 1);
is('點到非 chip 區域不觸發', ($('abxChips')._h.click({ target: { getAttribute: () => null } }), true), true);

// 卡片上切換適應症
clearAll(); setPatient({ bw: 2500, days: 3 });
clickChip('Cefotaxime (Claforan)');
has('預設 sepsis dose', text('abxResult'), '50 mg/kg/dose', '125 mg q12h');
setCardVariant(0, 'meningitis');
has('卡片上切成 meningitis 後劑量跟著變', text('abxResult'), '100 mg/kg/dose', '250 mg q12h');
is('切換後仍只有一張卡', (text('abxResult').match(/計算過程/g) || []).length, 1);

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
