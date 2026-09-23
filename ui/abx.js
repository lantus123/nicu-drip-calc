// 抗生素劑量 分頁的介面邏輯。
  // ───────── 抗生素劑量分頁 ─────────
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.ABX_DATA, L = window.AbxLogic, ADMIN = window.ABX_ADMIN || {};
    var $ = function (id) { return document.getElementById(id); };

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
      if (list.length <= 1) { wrap.classList.add('hidden'); }
      else {
        list.forEach(function (d, i) {
          var o = document.createElement('option'); o.value = String(i); o.textContent = variantLabel(d);
          sel.appendChild(o);
        });
        // 裁決3：Gentamicin 預設 ODD
        var odd = list.findIndex(function (d) { return d.regimen === 'ODD'; });
        sel.value = String(odd >= 0 ? odd : 0);
        wrap.classList.remove('hidden');
      }
      hideResults();
    }
    function currentDrug() {
      var list = byName[$('abxDrug').value] || [];
      return list.length <= 1 ? list[0] : list[parseInt($('abxVariant').value, 10) || 0];
    }
    function hideResults() {
      $('abxResult').classList.add('hidden');
      $('abxReviewBox').classList.add('hidden');
      $('abxReviewResult').classList.add('hidden');
    }
    $('abxDrug').addEventListener('change', refreshVariants);
    $('abxVariant').addEventListener('change', hideResults);
    refreshVariants();

    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
    var fmt = function (n) { return Math.round(n * 100) / 100; };
    var lastResolved = null, lastWeight = null;

    function calc() {
      var drug = currentDrug();
      var ew = L.effectiveWeight(parseFloat($('abxBirthWeight').value), parseFloat($('abxCurrentWeight').value));
      var days = parseFloat($('abxAgeDays').value);
      var ga = parseFloat($('abxGaWeeks').value);
      var box = $('abxResult'); box.classList.remove('hidden');
      lastResolved = null; lastWeight = null;
      $('abxReviewBox').classList.add('hidden');
      $('abxReviewResult').classList.add('hidden');

      if (!ew.g) { box.innerHTML = note('red', ew.reason); return; }
      var sel = L.selectBand(ew.g, days);
      if (sel.error) { box.innerHTML = note('red', sel.error); return; }
      var res = L.resolveDose(drug, sel, { hasLevels: $('abxHasLevels').checked });

      var head = '<div class="text-sm text-gray-600 mb-1">'
        + '<span class="font-bold text-gray-800">' + esc(drug.name) + '</span>'
        + (drug.indication || drug.regimen ? ' <span class="text-gray-500">(' + esc(variantLabel(drug)) + ')</span>' : '')
        + (drug.route ? ' · ' + esc(drug.route) : '')
        + '</div>'
        + '<div class="text-sm text-gray-500 mb-1">使用體重 <b>' + ew.g + ' g</b>（' + esc(ew.reason) + '）　對應 <b>' + esc(sel.label) + '</b></div>';

      var warns = L.warnings(drug, ga > 0 && days >= 0 ? ga + days / 7 : 0);
      if (res.ok && res.intervalNote) warns.unshift(res.intervalNote);
      var warnHtml = warns.length
        ? '<div class="mt-1 space-y-0.5">' + warns.map(function (w) {
            return '<div class="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">⚠ ' + esc(w) + '</div>';
          }).join('') + '</div>' : '';

      if (!res.ok) {
        box.innerHTML = '<div class="border-t border-gray-300 pt-2 mt-2">' + head
          + note('red', res.reason)
          + (res.freeText || res.raw ? '<div class="text-sm text-gray-600 mt-1 bg-gray-50 border border-gray-200 rounded px-3 py-2">原文：' + esc(res.freeText || res.raw) + '</div>' : '')
          + stepsHtml(L.explain(drug, sel, res, ew, ew.g))
          + adminHtml(drug)
          + warnHtml + '</div>';
        return;
      }

      var pd = L.perDose(res, ew.g);
    var dt = L.dailyTotal(res, ew.g);
    var perKg = res.min === res.max ? fmt(res.min) : fmt(res.min) + '~' + fmt(res.max);
    var per = pd.min === pd.max ? fmt(pd.min) : fmt(pd.min) + '~' + fmt(pd.max);
    var daily = dt
      ? '<div class="text-sm text-cyan-700 mt-1">' + (dt.averaged ? '平均每日' : '每日總量') + ' '
        + (dt.min === dt.max ? fmt(dt.min) : fmt(dt.min) + '~' + fmt(dt.max)) + ' ' + esc(res.unit)
        + '（' + (dt.perKgMin === dt.perKgMax ? fmt(dt.perKgMin) : fmt(dt.perKgMin) + '~' + fmt(dt.perKgMax))
        + ' ' + esc(res.unit) + '/kg/day）</div>' : '';

    box.innerHTML = '<div class="border-t border-gray-300 pt-2 mt-2">' + head
      + '<div class="flex gap-2">'
      +   '<div class="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">'
      +     '<div class="text-sm text-gray-500 font-bold mb-1">本表建議</div>'
      +     '<div class="text-base font-medium text-gray-800">' + perKg + ' ' + esc(res.unit) + '/kg/dose ' + esc(res.interval) + '</div>'
      +     '<div class="text-sm text-gray-400 mt-1">原文：' + esc(res.raw) + '</div>'
      +   '</div>'
      +   '<div class="flex-1 bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex flex-col justify-center">'
      +     '<div class="text-sm text-cyan-600 font-bold mb-1">每劑</div>'
      +     '<div class="text-xl font-bold text-cyan-800 leading-tight">' + per + ' ' + esc(res.unit) + ' ' + esc(res.interval) + '</div>'
      +     daily
      +   '</div>'
      + '</div>'
      + stepsHtml(L.explain(drug, sel, res, ew, ew.g))
      + adminHtml(drug)
      + warnHtml + '</div>';

    lastResolved = res; lastWeight = ew.g;
      $('abxOrderedInterval').value = res.interval;
      $('abxReviewBox').classList.remove('hidden');
    }

    // 計算過程：預設收合，展開後每一行都能獨立驗算
    function stepsHtml(steps) {
      return '<details open class="mt-4">'
        + '<summary class="text-sm font-semibold text-cyan-700 cursor-pointer select-none hover:underline">計算過程（' + steps.length + ' 步）</summary>'
        + '<div class="steps mt-2 border border-gray-200 rounded-lg overflow-hidden">'
        + steps.map(function (st, i) {
            return '<div class="flex gap-2 px-3 py-2 text-sm ' + (i % 2 ? 'bg-white' : 'bg-gray-50') + (st.emphasis ? ' font-semibold' : '') + '">'
              + '<div class="w-24 shrink-0 font-medium text-gray-500">' + esc(st.label) + '</div>'
              + '<div class="flex-1 text-gray-600">' + esc(st.detail || '') + '</div>'
              + '<div class="shrink-0 text-gray-900">' + esc(st.value) + '</div>'
              + '</div>';
          }).join('')
        + '</div></details>';
    }

    // 給藥指引：僅來源文件明載的中性事實
    function adminHtml(drug) {
      var a = ADMIN[drug.name];
      if (!a) return '';
      var items = []
        .concat(a.loading ? [{ t: a.loading, warn: false }] : [])
        .concat((a.notes || []).map(function (x) { return { t: x, warn: false }; }))
        .concat((a.cautions || []).map(function (x) { return { t: x, warn: true }; }));
      if (!items.length) return '';
      return '<details class="mt-1">'
        + '<summary class="text-sm text-cyan-700 cursor-pointer select-none hover:underline">▸ 給藥指引（' + items.length + ' 項）</summary>'
        + '<div class="mt-1 space-y-0.5">'
        + items.map(function (it) {
            return '<div class="text-sm rounded px-3 py-1.5 border '
              + (it.warn ? 'bg-red-50 border-red-200 text-red-900' : 'bg-slate-50 border-slate-200 text-slate-700')
              + '">' + (it.warn ? '⚠ ' : '') + esc(it.t) + '</div>';
          }).join('')
        + '</div></details>';
    }

    function note(color, text) {
      var cls = color === 'red' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-gray-50 border-gray-200 text-gray-700';
      return '<div class="text-sm rounded border px-3 py-2 ' + cls + '">' + esc(text) + '</div>';
    }

    function review() {
      if (!lastResolved) return;
      var r = L.reviewOrder(lastResolved, lastWeight, parseFloat($('abxOrderedDose').value), $('abxOrderedInterval').value);
      var box = $('abxReviewResult'); box.classList.remove('hidden');
      if (r.verdict === 'n/a') { box.innerHTML = note('gray', r.text); return; }
      var map = {
        match: ['bg-green-100 border-green-300 text-green-900', '✅', '符合本表建議'],
        high:  ['bg-red-100 border-red-300 text-red-900', '❌', '高於本表上限'],
        low:   ['bg-red-100 border-red-300 text-red-900', '❌', '低於本表下限'],
      }[r.verdict];
      var dev = r.deviation ? '（' + (r.deviation > 0 ? '+' : '') + Math.round(r.deviation) + '%）' : '';
      var iv = r.intervalMatch === false
        ? '<div class="text-sm mt-1">⚠ Interval 不符：本表為 <b>' + esc(r.expectedInterval) + '</b></div>' : '';
      box.innerHTML = '<div class="rounded border px-3 py-2.5 text-center ' + map[0] + '">'
        + '<div class="text-base font-bold">' + map[1] + ' ' + map[2] + ' ' + dev + '</div>'
        + '<div class="text-sm opacity-80 mt-1">本表每劑 ' + fmt(r.perDose.min) + (r.perDose.min === r.perDose.max ? '' : '~' + fmt(r.perDose.max))
        + ' ' + esc(r.perDose.unit) + ' ' + esc(r.perDose.interval) + '　你輸入 ' + fmt(r.ordered) + ' ' + esc(r.perDose.unit) + '</div>'
        + iv + '</div>';
    }

    $('abxCalcBtn').addEventListener('click', calc);
    $('abxReviewBtn').addEventListener('click', review);
    ['abxBirthWeight', 'abxCurrentWeight', 'abxAgeDays', 'abxGaWeeks', 'abxHasLevels'].forEach(function (id) {
      $(id).addEventListener('change', hideResults);
    });

    $('abxDataVersion').textContent = D.dataVersion;
    $('abxSource').textContent = D.source;
  });
