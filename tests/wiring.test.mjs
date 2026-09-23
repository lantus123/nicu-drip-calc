// 靜態接線檢查：ui/*.js 抓的每個 id 都必須存在於 index.html，反之亦然。
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');
const uiFiles = ['ui/drip.js', 'ui/abx.js', 'ui/misc.js', 'ui/flu.js'];
const ui = uiFiles.map(f => fs.readFileSync(new URL(f, root), 'utf8')).join('\n');

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
const used = new Set([
  ...[...ui.matchAll(/\$\('([^']+)'\)/g)].map(m => m[1]),
  ...[...ui.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]),
]);
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : ' → ' + detail}`); };

const missing = [...used].filter(id => !ids.has(id) && id !== 'copyBtn'); // copyBtn 由 innerHTML 動態產生
check('腳本引用的 id 都存在於 HTML', missing.length === 0, missing.join(', '));
const orphan = [...ids].filter(id => /^(abx|misc|flu)/.test(id) && !used.has(id));
check('abx / misc / flu 的 id 都有被腳本使用', orphan.length === 0, orphan.join(', '));
check('分頁按鈕齊全', (html.match(/data-tab="/g) || []).length === 4, '應有 4 個');
check('四個面板都在', ['panel-drip','panel-abx','panel-misc','panel-flu'].every(i => ids.has(i)), '缺面板');
check('noindex 已設', /content="noindex/.test(html), '缺 noindex');
check('免責與出處在頁尾', html.includes('非通用臨床指引') && ids.has('abxSource'), '缺免責/出處');
check('body 不再裁掉溢出內容', !/<body[^>]*overflow-hidden/.test(html), 'overflow-hidden 仍在');
check('每支 ui 腳本都註冊 DOMContentLoaded',
  uiFiles.every(f => fs.readFileSync(new URL(f, root), 'utf8').includes("addEventListener('DOMContentLoaded'")), '有檔案沒註冊');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
