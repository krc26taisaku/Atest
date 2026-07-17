window.KenteiDataQuality=(()=>{
  function normalizeSpace(value){
    return String(value||'')
      .replace(/\r\n?/g,'\n')
      .replace(/[ \t　]+/g,' ')
      .replace(/\s*\n\s*/g,'\n')
      .trim();
  }

  function splitWord(rawWord){
    const source=normalizeSpace(rawWord);
    const aliases=[];
    let word=source;

    // Remove trailing parenthetical data from the visible answer.
    // Keep it as an alias so search and free-input answers still work.
    const trailing=source.match(/^(.*?)\s*[（(]([^()（）]+)[）)]\s*$/);
    if(trailing){
      const base=trailing[1].trim();
      const inside=trailing[2].trim();
      if(base&&inside){
        word=base;
        aliases.push(inside);
      }
    }

    // Remove accidental separators followed by an explanatory sentence.
    const separator=word.match(/^(.{1,35}?)\s*[／/]\s*(.{12,})$/);
    if(separator&&/[。、をがはの]/.test(separator[2])){
      word=separator[1].trim();
      aliases.push(separator[2].trim());
    }

    return{
      rawWord:source,
      word:word.trim()||source,
      aliases:[...new Set(aliases.filter(Boolean))]
    };
  }

  function escapeRegExp(value){
    return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  }

  function containsAnswer(text,word,aliases=[]){
    const source=String(text||'');
    const candidates=[word,...aliases]
      .map(value=>String(value||'').trim())
      .filter(value=>value.length>=2);
    return candidates.some(candidate=>{
      if(/^[A-Za-z0-9+./-]+$/.test(candidate)){
        return new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(candidate)}(?=$|[^A-Za-z0-9])`,'i').test(source);
      }
      return source.includes(candidate);
    });
  }

  function maskAnswer(text,word,aliases=[]){
    let result=normalizeSpace(text);
    const candidates=[word,...aliases]
      .map(value=>String(value||'').trim())
      .filter(value=>value.length>=2)
      .sort((a,b)=>b.length-a.length);

    for(const candidate of candidates){
      if(/^[A-Za-z0-9+./-]+$/.test(candidate)){
        const pattern=new RegExp(`(^|[^A-Za-z0-9])${escapeRegExp(candidate)}(?=$|[^A-Za-z0-9])`,'gi');
        result=result.replace(pattern,(match,prefix)=>`${prefix}この用語`);
      }else{
        result=result.split(candidate).join('この用語');
      }
    }

    // Naturalize common artifacts produced by replacement.
    result=result
      .replace(/この用語[（(][^()（）]{1,80}[）)]/g,'この用語')
      .replace(/この用語とは[、,]?\s*/g,'')
      .replace(/この用語は[、,]?\s*/g,'')
      .replace(/この用語のこと。?$/g,'この用語。')
      .replace(/この用語この用語/g,'この用語')
      .trim();

    return result;
  }

  function questionText(question){
    const source=question.questionMeaning||question.meaning||'';
    return containsAnswer(source,question.word,question.aliases)
      ?maskAnswer(source,question.word,question.aliases)
      :source;
  }

  function cleanQuestion(question){
    const split=splitWord(question.word);
    const meaning=normalizeSpace(question.meaning);
    const questionMeaning=maskAnswer(meaning,split.word,split.aliases);
    const leakBefore=containsAnswer(meaning,split.word,split.aliases);
    const leakAfter=containsAnswer(questionMeaning,split.word,split.aliases);

    return{
      ...question,
      rawWord:split.rawWord,
      word:split.word,
      aliases:split.aliases,
      meaning,
      questionMeaning,
      dataQuality:{
        wordChanged:split.word!==split.rawWord,
        answerLeakRemoved:leakBefore&&!leakAfter,
        leakBefore,
        leakAfter
      }
    };
  }

  const cleaned=(window.WORD_QUESTIONS||[]).map(cleanQuestion);
  window.WORD_QUESTIONS=cleaned;
  window.KENTEI_DATA_QUALITY_REPORT={
    total:cleaned.length,
    wordFieldsCleaned:cleaned.filter(q=>q.dataQuality.wordChanged).length,
    answerLeaksRemoved:cleaned.filter(q=>q.dataQuality.answerLeakRemoved).length,
    remainingLeaks:cleaned.filter(q=>q.dataQuality.leakAfter).map(q=>q.id)
  };

  return{
    normalizeSpace,splitWord,containsAnswer,maskAnswer,
    questionText,cleanQuestion,
    report:window.KENTEI_DATA_QUALITY_REPORT
  };
})();