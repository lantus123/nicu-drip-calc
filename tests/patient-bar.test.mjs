// 病人資料列：收合與摘要
import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const code = fs.readFileSync(new URL('../ui/patient-bar.js', import.meta.url), 'utf8');

const els = new Map(); const docHandlers = {};
function makeEl(id) {
  return { id, value: '', textContent: '', _h: {},
    classList: { _s: new Set(), add(c){this._s.add(c);}, remove(c){this._s.delete(c);},
      toggle(c, on){ on ? this._s.add(c) : this._s.delete(c); }, contains(c){ return this._s.has(c); } },
    addEventListener(ev, fn){ this._h[ev] = fn; } };
}
const document = {
  addEventListener: (ev, fn) => { docHandlers[ev] = fn; },
  getElementById: id => { if (!els.has(id)) els.set(id, makeEl(id)); return els.get(id); },
};
globalThis.document = document; globalThis.window = globalThis; globalThis.self = globalThis;
globalThis.Patient = require(new URL('../lib/patient.js', import.meta.url).pathname);
vm.runInThisContext('(function(){' + code + '})()');
docHandlers.DOMContentLoaded();

const $ = id => document.getElementById(id);
let pass = 0, fail = 0;
const is = (label, got, want) => { const ok = got === want; ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : ` got=${JSON.stringify(got)} want=${JSON.stringify(want)}`)); };

is('預設展開', $('pFields').classList.contains('hidden'), false);
is('預設按鈕為收合', $('pToggle').textContent, '收合');
is('展開時不顯示摘要', $('pSummary').textContent, '');

$('pBirthWeight').value = '1500'; $('pCurrentWeight').value = '1420';
$('pAgeDays').value = '3'; $('pGaWeeks').value = '30';
$('pToggle')._h.click();
is('收合後欄位隱藏', $('pFields').classList.contains('hidden'), true);
is('收合後按鈕為修改', $('pToggle').textContent, '修改');
is('摘要顯示已填欄位', $('pSummary').textContent, '1500 g・當下 1420 g・日齡 3 天・GA 30 週');

$('pCcr').value = '40';
$('pCcr')._h.change();
is('收合狀態下改值摘要即時更新', $('pSummary').textContent.includes('CCr 40'), true);

$('pToggle')._h.click();
is('再按一次展開', $('pFields').classList.contains('hidden'), false);

// 未填寫時
['pBirthWeight','pCurrentWeight','pAgeDays','pGaWeeks','pCcr'].forEach(id => { $(id).value = ''; });
$('pToggle')._h.click();
is('未填寫時摘要為提示文字', $('pSummary').textContent, '尚未填寫');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
