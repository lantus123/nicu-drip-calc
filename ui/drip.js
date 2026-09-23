// 點滴滴速 分頁的介面邏輯。
  document.addEventListener('DOMContentLoaded', function() {
    // --- 資料定義 ---
    const drugs = {
      Dopamine:               { unitDose: 6,    unit: 'mg',  totalVolume: 100, conversionFactor: 1,    range: [4, 20],       targetUnit: 'mcg/kg/min' },
      Dobutamine:             { unitDose: 6,    unit: 'mg',  totalVolume: 100, conversionFactor: 1,    range: [4, 20],       targetUnit: 'mcg/kg/min' },
      Nitroprusside:          { unitDose: 6,    unit: 'mg',  totalVolume: 100, conversionFactor: 1,    range: [0.5, 8],      targetUnit: 'mcg/kg/min' },
      Dormicum:               { unitDose: 6,    unit: 'mg',  totalVolume: 100, conversionFactor: 1,    range: [1, 10],       targetUnit: 'mcg/kg/min' },
      'Epinephrine (Bosmin)': { unitDose: 0.6,  unit: 'mg',  totalVolume: 100, conversionFactor: 0.1,  range: [0.02, 0.2],   targetUnit: 'mcg/kg/min' },
      'Norepinephrine (Levophed)': { unitDose: 0.6, unit: 'mg', totalVolume: 100, conversionFactor: 0.1, range: [0.02, 0.2], targetUnit: 'mcg/kg/min' },
      Isoproterenol:          { unitDose: 0.6,  unit: 'mg',  totalVolume: 100, conversionFactor: 0.1,  range: [0.1, 1],      targetUnit: 'mcg/kg/min' },
      Primacor:               { unitDose: 0.6,  unit: 'mg',  totalVolume: 100, conversionFactor: 0.1,  range: [0.25, 0.75],  targetUnit: 'mcg/kg/min' },
      NTG:                    { unitDose: 0.6,  unit: 'mg',  totalVolume: 100, conversionFactor: 0.1,  range: [0.5, 5],      targetUnit: 'mcg/kg/min' },
      PGE1:                   { unitDose: 6,    unit: 'mcg', totalVolume: 10,  conversionFactor: 0.01, range: [10, 100],     targetUnit: 'ng/kg/min' },
      'RI Pump':              { unitDose: 100,  unit: 'U',   totalVolume: 500, conversionFactor: 0.2,  range: [0.1, 0.6],    targetUnit: 'U/kg/hr'  }
    };

    const drugSelect = document.getElementById('drugSelect');
    const resultDiv = document.getElementById('result');
    const errorMessage = document.getElementById('error-message');
    const riInputContainer = document.getElementById('ri-input-container');
    const doseRangeNote = document.getElementById('dose-range-note');

    // 初始化
    for (const name in drugs) {
      const opt = document.createElement('option');
      opt.value = name;
      opt.textContent = name;
      drugSelect.appendChild(opt);
    }
    
    updateUiForSelectedDrug();

    document.getElementById('calculateBtn').addEventListener('click', calculate);
    drugSelect.addEventListener('change', updateUiForSelectedDrug);

    function updateUiForSelectedDrug() {
      const selectedDrugName = drugSelect.value;
      const drug = drugs[selectedDrugName];
      
      const unitLabel = drug.targetUnit.replace('mcg', 'ug'); 
      document.getElementById('targetDoseLabel').textContent = `目標 (${unitLabel})`;

      // 1. 更新建議劑量顯示
      doseRangeNote.textContent = `建議: ${drug.range[0]}~${drug.range[1]}`;

      if (selectedDrugName === 'RI Pump') {
        riInputContainer.classList.remove('hidden');
      } else {
        riInputContainer.classList.add('hidden');
      }
      resultDiv.style.display = 'none';
      errorMessage.style.display = 'none';
    }

    function formatValue(value, unit = "") {
      if (typeof value !== 'number' || isNaN(value)) return "N/A";
      if (value === 0) return "0" + (unit ? ` ${unit}` : "");
      let formattedValue;
      if (Math.abs(value) >= 100) formattedValue = value.toFixed(0);
      else if (Math.abs(value) >= 10) formattedValue = value.toFixed(1).replace(/\.0$/, "");
      else if (Math.abs(value) >= 1) formattedValue = value.toPrecision(3);
      else formattedValue = value.toPrecision(2);
      return parseFloat(formattedValue).toString() + (unit ? ` ${unit}` : "");
    }

    // 使用 fallback 方式複製，解決在 iframe/Google Site 中的權限問題
    function copyTextToClipboard(text, btn) {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                const originalText = btn.textContent;
                btn.textContent = 'OK';
                btn.classList.remove('bg-gray-600', 'hover:bg-gray-700');
                btn.classList.add('bg-green-600', 'hover:bg-green-700');
                setTimeout(() => { 
                    btn.textContent = originalText; 
                    btn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    btn.classList.add('bg-gray-600', 'hover:bg-gray-700');
                }, 1000);
            } else {
                throw new Error('Copy failed');
            }
        } catch (err) {
            console.error('Fallback copy failed', err);
            const originalText = btn.textContent;
            btn.textContent = 'X';
            btn.classList.add('bg-red-600');
            setTimeout(() => { 
                btn.textContent = originalText; 
                btn.classList.remove('bg-red-600');
            }, 1000);
        }
        
        document.body.removeChild(textArea);
    }

    function calculate() {
      const selectedDrugName = drugSelect.value;
      const drug = drugs[selectedDrugName];
      const weight = parseFloat(document.getElementById('weight').value);
      const inputTargetDose = parseFloat(document.getElementById('targetDose').value);
      const factor = parseFloat(document.getElementById('factor').value);
      const direction = document.getElementById('direction').value;
      
      if (!weight || weight <= 0 || isNaN(inputTargetDose) || inputTargetDose < 0 || isNaN(factor) || factor <=0) {
        errorMessage.textContent = '請檢查輸入數值。';
        errorMessage.style.display = 'block';
        resultDiv.style.display = 'none';
        return;
      }

      let sir = 0;
      if (selectedDrugName === 'RI Pump') {
          sir = parseFloat(document.getElementById('sir').value);
          if (isNaN(sir) || sir < 0) {
            errorMessage.textContent = '請輸入有效 SIR。';
            errorMessage.style.display = 'block';
            resultDiv.style.display = 'none';
            return;
          }
      }
      errorMessage.style.display = 'none';

      // 計算邏輯
      let doseForCalc = inputTargetDose;
      let rangeForCalc = [...drug.range];
      if (drug.targetUnit === 'ng/kg/min') {
          doseForCalc = inputTargetDose / 1000;
          rangeForCalc = drug.range.map(r => r / 1000);
      }
      const totalDose = drug.unitDose * weight;
      let volume, scaledConversion;
      if (direction === "concentrate") {
        volume = drug.totalVolume / factor;
        scaledConversion = drug.conversionFactor * factor;
      } else {
        volume = drug.totalVolume * factor;
        scaledConversion = drug.conversionFactor / factor;
      }
      const calculatedRate = doseForCalc / scaledConversion;
      const rangeMinRate = rangeForCalc[0] / scaledConversion;
      const rangeMaxRate = rangeForCalc[1] / scaledConversion;
      const doseInRange = inputTargetDose >= drug.range[0] && inputTargetDose <= drug.range[1];

      // 畫面與複製文字共用同一組字串，避免兩邊各自演化
      const isRiPump = selectedDrugName === 'RI Pump';
      const rateUnit = isRiPump ? 'ml/hr' : 'gtt/min';
      // targetUnit 為 ng/kg/min 的藥品內部以 mcg 計算，顯示時轉回 ng
      const displayConversion = scaledConversion * (drug.targetUnit === 'ng/kg/min' ? 1000 : 1);

      const order1 = isRiPump
        ? `${formatValue(totalDose, drug.unit)} RI in D10W ${formatValue(volume, "ml")}`
        : `${formatValue(totalDose, drug.unit)} ${selectedDrugName} in ${formatValue(volume, "mL")} NS/D10W`;
      const orderDetails = `1${rateUnit}=${formatValue(displayConversion, drug.targetUnit)}`;
      const rangeText = `Range:${formatValue(rangeMinRate, '')}~${formatValue(rangeMaxRate, rateUnit)}`;
      const order2 = `Run ${formatValue(calculatedRate, rateUnit)}`;

      const fullTextForCopy = `${order1}, ${orderDetails}, ${rangeText}${isRiPump ? '' : '，扣IV'}\n${isRiPump ? 'RI' : selectedDrugName} pump run ${formatValue(calculatedRate, rateUnit)}`;

      // 產生結果 HTML
      resultDiv.style.display = 'block';

      if (isRiPump) {
          const sirRiRatio = (sir * 0.06) / inputTargetDose;
          const ratioInRange = sirRiRatio >= 3 && sirRiRatio <= 5;

          resultDiv.innerHTML = renderResult(order1, orderDetails, order2, inputTargetDose, doseInRange, drug.targetUnit, ratioInRange, sirRiRatio, 'SIR/RI');
      } else {
          resultDiv.innerHTML = renderResult(order1, orderDetails, order2, inputTargetDose, doseInRange, drug.targetUnit);
      }

      // 綁定複製按鈕
      const copyBtn = document.getElementById('copyBtn');
      if(copyBtn) {
          copyBtn.setAttribute('data-text', fullTextForCopy);
          copyBtn.onclick = function() {
              copyTextToClipboard(this.getAttribute('data-text'), this);
          };
      }
    }

    function renderResult(o1, oDetails, o2, dose, safe, unit, ratioSafe=null, ratio=null, ratioLabel='') {
      // 2. 優化範圍檢查顯示：使用強烈的紅/綠對比與明確文字
      const statusClass = safe 
          ? 'bg-green-100 border-green-300 text-green-900' 
          : 'bg-red-100 border-red-300 text-red-900';
      const statusIcon = safe ? '✅' : '❌';
      const statusText = safe ? '範圍內' : '超出範圍';
      
      // 顯示單位，將 mcg 縮寫為 ug 以節省空間
      const displayUnit = unit ? unit.replace('mcg', 'ug') : '';

      let ratioHtml = '';
      if (ratio !== null) {
          const rClass = ratioSafe 
              ? 'bg-green-100 border-green-300 text-green-900' 
              : 'bg-red-100 border-red-300 text-red-900';
          const rIcon = ratioSafe ? '✅' : '❌';
          ratioHtml = `
          <div class="flex-1 flex flex-col items-center justify-center px-1 rounded border ${rClass} text-center leading-none py-1">
              <span class="text-[10px] opacity-80 mb-0.5">${ratioLabel}</span>
              <span class="text-xs font-bold">${formatValue(ratio, '')} ${rIcon}</span>
          </div>`;
      }

      return `
        <div class="border-t border-gray-300 pt-2 mt-2">
          <div class="flex gap-2 mb-2">
              <div class="flex-1 bg-gray-50 border border-gray-200 rounded p-1.5">
                  <div class="text-xs text-gray-500 font-bold mb-0.5">配藥</div>
                  <div class="text-sm font-medium leading-tight text-gray-800">${o1}</div>
                  <div class="text-xs text-gray-400 mt-0.5">${oDetails}</div>
              </div>
              <div class="flex-1 bg-cyan-50 border border-cyan-200 rounded p-1.5 flex flex-col justify-center">
                  <div class="text-xs text-cyan-600 font-bold mb-0.5">執行</div>
                  <div class="text-base font-bold text-cyan-800 leading-tight">${o2}</div>
              </div>
          </div>

          <div class="flex items-stretch gap-2 h-9">
              <button id="copyBtn" class="bg-gray-600 text-white text-xs font-bold px-3 rounded hover:bg-gray-700 transition-colors shrink-0">
                  複製
              </button>
              
              <div class="flex-1 flex flex-col items-center justify-center px-1 rounded border ${statusClass} text-center leading-none py-1">
                  <span class="text-[10px] opacity-80 mb-0.5">劑量: ${formatValue(dose, displayUnit)}</span>
                  <span class="text-xs font-bold">${statusIcon} ${statusText}</span>
              </div>

              ${ratioHtml}
          </div>
        </div>
      `;
    }

  });
