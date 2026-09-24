// 給藥途徑：解析、合併儲存格繼承、口服/針劑判別
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const R = require(new URL('../lib/route.js', import.meta.url).pathname);
const D = require(new URL('../data/abx-data.js', import.meta.url).pathname);

let pass = 0, fail = 0;
const eq = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${label}` + (ok ? '' : `\n      got=${JSON.stringify(got)} want=${JSON.stringify(want)}`));
};
const keys = s => R.parse(s).routes.map(r => r.key);
const byName = {};
D.drugs.forEach(d => (byName[d.name] = byName[d.name] || []).push(d));
const resolveFor = (name, indication) => {
  const item = byName[name].find(d => indication === undefined || d.indication === indication);
  return R.resolve(item, D.drugs);
};

// ── 解析 ────────────────────────────────────────────────
eq('IV, IM', keys('IV, IM'), ['IV', 'IM']);
eq('IV, IM, PO', keys('IV, IM, PO'), ['IV', 'IM', 'PO']);
eq('單獨 PO', keys('PO'), ['PO']);
eq('單獨 IM', keys('IM'), ['IM']);
eq('IVD 視為 IV', keys('IVD'), ['IV']);
eq('ETT', keys('ETT'), ['ETT']);
eq('空字串無途徑', keys(''), []);
eq('IVD / >30 min 拆出輸注說明', R.parse('IVD / >30 min').note, '>30 min');
eq('IVD 10-15 分鐘 拆出輸注說明', R.parse('IVD 10-15 分鐘').note, '10-15 分鐘');
eq('PO / IV（over 30 mins）', keys('PO / IV（over 30 mins）'), ['IV', 'PO']);

// ── 合併儲存格繼承（這是原本畫面空白的四項）──────────────
eq('Cefotaxime meningitis 繼承 sepsis 的途徑',
  resolveFor('Cefotaxime (Claforan)', 'meningitis').routes.map(r => r.key), ['IV', 'IM']);
eq('繼承者有標記', resolveFor('Cefotaxime (Claforan)', 'meningitis').inherited, true);
eq('Meropenem meningitis 有途徑', resolveFor('Meropenem', 'meningitis').routes.length > 0, true);
eq('Oxacillin meningitis 有途徑', resolveFor('Oxacillin', 'meningitis').routes.length > 0, true);
eq('Penicillin G GBS 繼承 sepsis', resolveFor('Penicillin G', 'GBS meningitis').routes.map(r => r.key), ['IV']);
eq('自己有途徑者不標繼承', resolveFor('Cefazolin').inherited, undefined);

// ── 口服／針劑判別 ──────────────────────────────────────
const info = s => R.parse(s);
eq('Erythromycin 僅口服', R.onlyOral(info('PO')), true);
eq('Clindamycin 非僅口服', R.onlyOral(info('IV, IM, PO')), false);
eq('Clindamycin 含口服', R.hasOral(info('IV, IM, PO')), true);
eq('Cefazolin 不含口服', R.hasOral(info('IV, IM')), false);
eq('Penicillin benzathine 僅肌注', R.onlyIM(info('IM')), true);
eq('IV, IM 非僅肌注', R.onlyIM(info('IV, IM')), false);
eq('針劑判定', R.hasInjection(info('IVD / >30 min')), true);
eq('純口服不算針劑', R.hasInjection(info('PO')), false);

// ── 窮舉：沒有任何一種藥解析不出途徑 ────────────────────
// 這條是安全網：未來新增的藥若忘了填途徑，這裡就會紅。
const PD = require(new URL('../data/abx-pma-data.js', import.meta.url).pathname);
const pool = D.drugs.concat(PD.drugs);
const missing = pool.filter(d => R.resolve(d, pool).routes.length === 0)
  .map(d => d.name + (d.indication ? '(' + d.indication + ')' : ''));
eq('全部藥品都解析得出途徑（含 PMA 型）', missing, []);

// sameAs 是資料驅動的，不靠程式比對藥名
const pipTazo = D.drugs.find(d => d.name === 'Piperacillin/tazobactam');
eq('Pip/tazo 在資料裡明寫 sameAs', pipTazo.sameAs, 'Piperacillin');
eq('Pip/tazo 依 sameAs 取得途徑', R.resolve(pipTazo, pool).routes.map(r => r.key), ['IV', 'IM']);
eq('Pip/tazo 標記為繼承而來', R.resolve(pipTazo, pool).inherited, true);
eq('沒有 sameAs 也沒有同名兄弟時不會亂繼承',
  R.resolve({ name: '不存在的藥', route: '' }, pool).routes, []);

console.log(`\n通過 ${pass} ／ 失敗 ${fail}`);
process.exit(fail ? 1 : 0);
