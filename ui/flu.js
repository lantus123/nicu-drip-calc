// Fluconazole 分頁的介面邏輯。
  // ───────── Fluconazole 分頁 ─────────
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.FLU_DATA, L = window.FluLogic;
  var R = window.UiRender;
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
    var fmt = function (n) { return Math.round(n * 100) / 100; };
    var range = function (a, b) { return a === b ? fmt(a) : fmt(a) + '~' + fmt(b); };

    D.indications.forEach(function (ind) {
      var o = document.createElement('option'); o.value = ind.id; o.textContent = ind.name;
      $('fluIndication').appendChild(o);
    });

    var lastRows = null;
    function hideResults() {
      $('fluResult').classList.add('hidden');
      $('fluReviewBox').classList.add('hidden');
      $('fluReviewResult').classList.add('hidden');
      lastRows = null;
    }
    // 不同用途需要的欄位不同
    function syncFields() {
      var m = $('fluMode').value;
      $('fluIndicationWrap').classList.toggle('hidden', m !== 'indication');
      hideResults();
    }
    $('fluMode').addEventListener('change', syncFields);
    $('fluIndication').addEventListener('change', hideResults);
    window.Patient.onChange(hideResults);
    syncFields();

    function calc() {
      var pt = window.Patient.read();
      var fw = window.Patient.currentWeight(pt);
      var w = fw.g, ccr = pt.ccr || 0;
      var m = $('fluMode').value, out;
      if (m === 'treatment') out = L.computeTreatment(D, w, pt.gaWeeks, pt.ageDays, ccr);
      else if (m === 'prophylaxis') out = L.computeProphylaxis(D, w, ccr);
      else out = L.computeIndication(D, w, $('fluIndication').value, ccr);

      var box = $('fluResult'); box.classList.remove('hidden');
      $('fluReviewBox').classList.add('hidden');
      $('fluReviewResult').classList.add('hidden');
      lastRows = null;

      if (!out.ok) {
        box.innerHTML = '<div class="text-sm rounded border px-3 py-2 bg-red-50 border-red-200 text-red-800">' + esc(out.reason) + '</div>';
        return;
      }

      var rowsHtml = out.rows.map(function (r) {
        var perKg = range(r.perKg.min, r.perKg.max) + ' mg/kg/dose';
        var rounded = r.amount.rounded
          ? '<div class="text-sm text-gray-500 mt-1">無條件進位後 <b>' + range(r.amount.rounded.min, r.amount.rounded.max) + ' mg</b></div>' : '';
        var inf = r.infusion
          ? '<div class="text-sm text-gray-500 mt-1">以 ' + D.administration.maxConcentration + ' mg/mL 稀釋約 <b>'
            + fmt(r.infusion.volumeMl) + ' mL</b>，至少輸注 <b>' + fmt(r.infusion.minHours) + ' 小時</b>（' + esc(r.infusion.limitedBy) + '）</div>' : '';
        return '<div class="flex gap-2 items-stretch">'
          + '<div class="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">'
          +   '<div class="text-sm text-gray-500 font-bold mb-1">' + esc(r.label)
          +     (r.note ? ' <span class="font-normal text-gray-400">' + esc(r.note) + '</span>' : '') + '</div>'
          +   '<div class="text-base text-gray-800">' + perKg + (r.interval ? ' ' + esc(r.interval) : '') + '</div>'
          +   rounded + inf
          + '</div>'
          + '<div class="flex-1 bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex flex-col justify-center">'
          +   '<div class="text-sm text-cyan-600 font-bold mb-1">每劑</div>'
          +   '<div class="text-xl font-bold text-cyan-800 leading-tight">' + range(r.amount.min, r.amount.max) + ' mg'
          +     (r.interval ? ' ' + esc(r.interval) : '') + '</div>'
          + '</div></div>';
      }).join('<div class="h-1"></div>');

      // 給藥指引（可展開）：怎麼給
      var guide = { notes: [], cautions: [] };
      if (out.frequency) guide.notes.push('給藥頻次：' + out.frequency + '，IVD ' + out.infusionMinutes + ' 分鐘');
      if (out.duration) guide.notes.push('Minimum duration of therapy：' + out.duration);
      if (out.mode === 'indication') guide.notes.push(D.neonateUnder14d);
      (D.administration.notes || []).forEach(function (n) { guide.notes.push(n); });
      (D.administration.cautions || []).forEach(function (c) { guide.cautions.push(c); });

      // 警示（常駐）：來源本身的缺陷與會影響劑量的判讀，不可收合
      // interval 依據與進位那一步已在計算過程中呈現，不在此重複
      // 來源本身的缺陷維持警示；GA 的判讀屬說明，改為灰色註記
      var interpret = out.gaWordingNote
        ? '<div class="mt-2 text-sm text-gray-500">判讀：' + esc(out.gaWordingNote) + '</div>' : '';
      var notes = [];
      if (out.spanned) notes.push('原表此列 Day 1 與 Daily therapy 為合併儲存格，兩者同劑量');
      if (out.incomplete) notes.push('原表此列缺 Daily therapy 與 duration，僅能提供 Day 1');
      if (out.renalNote) notes.push(out.renalNote);

      box.innerHTML = '<div class="border-t border-gray-300 pt-2 mt-2">'
        + '<div class="text-sm text-gray-600 mb-1"><span class="font-bold text-gray-800">' + esc(D.drug) + '</span>'
        + (out.indication ? ' · ' + esc(out.indication.name) : '') + '</div>'
        + rowsHtml
        + interpret
        + R.stepsHtml(L.explain(D, out, w))
        + R.guideHtml(guide)
        + '<div class="mt-3 space-y-1">' + notes.map(function (t) {
            return '<div class="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">' + esc(t) + '</div>';
          }).join('') + '</div>'
        + '</div>';

      lastRows = out.rows;
      var sel = $('fluReviewRow'); sel.innerHTML = '';
      out.rows.forEach(function (r, i) {
        var o = document.createElement('option'); o.value = String(i);
        o.textContent = r.label + '（' + range(r.amount.min, r.amount.max) + ' mg）';
        sel.appendChild(o);
      });
      $('fluReviewBox').classList.remove('hidden');
    }

    function review() {
      if (!lastRows) return;
      var row = lastRows[parseInt($('fluReviewRow').value, 10) || 0];
      var r = L.reviewOrder(row, parseFloat($('fluOrderedDose').value));
      var box = $('fluReviewResult'); box.classList.remove('hidden');
      if (r.verdict === 'n/a') {
        box.innerHTML = '<div class="text-sm rounded border px-3 py-2 bg-gray-50 border-gray-200 text-gray-700">' + esc(r.text) + '</div>';
        return;
      }
      var map = {
        match: ['bg-green-100 border-green-300 text-green-900', '✅', '符合本表建議'],
        high:  ['bg-red-100 border-red-300 text-red-900', '❌', '高於本表上限'],
        low:   ['bg-red-100 border-red-300 text-red-900', '❌', '低於本表下限'],
      }[r.verdict];
      var dev = r.deviation ? '（' + (r.deviation > 0 ? '+' : '') + Math.round(r.deviation) + '%）' : '';
      box.innerHTML = '<div class="rounded-lg border px-3 py-2.5 ' + map[0] + '">'
        + '<div class="text-center text-base font-bold">' + map[1] + ' ' + map[2] + ' ' + dev + '</div>'
        + R.rangeBarHtml(r.row.amount.min, r.row.amount.max, r.ordered, 'mg')
        + '<div class="text-center text-sm opacity-80 mt-1">' + esc(r.row.label) + ' 本表每劑 ' + range(r.row.amount.min, r.row.amount.max)
        + ' mg　你輸入 ' + fmt(r.ordered) + ' mg</div></div>';
    }

    $('fluCalcBtn').addEventListener('click', calc);
    $('fluReviewBtn').addEventListener('click', review);
    $('fluDataVersion').textContent = D.dataVersion;
  });
