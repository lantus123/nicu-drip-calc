// 腳本結構檢查。
// 起因：2026-09-23 一次往 HTML 內塞 inline script 的字串替換吃掉了 </script>，
// 造成瀏覽器整段 SyntaxError、線上完全沒反應，而當時測試全綠。
// 現在介面邏輯已全部外置，這裡確保它維持如此，並逐支實際 parse。
import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const html = fs.readFileSync(new URL('index.html', root), 'utf8');

let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : ' → ' + detail}`); };

const opens = [...html.matchAll(/<script(\s[^>]*)?>/g)];
const closes = [...html.matchAll(/<\/script>/g)];
check('<script> 與 </script> 數量相同', opens.length === closes.length, `開 ${opens.length} / 關 ${closes.length}`);

const inline = opens.filter(o => !/\ssrc=/.test(o[0]));
check('HTML 內沒有 inline script（介面邏輯一律外置）', inline.length === 0,
  `仍有 ${inline.length} 段，行號 ${inline.map(o => html.slice(0, o.index).split('\n').length).join(', ')}`);

// 逐支外部腳本實際 parse
const srcs = opens.map(o => (o[0].match(/src="([^"]+)"/) || [])[1]).filter(Boolean).filter(s => !/^https?:/.test(s));
check('外部腳本數 = 16', srcs.length === 16, `實際 ${srcs.length}: ${srcs.join(', ')}`);
for (const src of srcs) {
  let err = null;
  try { new Function(fs.readFileSync(new URL(src, root), 'utf8')); } catch (e) { err = e.message; }
  check(`${src} 可正常 parse`, err === null, err || '');
}

// 載入順序：資料 → 邏輯 → 介面
const at = s => html.indexOf(s);
check('資料檔都排在對應邏輯檔之前',
  at('data/abx-data.js') < at('lib/abx-logic.js') &&
  at('data/misc-data.js') < at('lib/misc-logic.js') &&
  at('data/flu-data.js') < at('lib/flu-logic.js'), '載入順序錯');
check('病人資料模組排在各分頁介面檔之前',
  at('lib/patient.js') < Math.min(at('ui/drip.js'), at('ui/abx.js'), at('ui/misc.js'), at('ui/flu.js')), '載入順序錯');
check('共用 render 排在各分頁介面檔之前',
  at('ui/render.js') < Math.min(at('ui/drip.js'), at('ui/abx.js'), at('ui/misc.js'), at('ui/flu.js')), '載入順序錯');
check('邏輯檔都排在介面檔之前',
  Math.max(at('lib/abx-logic.js'), at('lib/misc-logic.js'), at('lib/flu-logic.js')) < Math.min(at('ui/abx.js'), at('ui/misc.js'), at('ui/flu.js')), '載入順序錯');

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
