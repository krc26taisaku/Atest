window.KenteiQuiz=(()=>{
  const SETTINGS_KEY='kentei_word_quiz_settings_v1';
  const $=id=>document.getElementById(id);
  const Q=()=>window.WORD_QUESTIONS||[];
  const esc=s=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const shuffle=items=>{
    const result=[...items];
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  };

  let order=[],pos=0,mode='all',label='全分野',current=null,currentChoices=[];
  let answered=false,session={total:0,correct:0},settings={direction:'meaningToWord',answerMode:'choice'};

  function loadSettings(){
    try{
      settings={...settings,...JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}')};
    }catch{}
    document.querySelector(`input[name="wordStudyDirection"][value="${settings.direction}"]`)?.click();
    document.querySelector(`input[name="wordStudyAnswerMode"][value="${settings.answerMode}"]`)?.click();
  }

  function saveSettings(){
    localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));
  }

  function syncSettingsFromHome(){
    settings.direction=document.querySelector('input[name="wordStudyDirection"]:checked')?.value||settings.direction;
    settings.answerMode=document.querySelector('input[name="wordStudyAnswerMode"]:checked')?.value||settings.answerMode;
    saveSettings();
  }

  function start(nextMode,options={}){
    syncSettingsFromHome();
    mode=nextMode;
    label=nextMode==='all'?'全分野':nextMode==='wrong'?'間違えた問題':nextMode==='favorite'?'お気に入り問題':nextMode;
    const pool=KenteiWord.pool(nextMode);
    if(!pool.length){alert('対象の問題がありません');return}
    order=options.order||shuffle(pool.map(q=>q.id));
    pos=options.position||0;
    if(options.settings)settings={...settings,...options.settings};
    session={total:0,correct:0};
    KenteiRouter.show('quiz');
    show();
    persist();
  }

  function resume(){
    const s=KenteiWord.getState().lastSession;
    if(!s)return;
    start(s.mode,{order:s.order,position:s.position,settings:s.settings});
  }

  function restartLast(){
    const s=KenteiWord.getState().lastSession;
    if(!s)return;
    start(s.mode,{settings:s.settings});
  }

  function persist(){
    KenteiWord.setLastSession({mode,label,order,position:pos,settings});
  }

  function correctText(){
    return settings.direction==='wordToMeaning'?current.meaning:(current.displayWord||current.word);
  }

  function displayText(item){
    return settings.direction==='wordToMeaning'?item.meaning:(item.displayWord||item.word);
  }

  function show(){
    answered=false;
    current=Q().find(q=>q.id===order[pos]);
    if(!current){finish();return}

    $('quizCategory').textContent=current.category;
    $('quizProgress').textContent=`${pos+1} / ${order.length}`;
    $('quizQuestion').textContent=KenteiPredictionEngine.wordQuestion(current,{direction:settings.direction});
    $('quizReverseButton').title=settings.direction==='meaningToWord'?'単語→説明へ変更':'説明→単語へ変更';

    const pq=KenteiWord.getState().perQuestion[current.id]||{total:0,correct:0,wrong:0};
    $('questionStats').textContent=`この問題の正答率：${KenteiWord.pct(pq.correct,pq.total)}・間違い ${pq.wrong||0}回`;
    $('answerResult').className='answer-result hidden';
    $('answerResult').innerHTML='';
    $('nextQuestionButton').classList.add('hidden');
    $('favoriteButton').textContent=KenteiWord.getState().favorites.includes(current.id)?'★':'☆';
    $('notePanel').classList.add('hidden');
    $('noteInput').value=KenteiWord.getNote(current.id);
    $('noteStatus').textContent='';

    currentChoices=window.KenteiWordChoice
      ?KenteiWordChoice.choices(current,4)
      :shuffle([current,...shuffle(Q().filter(q=>q.category===current.category&&q.id!==current.id)).slice(0,3)]);

    $('choiceArea').innerHTML='';
    $('wordInputArea').classList.toggle('hidden',settings.answerMode!=='input');

    if(settings.answerMode==='choice'){
      currentChoices.forEach(item=>{
        const button=document.createElement('button');
        button.className='quiz-choice';
        button.textContent=displayText(item);
        button.onclick=()=>answerChoice(item,button);
        $('choiceArea').appendChild(button);
      });
    }else{
      $('wordAnswerInput').value='';
      $('wordAnswerInput').placeholder=settings.direction==='wordToMeaning'?'説明を入力':'単語を入力';
      setTimeout(()=>$('wordAnswerInput')?.focus(),50);
    }

    updateSession();
    persist();
  }

  function explanationHtml(selectedId=null){
    return currentChoices.map(item=>`
      <div class="explanation-item ${item.id===current.id?'correct':''} ${selectedId&&item.id===selectedId&&selectedId!==current.id?'selected':''}">
        <div class="explanation-word">${esc(item.displayWord||item.word)} ${item.id===current.id?'⭕':''}</div>
        ${item.abbreviationDetails?`<div class="abbreviation-details">${esc(item.abbreviationDetails)}</div>`:''}
        <div class="explanation-meaning">${esc(item.meaning)}</div>
      </div>
    `).join('');
  }

  function recordResult(ok){
    session.total++;
    if(ok)session.correct++;
    KenteiWord.record(current,ok);
  }

  function answerChoice(item,button){
    if(answered)return;
    answered=true;
    const ok=item.id===current.id;
    recordResult(ok);

    document.querySelectorAll('#choiceArea .quiz-choice').forEach((element,index)=>{
      element.disabled=true;
      if(currentChoices[index]?.id===current.id)element.classList.add('correct');
    });
    if(!ok)button.classList.add('wrong');

    $('answerResult').className='answer-result '+(ok?'ok':'ng');
    $('answerResult').innerHTML=`
      <div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>
      ${ok?'':`正解：<b>${esc(correctText())}</b>`}
      <div class="explanation-list">${explanationHtml(item.id)}</div>
    `;
    afterAnswer();
  }

  function answerInput(){
    if(answered)return;
    const entered=$('wordAnswerInput').value.trim();
    if(!entered){$('wordAnswerInput').focus();return}
    answered=true;
    const answer=settings.direction==='wordToMeaning'?current.meaning:current.word;
    const type=settings.direction==='wordToMeaning'?'meaning':'word';
    const ok=settings.direction==='wordToMeaning'
      ?KenteiPredictionEngine.isCorrectInput(entered,answer,type)
      :(window.KenteiAbbreviation?.matchesInput(entered,current)||
        KenteiPredictionEngine.isCorrectInput(entered,answer,type));
    recordResult(ok);
    $('wordAnswerInput').disabled=true;
    $('submitWordAnswerButton').disabled=true;
    $('answerResult').className='answer-result '+(ok?'ok':'ng');
    $('answerResult').innerHTML=`
      <div class="answer-title">${ok?'⭕ 正解！':'❌ 不正解'}</div>
      <div>入力：<b>${esc(entered)}</b></div>
      ${ok?'':`<div>正解：<b>${esc(answer)}</b></div>`}
      <div class="explanation-list">
        <div class="explanation-item correct">
          <div class="explanation-word">${esc(current.displayWord||current.word)} ⭕</div>
          ${current.abbreviationDetails?`<div class="abbreviation-details">${esc(current.abbreviationDetails)}</div>`:''}
          <div class="explanation-meaning">${esc(current.meaning)}</div>
        </div>
      </div>
    `;
    afterAnswer();
  }

  function afterAnswer(){
    $('nextQuestionButton').classList.remove('hidden');
    updateSession();
  }

  function toggleDirection(){
    settings.direction=settings.direction==='meaningToWord'?'wordToMeaning':'meaningToWord';
    saveSettings();
    const radio=document.querySelector(`input[name="wordStudyDirection"][value="${settings.direction}"]`);
    if(radio)radio.checked=true;
    show();
    if(typeof showToast==='function')showToast(settings.direction==='meaningToWord'?'説明から単語を答える':'単語から説明を答える');
  }

  function next(){
    $('wordAnswerInput').disabled=false;
    $('submitWordAnswerButton').disabled=false;
    pos++;
    if(pos>=order.length){finish();return}
    show();
  }

  function finish(){
    KenteiWord.clearLastSession();
    $('choiceArea').innerHTML='';
    $('wordInputArea').classList.add('hidden');
    $('quizQuestion').textContent='このモードの問題をすべて解き終わりました！';
    $('questionStats').textContent='';
    $('answerResult').className='answer-result ok';
    $('answerResult').innerHTML=`正解 ${session.correct} / ${session.total}<br>正答率 ${KenteiWord.pct(session.correct,session.total)}`;
    $('nextQuestionButton').textContent='単語ホームへ戻る';
    $('nextQuestionButton').classList.remove('hidden');
    $('nextQuestionButton').onclick=()=>{resetNext();KenteiRouter.show('word')};
  }

  function resetNext(){
    $('nextQuestionButton').textContent='次の問題へ';
    $('nextQuestionButton').onclick=next;
  }

  function updateSession(){
    $('sessionAnswered').textContent=session.total;
    $('sessionCorrect').textContent=session.correct;
    $('sessionRate').textContent=KenteiWord.pct(session.correct,session.total);
  }

  function init(){
    loadSettings();
    resetNext();
    $('quizBackButton').onclick=()=>KenteiRouter.show('word');
    $('quizReverseButton').onclick=toggleDirection;
    $('favoriteButton').onclick=()=>{if(current)$('favoriteButton').textContent=KenteiWord.toggleFavorite(current.id)?'★':'☆'};
    $('noteToggleButton').onclick=()=>$('notePanel').classList.toggle('hidden');
    $('saveNoteButton').onclick=()=>{
      if(!current)return;
      KenteiWord.saveNote(current.id,$('noteInput').value.trim());
      $('noteStatus').textContent='保存しました';
    };
    $('submitWordAnswerButton').onclick=answerInput;
    $('wordAnswerInput').addEventListener('keydown',event=>{
      if(event.key==='Enter'){event.preventDefault();answerInput()}
    });
    document.querySelectorAll('input[name="wordStudyDirection"],input[name="wordStudyAnswerMode"]').forEach(input=>{
      input.addEventListener('change',syncSettingsFromHome);
    });
  }

  return{init,start,resume,restartLast};
})();