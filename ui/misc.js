// Surfactant / AOP / PDA 分頁的介面邏輯。
  // ───────── Surfactant / AOP / PDA 分頁 ─────────
  document.addEventListener('DOMContentLoaded', function () {
    var D = window.MISC_DATA, L = window.MiscLogic;
  var R = window.UiRender;
    var $ = function (id) { return document.getElementById(id); };
    var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); };
    var fmt = function (n) { return Math.round(n * 100) / 100; };
    var range = function (a, b) { return a === b ? fmt(a) : fmt(a) + '~' + fmt(b); };

    // 依分類分組填入下拉
    D.categories.forEach(function (cat) {
      var group = document.createElement('optgroup'); group.label = cat;
      D.drugs.filter(function (d) { return d.category === cat; }).forEach(function (d) {
        var o = document.createElement('option'); o.value = d.id; o.textContent = d.name;
        group.appendChild(o);
      });
      $('miscDrug').appendChild(group);
    });

    var lastRows = null;
    function currentDrug() {
      var id = $('miscDrug').value;
      return D.drugs.filter(function (d) { return d.id === id; })[0];
    }
    function hideResults() {
      $('miscResult').classList.add('hidden');
      $('miscReviewBox').classList.add('hidden');
      $('miscReviewResult').classList.add('hidden');
      lastRows = null;
    }

    function calc() {
      var drug = currentDrug();
      var mw = window.Patient.currentWeight(window.Patient.read());
      var w = mw.g;
      var out = L.compute(drug, w);
      var box = $('miscResult'); box.classList.remove('hidden');
      $('miscReviewBox').classList.add('hidden');
      $('miscReviewResult').classList.add('hidden');
      lastRows = null;

      if (!out.ok) {
        box.innerHTML = '<div class="text-sm rounded border px-3 py-2 bg-red-50 border-red-200 text-red-800">' + esc(out.reason) + '</div>';
        return;
      }

      var rowsHtml = out.rows.map(function (r) {
        var vol = r.volume
          ? '<div class="text-sm text-gray-500 mt-1">' + esc(r.volume.text) + ' <b>'
            + range(r.volume.value, r.volume.valueMax) + ' mL</b></div>'
          : '';
        return '<div class="flex gap-2 items-stretch">'
          + '<div class="flex-1 rounded-lg bg-gray-50 px-3 py-2.5">'
          +   '<div class="text-sm text-gray-500 font-bold mb-1">' + esc(r.label)
          +     (r.note ? ' <span class="font-normal text-gray-400">' + esc(r.note) + '</span>' : '') + '</div>'
          +   '<div class="text-base text-gray-800">' + esc(r.perKgText) + (r.interval ? ' ' + esc(r.interval) : '') + '</div>'
          +   vol
          + '</div>'
          + '<div class="flex-1 rounded-lg bg-cyan-50 px-3 py-2.5 flex flex-col justify-center">'
          +   '<div class="text-sm text-cyan-600 font-bold mb-1">每劑</div>'
          +   '<div class="text-xl font-bold text-cyan-800 leading-tight">' + range(r.min, r.max) + ' ' + esc(r.unit)
          +     (r.interval ? ' ' + esc(r.interval) : '') + '</div>'
          + '</div></div>'
          + orderUnitHtml(r);
      }).join('<div class="h-1"></div>');

      // 給藥指引與其他分頁統一收在可展開區塊；toxic level 屬警告性質
      // 劑型換算：mg 才是主要答案，vial 只是包裝上的提醒，
      // 因此放在答案框外、以中性樣式呈現，不與劑量數字搶。
      function orderUnitHtml(r) {
        var u = r.orderUnit;
        if (!u) return '';
        return '<div class="mt-2 border-l-2 border-gray-300 py-1 pl-3 text-sm text-gray-600">'
          + '劑型：' + (u.note ? esc(u.note) + '，' : '')
          + '此劑量約 <b class="font-semibold text-gray-800">' + range(u.min, u.max) + ' ' + esc(u.label) + '</b>'
          + '</div>';
      }

      var guide = { notes: [], cautions: [] };
      if (drug.timing) guide.notes.push('Timing：' + drug.timing);
      (drug.constraints || []).forEach(function (c) { guide.notes.push(c); });
      if (drug.levels) {
        guide.notes.push('有效血中濃度 ' + drug.levels.therapeutic);
        guide.cautions.push('Toxic level ' + drug.levels.toxic);
      }
      (drug.notes || []).forEach(function (n) { guide.notes.push(n); });
      var extraHtml = R.guideHtml(guide);

      box.innerHTML = '<div class="border-t border-gray-300 pt-2 mt-2">'
        + '<div class="text-sm text-gray-600 mb-1"><span class="font-bold text-gray-800">' + esc(drug.name) + '</span>'
        + '</div>'
        + '<div class="mt-1.5">' + R.routeBadgesHtml(window.RouteInfo.parse(drug.route)) + '</div>'
        + rowsHtml
        + R.stepsHtml(L.explain(drug, w))
        + extraHtml + '</div>';

      lastRows = out.rows;
      var sel = $('miscReviewRow'); sel.innerHTML = '';
      out.rows.forEach(function (r, i) {
        var o = document.createElement('option'); o.value = String(i);
        o.textContent = r.label + '（' + range(r.min, r.max) + ' ' + r.unit + '）';
        sel.appendChild(o);
      });
      $('miscReviewBox').classList.remove('hidden');
    }

    function review() {
      if (!lastRows) return;
      var row = lastRows[parseInt($('miscReviewRow').value, 10) || 0];
      var r = L.reviewOrder(row, parseFloat($('miscOrderedDose').value));
      var box = $('miscReviewResult'); box.classList.remove('hidden');
      if (r.verdict === 'n/a') {
        box.innerHTML = '<div class="text-sm rounded px-3 py-2 bg-gray-50 text-gray-700">' + esc(r.text) + '</div>';
        return;
      }
      var map = {
        match: ['bg-green-100 border-green-300 text-green-900', '✅', '符合本表建議'],
        high:  ['bg-red-100 border-red-300 text-red-900', '❌', '高於本表上限'],
        low:   ['bg-red-100 border-red-300 text-red-900', '❌', '低於本表下限'],
      }[r.verdict];
      var dev = r.deviation ? '（' + (r.deviation > 0 ? '+' : '') + Math.round(r.deviation) + '%）' : '';
      box.innerHTML = '<div class="rounded-lg px-3 py-2.5 ' + map[0] + '">'
        + '<div class="text-center text-base font-bold">' + map[1] + ' ' + map[2] + ' ' + dev + '</div>'
        + R.rangeBarHtml(r.row.min, r.row.max, r.ordered, r.row.unit)
        + '<div class="text-center text-sm opacity-80 mt-1">' + esc(r.row.label) + ' 本表每劑 ' + range(r.row.min, r.row.max)
        + ' ' + esc(r.row.unit) + '　你輸入 ' + fmt(r.ordered) + ' ' + esc(r.row.unit) + '</div></div>';
    }

    $('miscCalcBtn').addEventListener('click', calc);
    $('miscReviewBtn').addEventListener('click', review);
    $('miscDrug').addEventListener('change', hideResults);
    window.Patient.onChange(hideResults);
    $('miscDataVersion').textContent = D.dataVersion;
  });
