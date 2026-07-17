window.KenteiWordChoice=(()=>{
  const Q=()=>window.WORD_QUESTIONS||[];

  const TOPIC_GROUPS=[
    ['経営','企業','会社','事業','経営戦略','競争','市場','マーケティング','顧客','販売','ブランド'],
    ['会計','財務','利益','売上','費用','資産','負債','決算','株主','投資','キャッシュフロー','損益'],
    ['組織','人材','社員','労働','教育','研修','リーダー','職務','能力'],
    ['法','法律','権利','義務','契約','著作権','個人情報','規則','制度','標準'],
    ['データ','分析','統計','グラフ','相関','予測','標本','母集団','検定','可視化'],
    ['プロジェクト','工程','進捗','納期','工数','品質','リスク','スケジュール','見積り'],
    ['システム開発','開発','設計','テスト','要件','プログラム','ソフトウェア','保守','レビュー'],
    ['セキュリティ','攻撃','暗号','認証','ウイルス','不正','脅威','脆弱性','アクセス制御'],
    ['ネットワーク','通信','インターネット','IP','DNS','ルータ','LAN','プロトコル','回線'],
    ['データベース','DB','SQL','表','レコード','トランザクション','正規化','主キー'],
    ['ハードウェア','CPU','メモリ','記憶装置','ディスク','クロック','プロセッサ','入出力'],
    ['AI','人工知能','機械学習','深層学習','ニューラル','生成AI','モデル','学習データ'],
    ['クラウド','IoT','DX','デジタル','仮想化','ビッグデータ','サービス','プラットフォーム'],
    ['品質管理','改善','原因','工程','管理図','パレート','特性要因','PDCA'],
    ['可用性','信頼性','障害','復旧','バックアップ','稼働率','冗長','BCP','災害']
  ];

  function normalize(value){
    return String(value||'').toLowerCase().normalize('NFKC')
      .replace(/\s+/g,'')
      .replace(/[。、，．・：:；;（）()「」『』【】［］\[\]<>＜＞!！?？\-_/\\]/g,'');
  }

  function ngrams(value,size=2){
    const text=normalize(value),result=new Set();
    if(text.length<size){if(text)result.add(text);return result}
    for(let i=0;i<=text.length-size;i++)result.add(text.slice(i,i+size));
    return result;
  }

  function jaccard(a,b){
    if(!a.size||!b.size)return 0;
    let common=0;a.forEach(x=>{if(b.has(x))common++});
    return common/(a.size+b.size-common);
  }

  function asciiTokens(value){
    return new Set(String(value||'').toUpperCase().match(/[A-Z][A-Z0-9.&+\-]{1,}/g)||[]);
  }

  function commonCount(a,b){
    let count=0;a.forEach(x=>{if(b.has(x))count++});return count;
  }

  function topicMatches(question){
    const text=normalize(`${question.word} ${question.meaning}`),matches=[];
    TOPIC_GROUPS.forEach((words,index)=>{
      if(words.some(word=>text.includes(normalize(word))))matches.push(index);
    });
    return new Set(matches);
  }

  function score(base,candidate){
    if(!base||!candidate||base.id===candidate.id||base.word===candidate.word)return -Infinity;
    let value=0;

    if(window.KenteiConfusionData?.sameGroup(base.word,candidate.word))value+=1000;
    if(base.category===candidate.category)value+=22;

    value+=jaccard(ngrams(base.meaning,2),ngrams(candidate.meaning,2))*55;
    value+=jaccard(ngrams(base.meaning,3),ngrams(candidate.meaning,3))*30;
    value+=jaccard(ngrams(base.word,2),ngrams(candidate.word,2))*30;
    value+=commonCount(topicMatches(base),topicMatches(candidate))*18;
    value+=commonCount(asciiTokens(`${base.word} ${base.meaning}`),asciiTokens(`${candidate.word} ${candidate.meaning}`))*14;

    const a=normalize(base.word),b=normalize(candidate.word);
    if(a.length>=3&&b.length>=3){
      if(a.slice(0,2)===b.slice(0,2))value+=12;
      if(a.slice(-2)===b.slice(-2))value+=12;
    }
    return value;
  }

  function byExplicitDictionary(base){
    const names=window.KenteiConfusionData?.related(base.word)||[];
    return names.map(name=>Q().find(q=>normalize(q.word)===normalize(name))).filter(Boolean);
  }

  function ranked(base){
    return Q().filter(q=>q.id!==base.id&&q.word!==base.word)
      .map(q=>({q,score:score(base,q),tie:Math.random()}))
      .sort((a,b)=>b.score-a.score||a.tie-b.tie);
  }

  function weightedPick(items){
    const weights=items.map((_,i)=>Math.max(1,items.length-i));
    let target=Math.random()*weights.reduce((a,b)=>a+b,0);
    for(let i=0;i<items.length;i++){target-=weights[i];if(target<=0)return items.splice(i,1)[0]}
    return items.pop();
  }

  function distractors(base,count=3){
    const selected=[];
    const add=q=>{
      if(q&&q.id!==base.id&&q.word!==base.word&&!selected.some(x=>x.word===q.word))selected.push(q);
    };

    // 1. 人が定義した「混同辞書」を最優先
    const explicit=byExplicitDictionary(base);
    while(explicit.length&&selected.length<count)add(explicit.splice(Math.floor(Math.random()*explicit.length),1)[0]);

    // 2. 意味・用語名が近い上位候補だけから補う
    const all=ranked(base);
    const strong=all.filter(x=>x.score>=20).slice(0,15);
    while(strong.length&&selected.length<count)add(weightedPick(strong)?.q);

    // 3. 同じ分野内の最上位候補で不足分を補う
    all.filter(x=>x.q.category===base.category).forEach(x=>{if(selected.length<count)add(x.q)});

    // 選択肢不足による停止を防ぐ最終補完
    all.forEach(x=>{if(selected.length<count)add(x.q)});
    return selected.slice(0,count);
  }

  function shuffle(items){
    const result=[...items];
    for(let i=result.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [result[i],result[j]]=[result[j],result[i]];
    }
    return result;
  }

  function choices(base,count=4){
    return shuffle([base,...distractors(base,Math.max(0,count-1))]);
  }

  function diagnostics(){
    const data=Q(),samples=['ERP','MTBF','DNS','CRC','インスタンス化'];
    const checks=samples.map(word=>{
      const q=data.find(x=>normalize(x.word)===normalize(word));
      if(!q)return{word,available:false};
      const result=choices(q,4);
      return{word,available:true,valid:result.length===4&&new Set(result.map(x=>x.word)).size===4,choices:result.map(x=>x.word)};
    });
    return{
      valid:checks.filter(x=>x.available).every(x=>x.valid),
      confusion:window.KenteiConfusionData?.diagnostics(data)||null,
      checks
    };
  }

  return{choices,distractors,score,diagnostics};
})();