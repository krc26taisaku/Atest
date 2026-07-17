window.KenteiPreviousQuestion=(()=>{
  const $=id=>document.getElementById(id);
  const W=()=>window.WORD_QUESTIONS||[];
  const C=()=>window.CALCULATION_QUESTIONS||[];

  function readJson(key){
    try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}
  }

  function esc(value){
    return String(value||'').replace(/[&<>"']/g,char=>({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[char]));
  }

  function wordCard(question,answer=null){
    if(!question)return null;
    return{
      title:question.displayWord||question.word,
      html:`<div class="previous-question-type">📖 単語</div>
        <div class="previous-question-text">${esc(question.meaning)}</div>
        <div class="previous-question-answer"><strong>正解</strong>${esc(question.displayWord||question.word)}</div>
        ${question.abbreviationDetails?`<div class="previous-question-explanation"><strong>略称の内訳</strong>${esc(question.abbreviationDetails)}</div>`:''}
        ${answer?`<div class="previous-question-selected"><strong>前回の回答</strong>${esc(answer)}</div>`:''}`
    };
  }

  function calcCard(question,answer=null){
    if(!question)return null;
    return{
      title:question.topic||'計算問題',
      html:`<div class="previous-question-type">🧮 ${esc(question.topic)}</div>
        <div class="previous-question-text">${esc(question.question)}</div>
        <div class="previous-question-answer"><strong>正解</strong>${esc(question.answerLabel)}</div>
        ${answer?`<div class="previous-question-selected"><strong>前回の回答</strong>${esc(answer)}</div>`:''}
        <div class="previous-question-explanation"><strong>公式</strong>${esc(question.formula)}</div>`
    };
  }

  function fromWordStudy(){
    const state=window.KenteiWord?.getState?.();
    const session=state?.lastSession;
    const index=(session?.position??0)-1;
    if(index<0)return null;
    return wordCard(W().find(q=>q.id===session.order[index]));
  }

  function fromCalcStudy(){
    const state=readJson('kentei_calc_state_v1');
    const session=state?.lastSession;
    const index=(session?.position??0)-1;
    if(index<0)return null;
    return calcCard(C().find(q=>q.id===session.order[index]));
  }

  function fromWordExam(){
    const session=readJson('kentei_word_exam_v2');
    const index=(session?.position??0)-1;
    if(index<0)return null;
    const id=session.order[index];
    const answer=(session.answers||[]).find(item=>item.questionId===id);
    return wordCard(W().find(q=>q.id===id),answer?.selectedLabel||answer?.entered);
  }

  function fromCalcExam(){
    const session=readJson('kentei_calc_exam_v1');
    const index=(session?.position??0)-1;
    if(index<0)return null;
    const id=session.order[index];
    const answer=(session.answers||[]).find(item=>item.questionId===id);
    return calcCard(C().find(q=>q.id===id),answer?.selectedLabel);
  }

  function fromComprehensive(){
    const session=readJson('kentei_comprehensive_exam_v1');
    const index=(session?.position??0)-1;
    if(index<0)return null;
    const item=session.items[index];
    const answer=(session.answers||[])[index];
    if(item.type==='word')return wordCard(W().find(q=>q.id===item.id),answer?.selectedLabel);
    return calcCard(C().find(q=>q.id===item.id),answer?.selectedLabel);
  }

  function show(context){
    const providers={
      word:fromWordStudy,calc:fromCalcStudy,wordExam:fromWordExam,
      calcExam:fromCalcExam,comprehensive:fromComprehensive
    };
    const card=providers[context]?.();
    if(!card){
      if(typeof showToast==='function')showToast('前の問題はありません');
      return;
    }
    $('previousQuestionTitle').textContent=card.title||'前の問題';
    $('previousQuestionBody').innerHTML=card.html;
    $('previousQuestionModal').classList.remove('hidden');
  }

  function close(){$('previousQuestionModal')?.classList.add('hidden')}

  function init(){
    const buttons={
      previousQuestionButton:'word',
      calcPreviousButton:'calc',
      wordExamPreviousButton:'wordExam',
      calcExamPreviousButton:'calcExam',
      comprehensiveExamPreviousButton:'comprehensive'
    };
    Object.entries(buttons).forEach(([id,context])=>{
      $(id)?.addEventListener('click',()=>show(context));
    });
    $('closePreviousQuestionButton')?.addEventListener('click',close);
    $('closePreviousQuestionBottomButton')?.addEventListener('click',close);
    $('previousQuestionModal')?.addEventListener('click',event=>{
      if(event.target===event.currentTarget)close();
    });
  }

  return{init,show,close};
})();