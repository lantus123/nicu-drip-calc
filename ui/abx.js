// 抗生素劑量分頁的介面邏輯。可同時選多種藥，每種各一張卡。
document.addEventListener('DOMContentLoaded', function () {
  var D = window.ABX_DATA, L = window.AbxLogic, ADMIN = window.ABX_ADMIN || {};
  var R = window.UiRender, P = window.Patient;
  var $ = function (id) { return document.getElementById(id); };
  var esc = R.esc;
  var fmt = function (n) { return Math.round(n * 100) / 100; };
  var range = function (a, b) { return a === b ? fmt(a) : fmt(a) + '~' + fmt(b); };

  // 分頁切換
  var panels = { drip: $('panel-drip'), abx: $('panel-abx'), misc: $('panel-misc'), flu: $('panel-flu') };
  Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (btn) {
    btn.addEventListener('click', function () {
      var key = btn.getAttribute('data-tab');
      Object.keys(panels).forEach(function (k) { panels[k].classList.toggle('hidden', k !== key); });
      Array.prototype.forEach.call(document.querySelectorAll('[data-tab]'), function (b) {
        var on = b === btn;
        b.classList.toggle('bg-cyan-600', on); b.classList.toggle('text-white', on);
        b.classList.toggle('bg-gray-100', !on); b.classList.toggle('text-gray-600', !on);
      });
    });
  });

  // 藥品下拉：同名多項（適應症／給法）收成第二個下拉，Gentamicin 預設 ODD
  var byName = {};
  D.drugs.forEach(function (d) { (byName[d.name] = byName[d.name] || []).push(d); });
  Object.keys(byName).sort().forEach(function (name) {
    var o = document.createElement('option'); o.value = name; o.textContent = name;
    $('abxDrug').appendChild(o);
  });

  function variantLabel(d) { return d.indication || d.regimen || '標準'; }
  function refreshVariants() {
    var list = byName[$('abxDrug').value] || [], wrap = $('abxVariantWrap'), sel = $('abxVariant');
    sel.innerHTML = '';
    if (list.length <= 1) { wrap.classList.add('hidden'); return; }
    list.forEach(function (d, i) {
      var o = document.createElement('option'); o.value = String(i); o.textContent = variantLabel(d);
      sel.appendChild(o);
    });
    var odd = -1;
    list.forEach(function (d, i) { if (d.regimen === 'ODD' && odd < 0) odd = i; });
    sel.value = String(odd >= 0 ? odd : 0);
    wrap.classList.remove('hidden');
  }
  function currentDrug() {
    var list = byName[$('abxDrug').value] || [];
    return list.length <= 1 ? list[0] : list[parseInt($('abxVariant').value, 10) || 0];
  }
  $('abxDrug').addEventListener('change', refreshVariants);
  refreshVariants();

  // 已選入的藥；病人資料變動時整批重算
  var selected = [];
  var reviewInput = {};   // 各卡已輸入的覆核值，重算後保留

  function add() {
    var drug = currentDrug();
    if (!drug) return;
    var dup = selected.filter(function (d) { return d.id === drug.id; }).length > 0;
    if (!dup) selected.push(drug);
    renderAll();
  }
  function clearAll() { selected = []; reviewInput = {}; renderAll(); }
  $('abxCalcBtn').addEventListener('click', add);
  $('abxClearBtn').addEventListener('click', clearAll);
  $('abxHasLevels').addEventListener('change', renderAll);
  P.onChange(renderAll);

  function renderAll() {
    var box = $('abxResult');
    if (!selected.length) { box.classList.add('hidden'); box.innerHTML = ''; return; }
    box.classList.remove('hidden');
    box.innerHTML = selected.map(cardHtml).join('');
  }

  function cardHtml(drug, idx) {
    var pt = P.read();
    var ew = P.effectiveWeight(pt);
    var head = '<div class="flex items-start justify-between gap-2">'
      + '<div class="text-base"><span class="font-bold text-gray-900">' + esc(drug.name) + '</span>'
      + (drug.indication || drug.regimen ? ' <span class="text-gray-500">(' + esc(variantLabel(drug)) + ')</span>' : '')
      + (drug.route ? ' <span class="text-sm text-gray-500">· ' + esc(drug.route) + '</span>' : '') + '</div>'
      + '<button data-remove="' + idx + '" class="btn shrink-0 rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="移除">✕</button>'
      + '</div>';

    var body;
    if (!ew.g) {
      body = warnBox('red', ew.reason);
    } else {
      var sel = L.selectBand(ew.g, pt.ageDays);
      if (sel.error) {
        body = warnBox('red', sel.error);
      } else {
        var res = L.resolveDose(drug, sel, { hasLevels: $('abxHasLevels').checked });
        var meta = '<div class="mt-1 text-sm text-gray-500">使用體重 <b class="text-gray-700">' + ew.g + ' g</b>（'
          + esc(ew.reason) + '）　對應 <b class="text-gray-700">' + esc(sel.label) + '</b></div>';
        var warns = L.warnings(drug, pt.pmaWeeks || 0);
        if (res.ok && res.intervalNote) warns.unshift(res.intervalNote);
        var warnHtml = warns.map(function (w) { return warnBox('amber', w); }).join('');

        if (!res.ok) {
          body = meta + warnBox('red', res.reason)
            + (res.freeText || res.raw ? '<div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">原文：' + esc(res.freeText || res.raw) + '</div>' : '')
            + R.stepsHtml(L.explain(drug, sel, res, ew, ew.g))
            + R.guideHtml(ADMIN[drug.name]) + warnHtml;
        } else {
          var pd = L.perDose(res, ew.g), dt = L.dailyTotal(res, ew.g);
          var daily = dt ? '<div class="mt-1 text-sm text-cyan-700">' + (dt.averaged ? '平均每日' : '每日總量') + ' '
            + range(dt.min, dt.max) + ' ' + esc(res.unit) + '/day（' + range(dt.perKgMin, dt.perKgMax) + ' ' + esc(res.unit) + '/kg/day）</div>' : '';
          body = meta
            + '<div class="mt-3 flex flex-wrap gap-3">'
            +   '<div class="min-w-[200px] flex-1 rounded-lg border border-gray-200 bg-gray-50 p-3">'
            +     '<div class="text-sm font-bold text-gray-500">本表建議</div>'
            +     '<div class="text-base text-gray-800">' + range(res.min, res.max) + ' ' + esc(res.unit) + '/kg/dose ' + esc(res.interval) + '</div>'
            +     '<div class="mt-1 text-sm text-gray-400">原文：' + esc(res.raw) + '</div>'
            +   '</div>'
            +   '<div class="min-w-[200px] flex-1 rounded-lg border border-cyan-200 bg-cyan-50 p-3">'
            +     '<div class="text-sm font-bold text-cyan-600">每劑</div>'
            +     '<div class="text-xl font-bold leading-tight text-cyan-800">' + range(pd.min, pd.max) + ' ' + esc(res.unit) + ' ' + esc(res.interval) + '</div>'
            +     daily
            +   '</div>'
            + '</div>'
            + R.stepsHtml(L.explain(drug, sel, res, ew, ew.g))
            + R.guideHtml(ADMIN[drug.name])
            + reviewHtml(idx, res, pd)
            + warnHtml;
        }
      }
    }
    return '<article class="mb-4 rounded-xl border border-gray-200 p-4">' + head + body + '</article>';
  }

  function warnBox(tone, text) {
    var cls = tone === 'red' ? 'bg-red-50 border-red-200 text-red-900' : 'bg-amber-50 border-amber-200 text-amber-900';
    return '<div class="mt-2 rounded-lg border px-3 py-2 text-sm ' + cls + '">' + (tone === 'amber' ? '⚠ ' : '') + esc(text) + '</div>';
  }

  // 覆核：每張卡各自比對
  function reviewHtml(idx, res, pd) {
    var saved = reviewInput[idx] || {};
    var opts = ['', 'q6h', 'q8h', 'q12h', 'q18h', 'q24h', 'q36h', 'q48h'].map(function (v) {
      var label = v || '—';
      var chosen = (saved.interval !== undefined ? saved.interval : res.interval) === v;
      return '<option value="' + v + '"' + (chosen ? ' selected' : '') + '>' + label + '</option>';
    }).join('');
    var out = saved.verdict ? verdictHtml(saved.verdict) : '';
    return '<div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">'
      + '<div class="flex flex-wrap items-end gap-3">'
      +   '<div class="min-w-[140px] flex-1"><label class="compact-label">覆核：我打算開每劑</label>'
      +     '<input type="number" step="0.1" data-dose="' + idx + '" value="' + (saved.dose === undefined ? '' : saved.dose) + '" placeholder="' + esc(res.unit) + '" class="block w-full rounded border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 compact-input"></div>'
      +   '<div class="w-28"><label class="compact-label">Interval</label>'
      +     '<select data-interval="' + idx + '" class="block w-full rounded border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 compact-input">' + opts + '</select></div>'
      +   '<button data-review="' + idx + '" class="btn h-11 whitespace-nowrap rounded-lg bg-slate-600 px-4 text-sm font-bold text-white hover:bg-slate-700">覆核</button>'
      + '</div>' + out + '</div>';
  }

  function verdictHtml(v) {
    var map = {
      match: ['bg-green-100 border-green-300 text-green-900', '✅', '符合本表建議'],
      high: ['bg-red-100 border-red-300 text-red-900', '❌', '高於本表上限'],
      low: ['bg-red-100 border-red-300 text-red-900', '❌', '低於本表下限'],
      na: ['bg-gray-100 border-gray-300 text-gray-700', '', ''],
    }[v.verdict] || ['bg-gray-100 border-gray-300 text-gray-700', '', ''];
    if (v.verdict === 'na') return '<div class="mt-2 rounded-lg border px-3 py-2 text-sm ' + map[0] + '">' + esc(v.text) + '</div>';
    var dev = v.deviation ? '（' + (v.deviation > 0 ? '+' : '') + Math.round(v.deviation) + '%）' : '';
    var iv = v.intervalMatch === false
      ? '<div class="mt-1 text-sm">⚠ Interval 不符：本表為 <b>' + esc(v.expectedInterval) + '</b></div>' : '';
    return '<div class="mt-2 rounded-lg border px-3 py-2 text-center ' + map[0] + '">'
      + '<div class="text-base font-bold">' + map[1] + ' ' + map[2] + ' ' + dev + '</div>'
      + '<div class="mt-1 text-sm opacity-80">本表每劑 ' + range(v.perDose.min, v.perDose.max) + ' ' + esc(v.perDose.unit)
      + ' ' + esc(v.perDose.interval) + '　你輸入 ' + fmt(v.ordered) + ' ' + esc(v.perDose.unit) + '</div>' + iv + '</div>';
  }

  // 卡片是重繪出來的，因此用事件委派
  $('abxResult').addEventListener('click', function (e) {
    var t = e.target;
    var rm = t.getAttribute && t.getAttribute('data-remove');
    if (rm !== null && rm !== undefined) {
      selected.splice(parseInt(rm, 10), 1); reviewInput = {}; renderAll(); return;
    }
    var rv = t.getAttribute && t.getAttribute('data-review');
    if (rv !== null && rv !== undefined) {
      var i = parseInt(rv, 10);
      var box = $('abxResult');
      var doseEl = box.querySelector('[data-dose="' + i + '"]');
      var ivEl = box.querySelector('[data-interval="' + i + '"]');
      var pt = P.read(), ew = P.effectiveWeight(pt);
      var sel = L.selectBand(ew.g, pt.ageDays);
      var res = L.resolveDose(selected[i], sel, { hasLevels: $('abxHasLevels').checked });
      var v = L.reviewOrder(res, ew.g, parseFloat(doseEl.value), ivEl.value);
      reviewInput[i] = { dose: doseEl.value, interval: ivEl.value, verdict: v };
      renderAll();
    }
  });

  $('abxDataVersion').textContent = D.dataVersion;
  $('abxSource').textContent = D.source;
});
