
window.KenteiCalcExam=(()=>{
  const SESSION_KEY='kentei_calc_exam_v1';
  const RESULT_KEY='kentei_calc_exam_last_result';
  const $=id=>document.getElementById(id);
  const Q=()=>window.CALCULATION_QUESTIONS||[];
  const shuffle=items=>{
    const result=[...items];
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  };
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));

  let session=null;
  let current=null;
  let locked=false;
  let timerId=null;

  function save(){
    if(session)localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  }

  function load(){
    try{
      const raw=localStorage.getItem(SESSION_KEY);
      return raw?JSON.parse(raw):null;
    }catch{return null}
  }

  function clearSession(){
    localStorage.removeItem(SESSION_KEY);
    session=null;
    stopTimer();
  }

  function saveResult(result){
    localStorage.setItem(RESULT_KEY,JSON.stringify(result));
  }

  function getLastResult(){
    try{
      const raw=localStorage.getItem(RESULT_KEY);
      return raw?JSON.parse(raw):null;
    }catch{return null}
  }

  function topicLabel(value){
    return value==='all'?'全分野':value==='topicCustom'?'単元別指定':value;
  }

  function pool(topic){
    return topic==='all'?Q():Q().filter(q=>q.topic===topic);
  }

  function topicNames(){
    return [...new Set(Q().map(question=>question.topic))].sort((a,b)=>a.localeCompare(b,'ja'));
  }

  function renderTopicCountInputs(savedCounts=null){
    const grid=$('calcTopicCountGrid');
    if(!grid)return;
    const counts=savedCounts||{};
    grid.innerHTML=topicNames().map(topic=>{
      const max=Q().filter(question=>question.topic===topic).length;
      const value=Math.max(0,Math.min(max,Number(counts[topic])||0));
      return `
        <label class="topic-count-item">
          <span>${esc(topic)}<small>最大${max}問</small></span>
          <input class="topic-count-input" type="number" min="0" max="${max}" value="${value}" data-topic-count="${esc(topic)}">
        </label>
      `;
    }).join('');
    grid.querySelectorAll('.topic-count-input').forEach(input=>{
      input.addEventListener('input',updateTopicCountTotal);
    });
    updateTopicCountTotal();
  }

  function selectedTopicCounts(){
    const counts={};
    document.querySelectorAll('[data-topic-count]').forEach(input=>{
      const topic=input.dataset.topicCount;
      const max=Q().filter(question=>question.topic===topic).length;
      counts[topic]=Math.max(0,Math.min(max,Number(input.value)||0));
    });
    return counts;
  }

  function updateTopicCountTotal(){
    const total=Object.values(selectedTopicCounts()).reduce((sum,value)=>sum+value,0);
    if($('calcTopicCountTotal'))$('calcTopicCountTotal').textContent=total;
  }

  function buildTopicCustomOrder(topicCounts){
    const order=[];
    Object.entries(topicCounts||{}).forEach(([topic,count])=>{
      const ids=shuffle(pool(topic).map(question=>question.id)).slice(0,Math.max(0,Number(count)||0));
      order.push(...ids);
    });
    return shuffle(order);
  }

  function selectedCount(poolSize){
    const value=document.querySelector('input[name="calcExamCount"]:checked')?.value||'5';
    if(value==='all')return poolSize;
    if(value==='custom'){
      return Math.max(1,Math.min(100,Number($('customCalcExamCount')?.value)||1));
    }
    return Number(value);
  }

  function makeSession({count,topic,scoring,topicCounts=null,prediction=false}){
    if(topic==='topicCustom'){
      const order=buildTopicCustomOrder(topicCounts);
      return{
        topic,
        topicCounts,
        scoring,
        prediction,
        count:order.length,
        order,
        position:0,
        answers:[],
        correct:0,
        memos:{},
        startedAt:Date.now(),
        elapsedBeforeResume:0
      };
    }

    const p=pool(topic);
    const actual=Math.min(count,p.length);
    return{
      topic,
      topicCounts:null,
      scoring,
      prediction,
      count:actual,
      order:shuffle(p.map(q=>q.id)).slice(0,actual),
      position:0,
      answers:[],
      correct:0,
      memos:{},
      startedAt:Date.now(),
      elapsedBeforeResume:0
    };
  }

  function renderSetup(){
    const saved=load();
    const card=$('calcExamResumeCard');

    if(saved?.order?.length&&saved.position<saved.order.length){
      card.classList.remove('hidden');
      $('calcExamResumeDetail').textContent=
        `${topicLabel(saved.topic)}・${saved.order.length}問・${saved.position+1}問目から`;
    }else{
      card.classList.add('hidden');
    }

    renderTopicCountInputs(saved?.topicCounts||null);
    $('calcExamSetupStatus').textContent='';
  }

  function startNew(){
    const countMode=document.querySelector('input[name="calcExamCount"]:checked')?.value||'5';
    const scoring=document.querySelector('input[name="calcExamScoring"]:checked')?.value||'instant';
    const prediction=Boolean($('calcExamPrediction')?.checked);

    if(countMode==='topicCustom'){
      const topicCounts=selectedTopicCounts();
      const total=Object.values(topicCounts).reduce((sum,value)=>sum+value,0);
      if(total<1){
        $('calcExamSetupStatus').textContent='少なくとも1つの単元に1問以上入力してください。';
        return;
      }
      session=makeSession({count:total,topic:'topicCustom',scoring,topicCounts,prediction});
    }else{
      const topic=document.querySelector('input[name="calcExamTopic"]:checked')?.value||'all';
      const p=pool(topic);
      if(!p.length){
        $('calcExamSetupStatus').textContent='対象の計算問題がありません。';
        return;
      }
      const count=selectedCount(p.length);
      session=makeSession({count,topic,scoring,prediction});
    }

    save();
    KenteiRouter.show('calcExam');
    startTimer();
    showQuestion();
  }

  function resume(){
    session=load();
    if(!session)return;
    session.startedAt=Date.now();
    save();
    KenteiRouter.show('calcExam');
    startTimer();
    showQuestion();
  }

  function discard(){
    clearSession();
    renderSetup();
    if(typeof showToast==='function')showToast('前回の計算試験を削除しました');
  }

  function saveCurrentMemo(){
    if(!session||!current)return;
    session.memos=session.memos||{};
    session.memos[current.id]=$('calcExamMemo').value;
    save();
  }

  function showQuestion(){
    if(!session?.order?.length){
      KenteiRouter.show('calcExamSetup');
      return;
    }

    if(session.position>=session.order.length){
      finish();
      return;
    }

    locked=false;
    current=Q().find(q=>q.id===session.order[session.position]);
    if(!current){
      finish();
      return;
    }

    $('calcExamTopic').textContent=topicLabel(session.topic);
    $('calcExamProgress').textContent=`${session.position+1} / ${session.order.length}`;
    $('calcExamQuestionId').textContent=current.id;
    const seedInfo=$('calcExamQuestionSeed');
    if(current.seed){
      seedInfo.textContent=`Seed: ${current.seed}`;
      seedInfo.classList.remove('hidden');
    }else{
      seedInfo.textContent='';
      seedInfo.classList.add('hidden');
    }
    $('calcExamQuestion').textContent=KenteiPredictionEngine.calculationQuestion(current,{
      prediction:session.prediction,index:session.position
    });
    $('calcExamMemo').value=session.memos?.[current.id]||'';
    $('calcExamAnswerResult').className='answer-result hidden';
    $('calcExamAnswerResult').innerHTML='';
    $('calcExamNextButton').classList.add('hidden');
    $('calcExamNextButton').textContent=
      session.position===session.order.length-1?'結果を見る':'次の問題へ';

    $('calcExamChoiceArea').innerHTML='';
    $('calcExamChoiceArea').classList.toggle('sql-choice-area',current.topic==='SQL');
    shuffle(current.choices).forEach(choice=>{
      const button=document.createElement('button');
      button.className='quiz-choice';
      button.textContent=choice.label;
      button.addEventListener('click',()=>answer(choice,button));
      $('calcExamChoiceArea').appendChild(button);
    });

    updateStats();
    save();
  }

  function answer(choice,button){
    if(locked||!session||!current)return;
    locked=true;
    saveCurrentMemo();

    const ok=choice.label===current.answerLabel;
    session.answers.push({
      questionId:current.id,
      selectedLabel:choice.label,
      correct:ok
    });
    if(ok)session.correct++;
    save();
    updateStats();

    const isLast=session.answers.length>=session.order.length;

    if(session.scoring==='instant'){
      document.querySelectorAll('#calcExamChoiceArea .quiz-choice').forEach(b=>{
        b.disabled=true;
        if(b.textContent===current.answerLabel)b.classList.add('correct');
      });
      if(!ok)button.classList.add('wrong');

      const steps=current.steps.map(step=>`<li>${esc(step)}</li>`).join('');
      $('calcExamAnswerResult').className='answer-result '+(ok?'ok':'ng');
      $('calcExamAnswerResult').innerHTML=`
        <div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>
        ${ok?'':`正解：<b>${esc(current.answerLabel)}</b>`}
        <div class="calc-explanation-block">
          <div class="calc-explanation-label">公式</div>
          <div class="calc-formula">${esc(current.formula)}</div>
          <div class="calc-explanation-label">途中式</div>
          <ol class="calc-steps">${steps}</ol>
          <div class="calc-explanation-label">解説</div>
          <p>${esc(current.explanation)}</p>
        </div>
      `;
      $('calcExamNextButton').textContent=isLast?'結果を見る':'次の問題へ';
      $('calcExamNextButton').classList.remove('hidden');
      return;
    }

    if(isLast){
      finish();
    }else{
      session.position++;
      save();
      showQuestion();
    }
  }

  function next(){
    if(!session)return;
    saveCurrentMemo();

    if(session.answers.length>=session.order.length){
      finish();
      return;
    }

    session.position++;
    if(session.position>=session.order.length){
      finish();
      return;
    }

    save();
    showQuestion();
  }

  function elapsedMilliseconds(){
    if(!session)return 0;
    const currentRun=session.startedAt?Date.now()-session.startedAt:0;
    return Math.max(0,(session.elapsedBeforeResume||0)+currentRun);
  }

  function formatDuration(ms){
    const sec=Math.floor(ms/1000);
    const min=Math.floor(sec/60);
    return `${String(min).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
  }

  function startTimer(){
    stopTimer();
    updateTimer();
    timerId=setInterval(updateTimer,1000);
  }

  function stopTimer(){
    if(timerId){
      clearInterval(timerId);
      timerId=null;
    }
  }

  function updateTimer(){
    if($('calcExamElapsed')){
      $('calcExamElapsed').textContent=formatDuration(elapsedMilliseconds());
    }
  }

  function updateStats(){
    if(!session)return;
    const answered=session.answers.length;
    $('calcExamAnswered').textContent=answered;
    $('calcExamRemaining').textContent=Math.max(0,session.order.length-answered);
    $('calcExamCurrentRate').textContent=
      answered?((session.correct/answered)*100).toFixed(1)+'%':'0%';
    updateTimer();
  }

  function exit(){
    if(!session){
      KenteiRouter.show('exam');
      return;
    }

    saveCurrentMemo();
    session.elapsedBeforeResume=elapsedMilliseconds();
    session.startedAt=0;
    save();
    stopTimer();
    KenteiRouter.show('calcExamSetup');
    if(typeof showToast==='function')showToast('計算試験を保存しました');
  }

  function finish(){
    if(!session)return;

    saveCurrentMemo();
    const completed={
      ...session,
      position:session.order.length,
      elapsedMs:elapsedMilliseconds(),
      finishedAt:Date.now(),
      settings:{
        count:session.order.length,
        topic:session.topic,
        topicCounts:session.topicCounts||null,
        scoring:session.scoring,
        prediction:session.prediction
      }
    };

    saveResult(completed);
    clearSession();
    KenteiRouter.show('calcExamResult');
    showResult(completed);
  }

  function rankFor(rate){
    if(rate>=95)return'S';
    if(rate>=90)return'A';
    if(rate>=80)return'B';
    if(rate>=70)return'C';
    if(rate>=60)return'D';
    return'E';
  }

  function showResult(result){
    if(!result)return;

    const total=result.order?.length||0;
    const correct=result.correct||0;
    const wrong=Math.max(0,total-correct);
    const rate=total?(correct/total)*100:0;

    $('calcExamScore').textContent=`${Math.round(rate)}点`;
    $('calcExamRank').textContent=`ランク ${rankFor(rate)}`;
    $('calcExamSummary').textContent=`${total}問中 ${correct}問正解`;
    $('calcExamResultTime').textContent=`経過時間 ${formatDuration(result.elapsedMs||0)}`;
    $('calcExamCorrectCount').textContent=correct;
    $('calcExamWrongCount').textContent=wrong;
    $('calcExamRate').textContent=rate.toFixed(1)+'%';

    const wrongAnswers=(result.answers||[]).filter(a=>!a.correct);
    const list=$('calcExamWrongList');

    if(!wrongAnswers.length){
      list.innerHTML='<div class="empty-card">全問正解です！</div>';
      $('reviewCalcExamButton').classList.add('hidden');
    }else{
      $('reviewCalcExamButton').classList.remove('hidden');
      list.innerHTML=wrongAnswers.map(a=>{
        const q=Q().find(x=>x.id===a.questionId);
        return q?`
          <div class="exam-wrong-item">
            <strong>${esc(q.id)}・${esc(q.topic)}</strong>
            <span>${esc(q.question)}</span>
            <small>選んだ答え：${esc(a.selectedLabel)} / 正解：${esc(q.answerLabel)}</small>
          </div>
        `:'';
      }).join('');
    }
  }

  function retrySame(){
    const result=getLastResult();
    const settings=result?.settings;
    if(!settings)return;

    session=makeSession({
      count:settings.count,
      topic:settings.topic,
      topicCounts:settings.topicCounts||null,
      scoring:settings.scoring,
      prediction:settings.prediction||false
    });
    save();
    KenteiRouter.show('calcExam');
    startTimer();
    showQuestion();
  }

  function reviewWrong(){
    const result=getLastResult();
    if(!result)return;

    const ids=(result.answers||[]).filter(a=>!a.correct).map(a=>a.questionId);
    if(!ids.length)return;

    KenteiCalculation.start('all',{order:ids,position:0});
  }

  function init(){
    $('openCalcExamButton')?.addEventListener('click',()=>KenteiRouter.show('calcExamSetup'));
    $('startCalcExamButton')?.addEventListener('click',startNew);
    $('resumeCalcExamButton')?.addEventListener('click',resume);
    $('discardCalcExamButton')?.addEventListener('click',discard);
    $('calcExamNextButton')?.addEventListener('click',next);
    $('calcExamExitButton')?.addEventListener('click',exit);
    $('retryCalcExamButton')?.addEventListener('click',retrySame);
    $('reviewCalcExamButton')?.addEventListener('click',reviewWrong);
    $('backToExamFromCalcButton')?.addEventListener('click',()=>KenteiRouter.show('exam'));

    $('calcExamMemo')?.addEventListener('input',()=>{
      if(session&&current){
        session.memos=session.memos||{};
        session.memos[current.id]=$('calcExamMemo').value;
        save();
      }
    });

    document.querySelectorAll('input[name="calcExamCount"]').forEach(input=>{
      input.addEventListener('change',()=>{
        const mode=document.querySelector('input[name="calcExamCount"]:checked')?.value;
        $('customCalcExamCount')?.classList.toggle('hidden',mode!=='custom');
        $('calcTopicCountPanel')?.classList.toggle('hidden',mode!=='topicCustom');
        $('calcExamTopicRangeCard')?.classList.toggle('hidden',mode==='topicCustom');
        if(mode==='topicCustom'&&!$('calcTopicCountGrid')?.children.length){
          renderTopicCountInputs();
        }
      });
    });

    document.addEventListener('kentei:route',event=>{
      if(event.detail==='calcExamSetup')renderSetup();
      if(event.detail==='calcExamResult')showResult(getLastResult());
      if(event.detail!=='calcExam')stopTimer();
    });
  }

  return{init,startNew,resume,retrySame,showResult};
})();
