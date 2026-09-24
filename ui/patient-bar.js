// 病人資料列：填完可收合成一行，把版面讓給結果。
document.addEventListener('DOMContentLoaded', function () {
  var $ = function (id) { return document.getElementById(id); };
  var P = window.Patient;
  var collapsed = false;

  function summary() {
    var p = P.read(), parts = [];
    if (p.birthG) parts.push(p.birthG + ' g');
    if (p.currentG) parts.push('當下 ' + p.currentG + ' g');
    if (p.ageDays !== null) parts.push('日齡 ' + p.ageDays + ' 天');
    if (p.gaWeeks) parts.push('GA ' + p.gaWeeks + ' 週');
    if (p.ccr) parts.push('CCr ' + p.ccr);
    return parts.length ? parts.join('・') : '尚未填寫';
  }
  function render() {
    $('pSummary').textContent = collapsed ? summary() : '';
    $('pFields').classList.toggle('hidden', collapsed);
    $('pToggle').textContent = collapsed ? '修改' : '收合';
  }
  $('pToggle').addEventListener('click', function () { collapsed = !collapsed; render(); });
  P.onChange(function () { if (collapsed) $('pSummary').textContent = summary(); });
  render();
});
