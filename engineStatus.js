window.KenteiEngineStatus=(()=>{
  const $=id=>document.getElementById(id);

  function render(){
    const box=$('seedEngineStatus');
    if(!box)return;
    const result=KenteiTemplateEngine.diagnostics();
    const choiceResult=window.KenteiWordChoice?.diagnostics();
    const seed=KenteiRandomEngine.createSeed();
    const sampleCode=KenteiProblemCode.create('CAL-DEMO',seed);
    const calculation=window.CALCULATION_VALIDATION;
    const quality=window.KENTEI_DATA_QUALITY_REPORT;
    const allValid=result.valid&&choiceResult?.valid&&calculation?.valid;
    box.className=`engine-status ${allValid?'ok':'ng'}`;
    box.innerHTML=`
      <strong>${allValid?'✅ 全エンジン・問題データ正常':'❌ エンジンまたは問題データにエラー'}</strong>
      <span>UI統一・単元別試験設定・逆ポーランド記法を含む全問題を検査しています。</span>
      <code>${sampleCode}</code>
    `;
  }

  function init(){
    $('regenerateSeedSampleButton')?.addEventListener('click',render);
    document.addEventListener('kentei:route',event=>{
      if(event.detail==='calculation')render();
    });
    render();
  }

  return{init,render};
})();
