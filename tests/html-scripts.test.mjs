// HTML 內嵌腳本結構檢查。
// 起因：2026-09-23 一次 splice 把 drip 腳本的收尾 </script> 吃掉，
// 造成瀏覽器把兩塊腳本當成一塊 parse，整塊 SyntaxError，線上完全沒反應，
// 而當時所有測試（各自抽出單一區塊執行）都是綠的。此測試補上這個缺口。
import fs from 'node:fs';
const file = process.argv[2] ? new URL(process.argv[2], `file://${process.cwd()}/`) : new URL('../index.html', import.meta.url);
const html = fs.readFileSync(file, 'utf8');

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : ' → ' + detail}`); };

const opens = [...html.matchAll(/<script(\s[^>]*)?>/g)];
const closes = [...html.matchAll(/<\/script>/g)];
check('<script> 與 </script> 數量相同', opens.length === closes.length,
  `開 ${opens.length} / 關 ${closes.length}`);

// 依序配對，抓出未閉合或巢狀
let cursor = 0, blocks = [], nested = [];
for (const o of opens) {
  const hasSrc = /\ssrc=/.test(o[0]);
  const bodyStart = o.index + o[0].length;
  const closeIdx = html.indexOf('</script>', bodyStart);
  if (closeIdx === -1) { nested.push(`第 ${html.slice(0, o.index).split('\n').length} 行的 <script> 沒有收尾`); continue; }
  const body = html.slice(bodyStart, closeIdx);
  if (/<script/.test(body)) nested.push(`第 ${html.slice(0, o.index).split('\n').length} 行的 <script> 區塊內出現另一個 <script>（前一塊未閉合）`);
  if (!hasSrc) blocks.push({ line: html.slice(0, o.index).split('\n').length, body });
  cursor = closeIdx;
}
check('沒有未閉合或巢狀的 <script>', nested.length === 0, nested.join('；'));
check('內嵌腳本區塊數 = 4', blocks.length === 4, `實際 ${blocks.length}`);

// 逐塊真的拿去 parse —— 這才是會抓到 Unexpected token '<' 的那一步
for (const b of blocks) {
  let err = null;
  try { new Function(b.body); } catch (e) { err = e.message; }
  check(`第 ${b.line} 行的內嵌腳本可正常 parse`, err === null, err || '');
}

// 每塊都應該掛在 DOMContentLoaded 上
check('每塊內嵌腳本都註冊 DOMContentLoaded',
  blocks.every(b => b.body.includes("addEventListener('DOMContentLoaded'")), '有區塊沒註冊');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
