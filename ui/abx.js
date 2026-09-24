// 抗生素劑量分頁的介面邏輯。可同時選多種藥，每種各一張卡。
document.addEventListener('DOMContentLoaded', function () {
  var D = window.ABX_DATA, L = window.AbxLogic, ADMIN = window.ABX_ADMIN || {};
  var PD = window.ABX_PMA_DATA, PL = window.AbxPmaLogic;
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
  // 兩種查表型態統一成 item：band =「體重帶 × 日齡」；pma =「PMA × 日齡」
  var byName = {};
  D.drugs.forEach(function (d) {
    (byName[d.name] = byName[d.name] || []).push({
      id: d.id, kind: 'band', name: d.name, route: d.route,
      variant: d.indication || d.regimen || null, band: d,
    });
  });
  PD.drugs.forEach(function (d) {
    d.regimens.forEach(function (r) {
      (byName[d.name] = byName[d.name] || []).push({
        id: d.id + ':' + r.id, kind: 'pma', name: d.name, route: d.route,
        variant: r.label, pmaDrug: d, regimen: r,
      });
    });
  });
  // NICU 經驗性治療最常開的三種置頂；其餘收在可展開區。一下點到即加入。
  var COMMON = ['Ampicillin', 'Gentamicin', 'Cefotaxime (Claforan)'];
  var allNames = Object.keys(byName).sort();
  var commonNames = COMMON.filter(function (n) { return byName[n]; });

  function chip(name, big) {
    return '<button data-drug="' + esc(name) + '" class="btn rounded-lg border px-3 '
      + (big ? 'py-2.5 text-base font-bold border-cyan-300 bg-white text-cyan-800 hover:bg-cyan-50'
             : 'py-1.5 text-sm border-gray-300 bg-white text-gray-700 hover:bg-gray-100')
      + '">' + esc(name) + '</button>';
  }
  $('abxChips').innerHTML =
    (commonNames.length
      ? '<div class="text-sm font-bold text-gray-500">常用</div>'
        + '<div class="mt-2 flex flex-wrap gap-2">' + commonNames.map(function (n) { return chip(n, true); }).join('') + '</div>'
      : '')
    + '<details class="mt-3"><summary class="text-sm font-semibold text-gray-600 cursor-pointer select-none hover:text-gray-900 hover:underline">全部藥品（' + allNames.length + '）</summary>'
    + '<div class="mt-2 flex flex-wrap gap-2">' + allNames.map(function (n) { return chip(n, false); }).join('') + '</div>'
    + '</details>';

  $('abxChips').addEventListener('click', function (e) {
    var n = e.target && e.target.getAttribute && e.target.getAttribute('data-drug');
    if (n) addByName(n);
  });

  // 加入時採該藥的預設用法：Gentamicin 為 ODD，其餘為第一項
  function defaultItem(name) {
    var list = byName[name] || [];
    for (var i = 0; i < list.length; i++) if (list[i].variant === 'ODD') return list[i];
    return list[0];
  }

  // 已選入的藥；病人資料變動時整批重算
  var selected = [];
  var reviewInput = {};   // 各卡已輸入的覆核值，重算後保留

  function addByName(name) {
    var item = defaultItem(name);
    if (!item) return;
    var dup = selected.filter(function (it) { return it.id === item.id; }).length > 0;
    if (!dup) selected.push(item);
    renderAll();
  }
  function clearAll() { selected = []; reviewInput = {}; renderAll(); }
  $('abxClearBtn').addEventListener('click', clearAll);
  $('abxHasLevels').addEventListener('change', renderAll);
  P.onChange(renderAll);

  function renderAll() {
    var box = $('abxResult');
    if (!selected.length) { box.classList.add('hidden'); box.innerHTML = ''; }
    else { box.classList.remove('hidden'); box.innerHTML = selected.map(cardHtml).join(''); }
    renderFullTable();
  }

  // 完整劑量表：把所有選入的藥目前用的格子一併標出
  function renderFullTable() {
    var pt = P.read(), ew = P.effectiveWeight(pt), active = {};
    if (ew.g) {
      var sel = L.selectBand(ew.g, pt.ageDays);
      if (!sel.error) selected.forEach(function (it) {
        if (it.kind !== 'band') return;   // PMA 型的藥不在這張表裡
        var res = L.resolveDose(it.band, sel, { hasLevels: $('abxHasLevels').checked });
        if (res.ok || it.band.doses[sel.band] != null) active[it.band.id] = sel.band;
      });
    }
    $('abxFullTable').innerHTML = R.fullTableHtml(D, active, false);
  }

  function cardHtml(item, idx) {
    var drug = item.kind === 'band' ? item.band : item.pmaDrug;
    var pt = P.read();
    var ew = P.effectiveWeight(pt);
    // 適應症／給法在卡片上切換：先看到劑量，再決定要不要換
    var siblings = byName[item.name] || [];
    var variantHtml = siblings.length > 1
      ? '<select data-variant="' + idx + '" class="ml-2 rounded border-gray-300 py-0.5 pl-2 pr-7 text-sm text-gray-700 shadow-sm focus:border-cyan-500 focus:ring-cyan-500">'
        + siblings.map(function (sib, i) {
            return '<option value="' + i + '"' + (sib.id === item.id ? ' selected' : '') + '>' + esc(sib.variant || '標準') + '</option>';
          }).join('') + '</select>'
      : (item.variant ? ' <span class="text-gray-500">(' + esc(item.variant) + ')</span>' : '');
    var head = '<div class="flex items-start justify-between gap-2">'
      + '<div class="text-base"><span class="font-bold text-gray-900">' + esc(item.name) + '</span>'
      + variantHtml
      + (item.route ? ' <span class="text-sm text-gray-500">· ' + esc(item.route) + '</span>' : '') + '</div>'
      + '<button data-remove="' + idx + '" class="btn shrink-0 rounded px-2 py-1 text-sm text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="移除">✕</button>'
      + '</div>';

    var body;
    if (item.kind === 'pma') {
      body = pmaBody(item, idx, pt);
      return '<article class="mb-4 rounded-xl border border-gray-200 p-4">' + head + body + '</article>';
    }
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
        L.boundaryNotes(ew.g, pt.ageDays).reverse().forEach(function (n) { warns.unshift(n); });
        var warnHtml = warns.length ? '<div class="mt-2 space-y-1">' + warns.map(function (w) { return warnBox('amber', w); }).join('') + '</div>' : '';

        if (!res.ok) {
          body = meta + warnHtml + warnBox('red', res.reason)
            + (res.freeText || res.raw ? '<div class="mt-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">原文：' + esc(res.freeText || res.raw) + '</div>' : '')
            + R.stepsHtml(L.explain(drug, sel, res, ew, ew.g))
            + R.bandTableHtml(D.bands, drug.doses, sel.band, D.source)
            + R.guideHtml(ADMIN[drug.name]);
        } else {
          var pd = L.perDose(res, ew.g), dt = L.dailyTotal(res, ew.g);
          var daily = dt ? '<div class="mt-1 text-base text-cyan-700">' + (dt.averaged ? '平均每日' : '每日總量') + ' '
            + range(dt.min, dt.max) + ' ' + esc(res.unit) + '/day（' + range(dt.perKgMin, dt.perKgMax) + ' ' + esc(res.unit) + '/kg/day）</div>' : '';
          // 順序刻意如此：警示 → 答案 → 覆核 → 細節。
          // 會改變劑量決策的警示必須排在數字前面，不能讓人看完數字就走。
          body = meta + warnHtml
            + '<div class="mt-3 rounded-xl border-2 border-cyan-300 bg-cyan-50 p-4">'
            +   '<div class="text-sm font-bold uppercase tracking-wide text-cyan-600">每劑</div>'
            +   '<div class="text-3xl font-bold leading-tight text-cyan-900">' + range(pd.min, pd.max) + ' ' + esc(res.unit)
            +     ' <span class="text-2xl">' + esc(res.interval) + '</span></div>'
            +   daily
            + '</div>'
            + '<div class="mt-2 text-sm text-gray-500">本表建議 <b class="font-semibold text-gray-700">'
            +   range(res.min, res.max) + ' ' + esc(res.unit) + '/kg/dose ' + esc(res.interval)
            +   '</b>　原文「' + esc(res.raw) + '」</div>'
            + reviewHtml(idx, res, pd)
            + R.stepsHtml(L.explain(drug, sel, res, ew, ew.g))
            + R.bandTableHtml(D.bands, drug.doses, sel.band, D.source)
            + R.guideHtml(ADMIN[drug.name]);
        }
      }
    }
    return '<article class="mb-4 rounded-xl border border-gray-200 p-4">' + head + body + '</article>';
  }

  // PMA × 日齡型：用當下體重（未填退回出生體重），interval 依 PMA 判定
  function pmaBody(item, idx, pt) {
    var w = P.currentWeight(pt);
    var out = PL.compute(item.pmaDrug, item.regimen, w.g, pt.pmaWeeks, pt.ageDays);
    var meta = '<div class="mt-1 text-sm text-gray-500">'
      + (w.g ? '使用體重 <b class="text-gray-700">' + w.g + ' g</b>（' + esc(w.reason) + '）' : '')
      + (pt.pmaWeeks ? '　PMA <b class="text-gray-700">' + (Math.round(pt.pmaWeeks * 10) / 10) + ' 週</b>' : '')
      + '</div>';

    var warns = [item.pmaDrug.kind === 'pma' ? PD.pmaWordingNote : null]
      .concat(item.pmaDrug.cautions || [])
      .concat(out.ok && out.exceeded ? [out.exceeded] : [])
      .filter(Boolean);
    var warnHtml = warns.length ? '<div class="mt-2 space-y-1">'
      + warns.map(function (t) { return warnBox('amber', t); }).join('') + '</div>' : '';

    if (!out.ok) {
      return meta + warnHtml + warnBox('red', out.reason)
        + R.stepsHtml(PL.explain(out, w.g, pt.pmaWeeks)) + pmaGuide(item);
    }
    var pdose = out.perDose;
    var daily = out.single ? '' : '<div class="mt-1 text-base text-cyan-700">每日總量 '
      + range(out.perDay.min, out.perDay.max) + ' ' + esc(pdose.unit) + '/day（'
      + range(out.perKgPerDay.min, out.perKgPerDay.max) + ' ' + esc(pdose.unit) + '/kg/day）</div>';
    return meta + warnHtml
      + '<div class="mt-3 rounded-xl border-2 border-cyan-300 bg-cyan-50 p-4">'
      +   '<div class="text-sm font-bold uppercase tracking-wide text-cyan-600">每劑</div>'
      +   '<div class="text-3xl font-bold leading-tight text-cyan-900">' + range(pdose.min, pdose.max) + ' ' + esc(pdose.unit)
      +     ' <span class="text-2xl">' + (out.single ? '單次' : esc(out.interval)) + '</span></div>'
      +   daily
      + '</div>'
      + '<div class="mt-2 text-sm text-gray-500">依 <b class="font-semibold text-gray-700">' + esc(out.bandLabel) + '</b>'
      +   '　本表 ' + (item.regimen.basis === 'perDay'
            ? range(item.regimen.min, item.regimen.max) + ' ' + esc(pdose.unit) + '/kg/day'
            : range(item.regimen.min, item.regimen.max) + ' ' + esc(pdose.unit) + '/kg/dose') + '</div>'
      + pmaReviewHtml(idx, out)
      + R.stepsHtml(PL.explain(out, w.g, pt.pmaWeeks))
      + pmaGuide(item);
  }

  function pmaGuide(item) {
    var g = { notes: [], cautions: [] };
    if (item.pmaDrug.vial) g.notes.push(item.pmaDrug.vial);
    if (item.pmaDrug.route) g.notes.push('給藥途徑：' + item.pmaDrug.route);
    if (item.pmaDrug.maxConcentration) g.notes.push('最高濃度 ' + item.pmaDrug.maxConcentration.value + ' '
      + item.pmaDrug.maxConcentration.unit + (item.pmaDrug.maxConcentration.note ? '（' + item.pmaDrug.maxConcentration.note + '）' : ''));
    if (item.pmaDrug.maxPerDay) g.cautions.push('每日上限 ' + item.pmaDrug.maxPerDay.value + ' ' + item.pmaDrug.maxPerDay.unit + '/kg/day');
    (item.regimen.note ? [item.regimen.note] : []).forEach(function (n) { g.notes.push(n); });
    g.notes.push('資料出處：' + PD.source);
    return R.guideHtml(g);
  }

  function pmaReviewHtml(idx, out) {
    var saved = reviewInput[idx] || {};
    var opts = ['', 'q6h', 'q8h', 'q12h', 'q18h', 'q24h', 'q36h', 'q48h'].map(function (v) {
      var chosen = (saved.interval !== undefined ? saved.interval : out.interval) === v;
      return '<option value="' + v + '"' + (chosen ? ' selected' : '') + '>' + (v || '—') + '</option>';
    }).join('');
    var res = saved.verdict ? verdictHtml(saved.verdict) : '';
    return '<div class="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">'
      + '<div class="flex flex-wrap items-end gap-3">'
      +   '<div class="min-w-[140px] flex-1"><label class="compact-label">覆核：我打算開每劑</label>'
      +     '<input type="number" step="0.1" data-dose="' + idx + '" value="' + (saved.dose === undefined ? '' : saved.dose) + '" placeholder="' + esc(out.perDose.unit) + '" class="block w-full rounded border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 compact-input"></div>'
      +   '<div class="w-28"><label class="compact-label">Interval</label>'
      +     '<select data-interval="' + idx + '" class="block w-full rounded border-gray-300 shadow-sm focus:border-cyan-500 focus:ring-cyan-500 compact-input">' + opts + '</select></div>'
      +   '<button data-review="' + idx + '" class="btn h-11 whitespace-nowrap rounded-lg bg-slate-600 px-4 text-sm font-bold text-white hover:bg-slate-700">覆核</button>'
      + '</div>' + res + '</div>';
  }

  function warnBox(tone, text) {
    var cls = tone === 'red' ? 'bg-red-50 border-red-300 text-red-900' : 'bg-amber-50 border-amber-300 text-amber-900';
    return '<div class="rounded-lg border px-3 py-2 text-sm font-medium ' + cls + '">' + (tone === 'amber' ? '⚠ ' : '') + esc(text) + '</div>';
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
    return '<div class="mt-2 rounded-lg border px-3 py-2 ' + map[0] + '">'
      + '<div class="text-center text-base font-bold">' + map[1] + ' ' + map[2] + ' ' + dev + '</div>'
      + R.rangeBarHtml(v.perDose.min, v.perDose.max, v.ordered, v.perDose.unit)
      + '<div class="text-center text-sm opacity-80">本表每劑 ' + range(v.perDose.min, v.perDose.max) + ' ' + esc(v.perDose.unit)
      + (v.perDose.interval ? ' ' + esc(v.perDose.interval) : '') + '　你輸入 ' + fmt(v.ordered) + ' ' + esc(v.perDose.unit) + '</div>' + iv + '</div>';
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
      var pt = P.read(), item = selected[i], v;
      if (item.kind === 'pma') {
        var w = P.currentWeight(pt);
        var out = PL.compute(item.pmaDrug, item.regimen, w.g, pt.pmaWeeks, pt.ageDays);
        v = PL.reviewOrder(out, parseFloat(doseEl.value), ivEl.value);
      } else {
        var ew = P.effectiveWeight(pt);
        var sel = L.selectBand(ew.g, pt.ageDays);
        var res = L.resolveDose(item.band, sel, { hasLevels: $('abxHasLevels').checked });
        v = L.reviewOrder(res, ew.g, parseFloat(doseEl.value), ivEl.value);
      }
      reviewInput[i] = { dose: doseEl.value, interval: ivEl.value, verdict: v };
      renderAll();
    }
  });

  renderFullTable();

  // 卡片是重繪出來的，適應症切換同樣走事件委派
  $('abxResult').addEventListener('change', function (e) {
    var t = e.target;
    var vi = t && t.getAttribute && t.getAttribute('data-variant');
    if (vi === null || vi === undefined) return;
    var idx = parseInt(vi, 10);
    var list = byName[selected[idx].name] || [];
    var next = list[parseInt(t.value, 10) || 0];
    if (next) { selected[idx] = next; delete reviewInput[idx]; renderAll(); }
  });

  $('abxDataVersion').textContent = D.dataVersion;
  $('abxSource').textContent = D.source;
});
