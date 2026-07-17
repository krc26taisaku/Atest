window.KenteiExam=(()=>{
  const SESSION_KEY='kentei_word_exam_v2';
  const RESULT_KEY='kentei_word_exam_last_result_v2';
  const $=id=>document.getElementById(id);
  const Q=()=>window.WORD_QUESTIONS||[];
  const shuffle=items=>{
    const result=[...items];
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  };
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));

  let session=null,current=null,choices=[],locked=false,timerId=null,currentDirection='meaningToWord',currentAnswerMode='choice';

  const save=()=>session&&localStorage.setItem(SESSION_KEY,JSON.stringify(session));
  function load(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
  function clearSession(){localStorage.removeItem(SESSION_KEY);session=null;stopTimer()}
  const saveResult=result=>localStorage.setItem(RESULT_KEY,JSON.stringify(result));
  function getLastResult(){try{return JSON.parse(localStorage.getItem(RESULT_KEY)||'null')}catch{return null}}

  function labelCategory(value){return value==='all'?'全分野':String(value).replace('系','')}
  function setupPool(category){return category==='all'?Q():Q().filter(q=>q.category===category)}
  function currentCount(){
    const value=document.querySelector('input[name="examCount"]:checked')?.value||'10';
    return value==='custom'?Math.max(1,Math.min(200,Number($('customExamCount')?.value)||1)):Number(value);
  }

  function renderSetup(){
    const saved=load(),card=$('wordExamResumeCard');
    if(saved?.order?.length&&saved.position<saved.order.length){
      card.classList.remove('hidden');
      $('wordExamResumeDetail').textContent=`${labelCategory(saved.category)}・${saved.order.length}問・${saved.position+1}問目から`;
    }else card.classList.add('hidden');
    $('wordExamSetupStatus').textContent='';
  }

  function makeSession(settings){
    const pool=setupPool(settings.category),actual=Math.min(settings.count,pool.length);
    return{
      ...settings,count:actual,
      order:shuffle(pool.map(q=>q.id)).slice(0,actual),
      position:0,answers:[],correct:0,
      startedAt:Date.now(),elapsedBeforeResume:0
    };
  }

  function startNew(){
    const settings={
      count:currentCount(),
      category:document.querySelector('input[name="examCategory"]:checked')?.value||'all',
      scoring:document.querySelector('input[name="examScoring"]:checked')?.value||'instant',
      direction:document.querySelector('input[name="examDirection"]:checked')?.value||'meaningToWord',
      answerMode:document.querySelector('input[name="examAnswerMode"]:checked')?.value||'choice',
      prediction:Boolean($('wordExamPrediction')?.checked)
    };
    if(!setupPool(settings.category).length){
      $('wordExamSetupStatus').textContent='対象の問題がありません。';return;
    }
    session=makeSession(settings);save();
    KenteiRouter.show('wordExam');startTimer();showQuestion();
  }

  function resume(){
    session=load();if(!session)return;
    session.startedAt=Date.now();save();
    KenteiRouter.show('wordExam');startTimer();showQuestion();
  }

  function discard(){clearSession();renderSetup();if(typeof showToast==='function')showToast('前回の試験を削除しました')}
  function getCurrentQuestion(){return Q().find(q=>q.id===session?.order?.[session.position])}

  function directionFor(){
    return KenteiPredictionEngine.chooseMixed(session.direction,session.position,current.id);
  }
  function answerModeFor(){
    return KenteiPredictionEngine.chooseAnswerMode(session.answerMode,session.position,current.id);
  }
  function correctText(){return currentDirection==='wordToMeaning'?current.meaning:(current.displayWord||current.word)}
  function displayText(item){return currentDirection==='wordToMeaning'?item.meaning:(item.displayWord||item.word)}

  function showQuestion(){
    if(!session?.order?.length){KenteiRouter.show('wordExamSetup');return}
    if(session.position>=session.order.length){finish();return}
    locked=false;current=getCurrentQuestion();if(!current){finish();return}

    currentDirection=directionFor();
    currentAnswerMode=answerModeFor();

    $('wordExamCategory').textContent=`${labelCategory(session.category)}・${currentAnswerMode==='input'?'入力':'四択'}`;
    $('wordExamProgress').textContent=`${session.position+1} / ${session.order.length}`;
    $('wordExamQuestion').textContent=KenteiPredictionEngine.wordQuestion(current,{
      direction:currentDirection,prediction:session.prediction,index:session.position
    });
    $('wordExamAnswerResult').className='answer-result hidden';
    $('wordExamAnswerResult').innerHTML='';
    $('wordExamNextButton').classList.add('hidden');
    $('wordExamNextButton').textContent=session.position===session.order.length-1?'結果を見る':'次の問題へ';

    choices=KenteiWordChoice
      ?KenteiWordChoice.choices(current,4)
      :shuffle([current,...shuffle(Q().filter(q=>q.category===current.category&&q.id!==current.id)).slice(0,3)]);

    $('wordExamChoiceArea').innerHTML='';
    $('wordExamInputArea').classList.toggle('hidden',currentAnswerMode!=='input');

    if(currentAnswerMode==='choice'){
      choices.forEach(item=>{
        const button=document.createElement('button');
        button.className='quiz-choice';
        button.textContent=displayText(item);
        button.addEventListener('click',()=>answerChoice(item,button));
        $('wordExamChoiceArea').appendChild(button);
      });
    }else{
      $('wordExamAnswerInput').value='';
      $('wordExamAnswerInput').disabled=false;
      $('submitWordExamAnswerButton').disabled=false;
      $('wordExamAnswerInput').placeholder=currentDirection==='wordToMeaning'?'説明を入力':'単語を入力';
      setTimeout(()=>$('wordExamAnswerInput')?.focus(),50);
    }
    updateStats();save();
  }

  function pushAnswer(data,ok){
    session.answers.push({
      questionId:current.id,direction:currentDirection,answerMode:currentAnswerMode,
      correct:ok,...data
    });
    if(ok)session.correct++;
    KenteiWord.record(current,ok);
    save();updateStats();
  }

  function answerChoice(item,button){
    if(locked)return;locked=true;
    const ok=item.id===current.id;
    pushAnswer({selectedId:item.id,selectedLabel:displayText(item)},ok);
    processAfterAnswer(ok,button,item.id);
  }

  function answerInput(){
    if(locked)return;
    const entered=$('wordExamAnswerInput').value.trim();
    if(!entered){$('wordExamAnswerInput').focus();return}
    locked=true;
    const type=currentDirection==='wordToMeaning'?'meaning':'word';
    const rawAnswer=currentDirection==='wordToMeaning'?current.meaning:current.word;
    const ok=currentDirection==='wordToMeaning'
      ?KenteiPredictionEngine.isCorrectInput(entered,rawAnswer,type)
      :(window.KenteiAbbreviation?.matchesInput(entered,current)||
        KenteiPredictionEngine.isCorrectInput(entered,rawAnswer,type));
    pushAnswer({entered,selectedLabel:entered},ok);
    $('wordExamAnswerInput').disabled=true;
    $('submitWordExamAnswerButton').disabled=true;
    processAfterAnswer(ok,null,null);
  }

  function processAfterAnswer(ok,button,selectedId){
    const isLast=session.answers.length>=session.order.length;
    if(session.scoring==='instant'){
      if(currentAnswerMode==='choice'){
        document.querySelectorAll('#wordExamChoiceArea .quiz-choice').forEach((element,index)=>{
          element.disabled=true;
          if(choices[index]?.id===current.id)element.classList.add('correct');
        });
        if(!ok&&button)button.classList.add('wrong');
      }

      const explanation=choices.map(item=>`
        <div class="explanation-item ${item.id===current.id?'correct':''} ${selectedId&&item.id===selectedId&&selectedId!==current.id?'selected':''}">
          <div class="explanation-word">${esc(item.displayWord||item.word)} ${item.id===current.id?'⭕':''}</div>
          ${item.abbreviationDetails?`<div class="abbreviation-details">${esc(item.abbreviationDetails)}</div>`:''}
          <div class="explanation-meaning">${esc(item.meaning)}</div>
        </div>`).join('');

      $('wordExamAnswerResult').className='answer-result '+(ok?'ok':'ng');
      $('wordExamAnswerResult').innerHTML=`
        <div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>
        ${ok?'':`正解：<b>${esc(correctText())}</b>`}
        <div class="explanation-list">${explanation}</div>`;
      $('wordExamNextButton').textContent=isLast?'結果を見る':'次の問題へ';
      $('wordExamNextButton').classList.remove('hidden');
    }else if(isLast)finish();
    else{session.position++;save();showQuestion()}
  }

  function next(){
    if(!session)return;
    if(session.answers.length>=session.order.length){finish();return}
    session.position++;
    if(session.position>=session.order.length){finish();return}
    save();showQuestion();
  }

  function elapsedMilliseconds(){
    return session?Math.max(0,(session.elapsedBeforeResume||0)+(session.startedAt?Date.now()-session.startedAt:0)):0;
  }
  function formatDuration(ms){
    const seconds=Math.floor(ms/1000),minutes=Math.floor(seconds/60);
    return `${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  }
  function startTimer(){stopTimer();updateTimer();timerId=setInterval(updateTimer,1000)}
  function stopTimer(){if(timerId){clearInterval(timerId);timerId=null}}
  function updateTimer(){if($('wordExamElapsed'))$('wordExamElapsed').textContent=formatDuration(elapsedMilliseconds())}
  function updateStats(){
    if(!session)return;
    const answered=session.answers.length;
    $('wordExamAnswered').textContent=answered;
    $('wordExamRemaining').textContent=Math.max(0,session.order.length-answered);
    $('wordExamCurrentRate').textContent=answered?((session.correct/answered)*100).toFixed(1)+'%':'0%';
    updateTimer();
  }

  function exit(){
    if(!session){KenteiRouter.show('exam');return}
    session.elapsedBeforeResume=elapsedMilliseconds();session.startedAt=0;save();stopTimer();
    KenteiRouter.show('wordExamSetup');
    if(typeof showToast==='function')showToast('試験を保存しました');
  }

  function finish(){
    if(!session)return;
    const completed={...session,position:session.order.length,elapsedMs:elapsedMilliseconds(),finishedAt:Date.now(),
      settings:{
        count:session.order.length,category:session.category,scoring:session.scoring,
        direction:session.direction,answerMode:session.answerMode,prediction:session.prediction
      }};
    saveResult(completed);clearSession();KenteiRouter.show('wordExamResult');showResult(completed);
  }

  function rankFor(rate){if(rate>=95)return'S';if(rate>=90)return'A';if(rate>=80)return'B';if(rate>=70)return'C';if(rate>=60)return'D';return'E'}

  function showResult(result){
    if(!result)return;
    const total=result.order?.length||0,correct=Number(result.correct)||0,rate=total?(correct/total)*100:0;
    $('wordExamScore').textContent=`${Math.round(rate)}点`;
    $('wordExamRank').textContent=`ランク ${rankFor(rate)}`;
    $('wordExamSummary').textContent=`${total}問中 ${correct}問正解`;
    $('wordExamResultTime').textContent=`経過時間 ${formatDuration(result.elapsedMs||0)}`;
    $('wordExamCorrectCount').textContent=correct;
    $('wordExamWrongCount').textContent=Math.max(0,total-correct);
    $('wordExamRate').textContent=rate.toFixed(1)+'%';

    const wrongAnswers=(result.answers||[]).filter(answer=>!answer.correct),list=$('wordExamWrongList');
    if(!wrongAnswers.length){
      list.innerHTML='<div class="empty-card">全問正解です！</div>';
      $('reviewWordExamButton').classList.add('hidden');
    }else{
      $('reviewWordExamButton').classList.remove('hidden');
      list.innerHTML=wrongAnswers.map(answer=>{
        const question=Q().find(item=>item.id===answer.questionId);
        if(!question)return'';
        const correct=answer.direction==='wordToMeaning'?question.meaning:question.word;
        return `<div class="exam-wrong-item">
          <strong>${esc(question.displayWord||question.word)}</strong>
          <span>${esc(question.meaning)}</span>
          <small>回答：${esc(answer.selectedLabel||answer.entered||'未回答')} / 正解：${esc(correct)}</small>
        </div>`;
      }).join('');
    }
  }

  function reviewWrong(){
    const result=getLastResult();if(!result)return;
    const ids=(result.answers||[]).filter(answer=>!answer.correct).map(answer=>answer.questionId);
    if(ids.length)KenteiQuiz.start('all',{order:ids,position:0});
  }

  function retrySame(){
    const settings=getLastResult()?.settings;if(!settings)return;
    session=makeSession(settings);save();
    KenteiRouter.show('wordExam');startTimer();showQuestion();
  }

  function init(){
    $('openWordExamButton')?.addEventListener('click',()=>KenteiRouter.show('wordExamSetup'));
    $('startWordExamButton')?.addEventListener('click',startNew);
    $('resumeWordExamButton')?.addEventListener('click',resume);
    $('discardWordExamButton')?.addEventListener('click',discard);
    $('wordExamNextButton')?.addEventListener('click',next);
    $('wordExamExitButton')?.addEventListener('click',exit);
    $('reviewWordExamButton')?.addEventListener('click',reviewWrong);
    $('retryWordExamButton')?.addEventListener('click',retrySame);
    $('backToExamPageButton')?.addEventListener('click',()=>KenteiRouter.show('exam'));
    $('submitWordExamAnswerButton')?.addEventListener('click',answerInput);
    $('wordExamAnswerInput')?.addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();answerInput()}
    });
    document.querySelectorAll('input[name="examCount"]').forEach(input=>input.addEventListener('change',()=>{
      $('customExamCount').classList.toggle('hidden',document.querySelector('input[name="examCount"]:checked')?.value!=='custom');
    }));
    document.addEventListener('kentei:route',event=>{
      if(event.detail==='wordExamSetup')renderSetup();
      if(event.detail==='wordExamResult')showResult(getLastResult());
      if(event.detail!=='wordExam')stopTimer();
    });
  }

  return{init,startNew,resume,discard,retrySame,showResult};
})();