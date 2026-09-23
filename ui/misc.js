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
      var w = parseFloat($('miscWeight').value);
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
          + '<div class="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-3">'
          +   '<div class="text-sm text-gray-500 font-bold mb-1">' + esc(r.label)
          +     (r.note ? ' <span class="font-normal text-gray-400">' + esc(r.note) + '</span>' : '') + '</div>'
          +   '<div class="text-base text-gray-800">' + esc(r.perKgText) + (r.interval ? ' ' + esc(r.interval) : '') + '</div>'
          +   vol
          + '</div>'
          + '<div class="flex-1 bg-cyan-50 border border-cyan-200 rounded-lg p-3 flex flex-col justify-center">'
          +   '<div class="text-sm text-cyan-600 font-bold mb-1">每劑</div>'
          +   '<div class="text-xl font-bold text-cyan-800 leading-tight">' + range(r.min, r.max) + ' ' + esc(r.unit)
          +     (r.interval ? ' ' + esc(r.interval) : '') + '</div>'
          + '</div></div>';
      }).join('<div class="h-1"></div>');

      var extra = [];
      if (drug.timing) extra.push('Timing：' + drug.timing);
      (drug.constraints || []).forEach(function (c) { extra.push(c); });
      if (drug.levels) extra.push('有效血中濃度 ' + drug.levels.therapeutic + '　Toxic ' + drug.levels.toxic);
      (drug.notes || []).forEach(function (n) { extra.push(n); });
      var extraHtml = extra.length
        ? '<div class="mt-1 space-y-0.5">' + extra.map(function (t) {
            return '<div class="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded px-3 py-1.5">' + esc(t) + '</div>';
          }).join('') + '</div>' : '';

      box.innerHTML = '<div class="border-t border-gray-300 pt-2 mt-2">'
        + '<div class="text-sm text-gray-600 mb-1"><span class="font-bold text-gray-800">' + esc(drug.name) + '</span>'
        + (drug.route ? ' · ' + esc(drug.route) : '') + '</div>'
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
        box.innerHTML = '<div class="text-sm rounded border px-3 py-2 bg-gray-50 border-gray-200 text-gray-700">' + esc(r.text) + '</div>';
        return;
      }
      var map = {
        match: ['bg-green-100 border-green-300 text-green-900', '✅', '符合本表建議'],
        high:  ['bg-red-100 border-red-300 text-red-900', '❌', '高於本表上限'],
        low:   ['bg-red-100 border-red-300 text-red-900', '❌', '低於本表下限'],
      }[r.verdict];
      var dev = r.deviation ? '（' + (r.deviation > 0 ? '+' : '') + Math.round(r.deviation) + '%）' : '';
      box.innerHTML = '<div class="rounded border px-3 py-2.5 text-center ' + map[0] + '">'
        + '<div class="text-base font-bold">' + map[1] + ' ' + map[2] + ' ' + dev + '</div>'
        + '<div class="text-sm opacity-80 mt-1">' + esc(r.row.label) + ' 本表每劑 ' + range(r.row.min, r.row.max)
        + ' ' + esc(r.row.unit) + '　你輸入 ' + fmt(r.ordered) + ' ' + esc(r.row.unit) + '</div></div>';
    }

    $('miscCalcBtn').addEventListener('click', calc);
    $('miscReviewBtn').addEventListener('click', review);
    $('miscDrug').addEventListener('change', hideResults);
    $('miscWeight').addEventListener('change', hideResults);
    $('miscDataVersion').textContent = D.dataVersion;
  });
