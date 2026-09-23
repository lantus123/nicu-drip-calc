// 靜態接線檢查：腳本抓的每個 id 都必須真的存在於 HTML，反之未用到的 abx id 也要抓出來。
import fs from 'node:fs';
const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const used = new Set([
  ...[...html.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]),
  ...[...html.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]),
]);
let pass = 0, fail = 0;
const check = (label, ok, detail) => { ok ? pass++ : fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : ' → ' + detail}`); };

const missing = [...used].filter(id => !ids.has(id) && id !== 'copyBtn'); // copyBtn 由 innerHTML 動態產生
check('腳本引用的 id 都存在於 HTML', missing.length === 0, missing.join(', '));

const orphan = [...ids].filter(id => /^(abx|misc|flu)/.test(id) && !used.has(id));
check('abx / misc / flu 的 id 都有被腳本使用', orphan.length === 0, orphan.join(', '));

check('分頁按鈕齊全', (html.match(/data-tab="/g) || []).length === 4, '應有 4 個');
check('四個面板都在', ['panel-drip','panel-abx','panel-misc','panel-flu'].every(i => ids.has(i)), '缺面板');
check('資料檔在邏輯檔之前載入',
  html.indexOf('data/abx-data.js') < html.indexOf('lib/abx-logic.js'), '載入順序錯');
check('外部檔都在使用它們的腳本之前',
  html.indexOf('lib/abx-logic.js') < html.indexOf('window.AbxLogic')
  && html.indexOf('lib/misc-logic.js') < html.indexOf('window.MiscLogic'), '載入順序錯');
check('misc 資料檔在邏輯檔之前載入',
  html.indexOf('data/misc-data.js') < html.indexOf('lib/misc-logic.js'), '載入順序錯');
check('flu 資料檔在邏輯檔之前載入',
  html.indexOf('data/flu-data.js') < html.indexOf('lib/flu-logic.js'), '載入順序錯');
check('flu 外部檔在使用它的腳本之前',
  html.indexOf('lib/flu-logic.js') < html.indexOf('window.FluLogic'), '載入順序錯');
check('noindex 已設', /content="noindex/.test(html), '缺 noindex');
check('免責與出處在頁尾', html.includes('非通用臨床指引') && ids.has('abxSource'), '缺免責/出處');
check('body 不再裁掉溢出內容', !/<body[^>]*overflow-hidden/.test(html), 'overflow-hidden 仍在');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
