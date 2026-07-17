window.KenteiPredictionEngine=(()=>{
  function hash(text){
    let h=2166136261;
    for(const char of String(text||'')){
      h^=char.charCodeAt(0);
      h=Math.imul(h,16777619);
    }
    return h>>>0;
  }

  function pickByKey(items,key){
    return items[hash(key)%items.length];
  }

  function normalize(value){
    return String(value||'')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/\s+/g,'')
      .replace(/[。、，．・：:；;（）()「」『』【】［］\[\]<>＜＞!！?？"'`´’‘〜～\-_/\\]/g,'');
  }

  function bigrams(value){
    const text=normalize(value);
    const result=new Set();
    if(text.length<2){
      if(text)result.add(text);
      return result;
    }
    for(let i=0;i<text.length-1;i++)result.add(text.slice(i,i+2));
    return result;
  }

  function similarity(a,b){
    const x=normalize(a),y=normalize(b);
    if(!x||!y)return 0;
    if(x===y)return 1;
    if(x.includes(y)||y.includes(x)){
      const shorter=Math.min(x.length,y.length);
      const longer=Math.max(x.length,y.length);
      return Math.max(.72,shorter/longer);
    }
    const ax=bigrams(x),by=bigrams(y);
    let common=0;
    ax.forEach(token=>{if(by.has(token))common++});
    return common/Math.max(1,ax.size+by.size-common);
  }

  function isCorrectInput(input,answer,type='word'){
    const entered=normalize(input);
    const correct=normalize(answer);
    if(!entered||!correct)return false;
    if(entered===correct)return true;
    if(type==='word'){
      return entered.replace(/[a-z]/g,char=>char.toUpperCase())===
        correct.replace(/[a-z]/g,char=>char.toUpperCase());
    }
    return similarity(entered,correct)>=.52;
  }

  function wordQuestion(question,{direction='meaningToWord',prediction=false,index=0}={}){
    const predicted=prediction||false;
    if(direction==='wordToMeaning'){
      if(!predicted)return question.displayWord||question.word;
      const templates=[
        `「${question.displayWord||question.word}」の説明として最も適切なものを答えなさい。`,
        `試験で「${question.displayWord||question.word}」が問われた。内容を正しく説明しなさい。`,
        `次のIT用語が表す内容を答えなさい。\n${question.displayWord||question.word}`,
        `「${question.displayWord||question.word}」について、要点が伝わる説明を選びなさい。`
      ];
      return pickByKey(templates,`${question.id}:reverse:${index}`);
    }

    if(!predicted)return question.questionMeaning||question.meaning;
    const templates=[
      `次の特徴に当てはまる用語を答えなさい。\n${question.questionMeaning||question.meaning}`,
      `試験で次の説明が示された。最も適切なIT用語は何か。\n${question.questionMeaning||question.meaning}`,
      `次の内容を表す用語を選びなさい。\n${question.questionMeaning||question.meaning}`,
      `この説明から連想される用語として最も適切なものを答えなさい。\n${question.questionMeaning||question.meaning}`
    ];
    return pickByKey(templates,`${question.id}:normal:${index}`);
  }

  function calculationQuestion(question,{prediction=false,index=0}={}){
    if(!prediction)return question.question;
    const original=String(question.question||'')
      .replace(/はいくらか。?$/,'を求めなさい。')
      .replace(/は何%か。?$/,'を百分率で求めなさい。')
      .replace(/は何個か。?$/,'を求めなさい。')
      .replace(/はどれか。?$/,'として最も適切なものを選びなさい。');
    const templates=[
      `【予想問題】次の条件を基に答えなさい。\n${original}`,
      `本番では次のように条件を変えて問われることがある。\n${original}`,
      `次の資料から必要な値を求め、最も適切な選択肢を選びなさい。\n${original}`,
      `応用形式で考えなさい。\n${original}`
    ];
    return pickByKey(templates,`${question.id}:calc:${index}`);
  }

  function chooseMixed(value,index,key){
    if(value!=='mixed')return value;
    return hash(`${key}:${index}`)%2===0?'meaningToWord':'wordToMeaning';
  }

  function chooseAnswerMode(value,index,key){
    if(value!=='mixed')return value;
    return hash(`${key}:answer:${index}`)%2===0?'choice':'input';
  }

  return{
    normalize,similarity,isCorrectInput,
    wordQuestion,calculationQuestion,
    chooseMixed,chooseAnswerMode
  };
})();