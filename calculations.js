
(()=>{
  const round=(value,digits=2)=>{
    const p=10**digits;
    return Math.round((Number(value)+Number.EPSILON)*p)/p;
  };

  const percent=value=>round(value*100,1);
  const money=value=>Math.round(value);
  const integer=value=>Math.round(value);

  function uniqueChoices(correct,wrongValues,formatter){
    const result=[];
    const add=value=>{
      const label=formatter(value);
      if(!result.some(item=>item.label===label))result.push({value,label});
    };
    add(correct);
    wrongValues.forEach(add);

    const base=Number(correct);
    const magnitude=Math.max(1,Math.abs(base));
    const fallback=[
      base*0.9,
      base*1.1,
      base*0.8,
      base*1.2,
      base-magnitude*0.05,
      base+magnitude*0.05
    ];
    fallback.forEach(add);
    let step=Math.max(1,magnitude*0.1);
    let index=1;
    while(result.length<4){
      add(base+step*index);
      if(result.length<4)add(base-step*index);
      index++;
    }
    return result.slice(0,4);
  }

  function makeQuestion(config){
    const correct=config.solve(config.values);
    const wrong=config.mistakes(config.values,correct);
    const choices=uniqueChoices(correct,wrong,config.formatAnswer);

    const correctLabel=config.formatAnswer(correct);
    const correctCount=choices.filter(x=>x.label===correctLabel).length;
    if(correctCount!==1)throw new Error(`${config.id}: 正解が選択肢内で一意ではありません`);
    if(choices.length!==4)throw new Error(`${config.id}: 選択肢が4つありません`);

    const steps=config.steps(config.values,correct);
    if(!steps.length)throw new Error(`${config.id}: 途中式がありません`);

    return {
      id:config.id,
      category:config.category,
      topic:config.topic,
      question:config.question(config.values),
      values:config.values,
      answer:correct,
      answerLabel:correctLabel,
      choices,
      formula:config.formula,
      steps,
      explanation:config.explanation(config.values,correct),
      unit:config.unit||''
    };
  }

  function makeTextQuestion(config){
    const answerLabel=String(config.answerLabel);
    const labels=[answerLabel,...config.wrongLabels.map(String)];
    const unique=[...new Set(labels)];
    if(unique.length!==4)throw new Error(`${config.id}: SQL選択肢が重複しています`);
    return{
      id:config.id,seed:config.seed||'',templateType:config.templateType||'',
      category:config.category,topic:config.topic,question:config.question,
      answer:answerLabel,answerLabel,
      choices:unique.map(label=>({value:label,label})),
      formula:config.formula,steps:config.steps,
      explanation:config.explanation,unit:''
    };
  }

  const q=[];

  // 損益分岐点：Ver3.1-2 シード付きランダム生成
  function registerBepTemplates(){
    if(!KenteiTemplateEngine.has('CAL-BEP-SALES')){
      KenteiTemplateEngine.register({
        type:'CAL-BEP-SALES',
        category:'ストラテジ系',
        topic:'損益分岐点',
        generate({rng}){
          const rates=[0.2,0.25,0.3,0.35,0.4,0.45,0.5,0.55,0.6];
          const variableRate=rng.pick(rates);
          const marginRate=1-variableRate;
          const target=rng.step(2000000,12000000,500000);
          const fixed=money(target*marginRate);
          const correct=money(fixed/marginRate);
          const wrong=[
            money(fixed/variableRate),
            money(fixed*marginRate),
            money(fixed/(1+variableRate))
          ];
          const format=v=>`${money(v).toLocaleString()}円`;

          return{
            values:{fixed,variableRate},
            question:`固定費が${fixed.toLocaleString()}円、変動費率が${variableRate*100}%のとき、損益分岐点売上高はいくらか。`,
            answer:correct,
            answerLabel:format(correct),
            choices:uniqueChoices(correct,wrong,format),
            formula:'損益分岐点売上高 ＝ 固定費 ÷（1－変動費率）',
            steps:[
              `限界利益率 ＝ 1－${variableRate} ＝ ${round(marginRate,2)}`,
              `${fixed.toLocaleString()} ÷ ${round(marginRate,2)} ＝ ${correct.toLocaleString()}円`
            ],
            explanation:`売上高のうち固定費の回収に使える割合は${marginRate*100}%です。固定費を限界利益率で割ります。`
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-BEP-PROFIT')){
      KenteiTemplateEngine.register({
        type:'CAL-BEP-PROFIT',
        category:'ストラテジ系',
        topic:'損益分岐点',
        generate({rng}){
          const sales=rng.step(5000000,20000000,500000);
          const variableRate=rng.pick([0.25,0.3,0.35,0.4,0.45,0.5,0.55]);
          const variable=money(sales*variableRate);
          const maxFixed=Math.max(1000000,sales-variable-500000);
          const fixed=rng.step(1000000,maxFixed,500000);
          const correct=money(sales-variable-fixed);
          const wrong=[
            money(sales-variable+fixed),
            money(sales-fixed),
            money(sales-variable)
          ];
          const format=v=>`${money(v).toLocaleString()}円`;

          return{
            values:{sales,variable,fixed},
            question:`売上高${sales.toLocaleString()}円、変動費${variable.toLocaleString()}円、固定費${fixed.toLocaleString()}円のとき、利益はいくらか。`,
            answer:correct,
            answerLabel:format(correct),
            choices:uniqueChoices(correct,wrong,format),
            formula:'利益 ＝ 売上高－変動費－固定費',
            steps:[
              `${sales.toLocaleString()}－${variable.toLocaleString()}－${fixed.toLocaleString()}`,
              `＝ ${correct.toLocaleString()}円`
            ],
            explanation:'売上高から、売上に応じて変わる変動費と、一定額かかる固定費の両方を引きます。'
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-BEP-UNITS')){
      KenteiTemplateEngine.register({
        type:'CAL-BEP-UNITS',
        category:'ストラテジ系',
        topic:'損益分岐点',
        generate({rng}){
          const contribution=rng.step(500,5000,500);
          const quantity=rng.step(200,2000,100);
          const variablePer=rng.step(500,6000,500);
          const price=variablePer+contribution;
          const fixed=contribution*quantity;
          const correct=quantity;
          const wrong=[
            integer(fixed/price),
            integer(fixed/variablePer),
            integer(fixed/(price+variablePer))
          ];
          const format=v=>`${integer(v).toLocaleString()}個`;

          return{
            values:{price,variablePer,fixed},
            question:`商品1個の販売価格が${price.toLocaleString()}円、1個当たり変動費が${variablePer.toLocaleString()}円、固定費が${fixed.toLocaleString()}円である。損益分岐点販売数量は何個か。`,
            answer:correct,
            answerLabel:format(correct),
            choices:uniqueChoices(correct,wrong,format),
            formula:'損益分岐点数量 ＝ 固定費 ÷（販売単価－1個当たり変動費）',
            steps:[
              `1個当たり限界利益 ＝ ${price.toLocaleString()}－${variablePer.toLocaleString()} ＝ ${contribution.toLocaleString()}円`,
              `${fixed.toLocaleString()} ÷ ${contribution.toLocaleString()} ＝ ${correct.toLocaleString()}個`
            ],
            explanation:'商品1個を売るごとに固定費の回収へ回せる限界利益を求め、その金額で固定費を割ります。'
          };
        }
      });
    }
  }

  function generateBepQuestions(){
    registerBepTemplates();
    const types=['CAL-BEP-SALES','CAL-BEP-PROFIT','CAL-BEP-UNITS'];
    const generated=[];

    for(let set=0;set<4;set++){
      types.forEach(type=>{
        let problem=null;

        for(let attempt=0;attempt<20;attempt++){
          try{
            problem=KenteiTemplateEngine.generate(
              type,
              KenteiRandomEngine.createSeed()
            );
            break;
          }catch(error){
            if(attempt===19)throw error;
          }
        }

        generated.push(problem);
      });
    }

    return generated;
  }

  q.push(...generateBepQuestions());

  // 工数：Ver3.1-3 シード付きランダム生成
  function registerWorkTemplates(){
    if(!KenteiTemplateEngine.has('CAL-WORK-REMAIN')){
      KenteiTemplateEngine.register({
        type:'CAL-WORK-REMAIN',category:'マネジメント系',topic:'工数',
        generate({rng}){
          const people=rng.int(5,18),days=rng.int(10,30);
          const doneDays=rng.int(2,Math.max(2,days-5)),donePeople=people,newDays=rng.int(3,12);
          const remaining=people*days-donePeople*doneDays;
          const correct=Math.ceil(remaining/newDays);
          const wrong=[Math.ceil(people*days/newDays),Math.ceil(remaining/(newDays+doneDays)),remaining];
          const format=v=>`${integer(v)}人`;
          return{
            values:{people,days,donePeople,doneDays,newDays},
            question:`${people}人で${days}日かかる作業を開始し、${donePeople}人で${doneDays}日作業した。残りを${newDays}日で終えるには、以後最低何人必要か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'総工数＝人数×日数、必要人数＝残工数÷残日数（端数は切り上げ）',
            steps:[`総工数＝${people}×${days}＝${people*days}人日`,`完了工数＝${donePeople}×${doneDays}＝${donePeople*doneDays}人日`,`残工数＝${remaining}人日`,`${remaining}÷${newDays}＝${round(remaining/newDays,2)} → 最低${correct}人`],
            explanation:'全体を人日に直し、完了した工数を引いて残日数で割ります。人数に端数が出た場合は切り上げます。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-WORK-PRODUCTIVITY')){
      KenteiTemplateEngine.register({
        type:'CAL-WORK-PRODUCTIVITY',category:'マネジメント系',topic:'工数',
        generate({rng}){
          const multiplier=rng.pick([1.2,1.25,1.5,1.6,2]),answerDays=rng.int(5,20);
          const days=answerDays*multiplier,people=rng.int(5,20),correct=round(days/multiplier,1);
          const wrong=[round(days*multiplier,1),round(days/(multiplier-1),1),round(days-multiplier,1)];
          const format=v=>`${round(v,1)}日`;
          return{
            values:{people,days,multiplier},
            question:`${people}人で${days}日かかる作業がある。1人当たりの生産性が従来の${multiplier}倍になった場合、同じ人数では何日かかるか。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'新しい所要日数＝従来の日数÷生産性の倍率',
            steps:[`${days}÷${multiplier}＝${correct}日`],
            explanation:'生産性が高くなるほど必要な日数は短くなるので、倍率を掛けずに割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-WORK-HOURS')){
      KenteiTemplateEngine.register({
        type:'CAL-WORK-HOURS',category:'マネジメント系',topic:'工数',
        generate({rng}){
          const months=rng.int(2,12),people=rng.int(2,15),hoursPerMonth=rng.pick([140,150,160,168,180]);
          const correct=months*people*hoursPerMonth;
          const wrong=[months*hoursPerMonth,people*hoursPerMonth,months*people+hoursPerMonth];
          const format=v=>`${integer(v).toLocaleString()}時間`;
          return{
            values:{months,people,hoursPerMonth},
            question:`${people}人が${months}か月、1人当たり月${hoursPerMonth}時間作業する。総工数は何時間か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'総工数＝月数×人数×1人当たり月間作業時間',
            steps:[`${months}×${people}×${hoursPerMonth}＝${correct.toLocaleString()}時間`],
            explanation:'月数、人数、1人当たりの月間作業時間をすべて掛けます。'
          };
        }
      });
    }
  }
  function generateWorkQuestions(){
    registerWorkTemplates();
    const types=['CAL-WORK-REMAIN','CAL-WORK-PRODUCTIVITY','CAL-WORK-HOURS'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generateSafe(type)));
    return generated;
  }
  q.push(...generateWorkQuestions());

  // 確率・場合の数：Ver3.2-2 シード付きランダム生成
  function combination(n,r){
    const k=Math.min(r,n-r);
    let result=1;
    for(let i=1;i<=k;i++)result=result*(n-k+i)/i;
    return Math.round(result);
  }

  function permutation(n,r){
    let result=1;
    for(let i=0;i<r;i++)result*=n-i;
    return result;
  }

  function registerProbabilityTemplates(){
    if(!KenteiTemplateEngine.has('CAL-PROB-SINGLE')){
      KenteiTemplateEngine.register({
        type:'CAL-PROB-SINGLE',category:'ストラテジ系',topic:'確率',
        generate({rng}){
          const total=rng.int(6,20),hit=rng.int(1,total-2);
          const correct=percent(hit/total);
          const wrong=[percent((total-hit)/total),round(hit/total,1),percent(hit/(total-hit))];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{total,hit},
            question:`${total}本のくじに当たりが${hit}本ある。1本引くとき、当たる確率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'確率＝条件に合う数÷全体の数',
            steps:[`${hit}÷${total}＝${round(hit/total,4)}`,`${round(hit/total,4)}×100＝${correct}%`],
            explanation:'当たりの本数を全体の本数で割り、百分率に直すため100を掛けます。'
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-PROB-CONTINUOUS')){
      KenteiTemplateEngine.register({
        type:'CAL-PROB-CONTINUOUS',category:'ストラテジ系',topic:'確率',
        generate({rng}){
          const total=rng.int(6,15),hit=rng.int(2,Math.min(6,total-2));
          const correct=percent((hit/total)*((hit-1)/(total-1)));
          const wrong=[percent((hit/total)*(hit/total)),percent(hit/total),percent(((total-hit)/total)*((total-hit-1)/(total-1)))];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{total,hit},
            question:`${total}本のくじに当たりが${hit}本ある。引いたくじを戻さずに2本続けて引くとき、2本とも当たる確率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'連続して起こる確率＝1回目の確率×2回目の確率',
            steps:[`1回目＝${hit}/${total}`,`2回目＝${hit-1}/${total-1}`,`${hit}/${total}×${hit-1}/${total-1}×100＝${correct}%`],
            explanation:'戻さないので、1回目の後は当たり本数と全体本数が1ずつ減ります。'
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-PROB-ATLEAST')){
      KenteiTemplateEngine.register({
        type:'CAL-PROB-ATLEAST',category:'ストラテジ系',topic:'確率',
        generate({rng}){
          const p=rng.pick([0.1,0.2,0.25,0.3,0.4,0.5]),trials=rng.pick([2,3,4]);
          const correct=percent(1-(1-p)**trials);
          const wrong=[percent(p**trials),percent(p*trials),percent((1-p)**trials)];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{p,trials},
            question:`1回の試行で成功する確率が${p*100}%である。独立に${trials}回試行するとき、少なくとも1回成功する確率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'少なくとも1回成功＝1－1回も成功しない確率',
            steps:[`1回失敗する確率＝1－${p}＝${round(1-p,2)}`,`${trials}回すべて失敗＝${round(1-p,2)}^${trials}＝${round((1-p)**trials,4)}`,`1－${round((1-p)**trials,4)}＝${round(correct/100,4)}＝${correct}%`],
            explanation:'「少なくとも1回」は、全て失敗する確率を1から引くと簡単に求められます。'
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-COMB-SELECT')){
      KenteiTemplateEngine.register({
        type:'CAL-COMB-SELECT',category:'ストラテジ系',topic:'場合の数',
        generate({rng}){
          const n=rng.int(5,12),r=rng.int(2,Math.min(4,n-2));
          const correct=combination(n,r);
          const wrong=[permutation(n,r),n**r,n*r];
          const format=v=>`${integer(v).toLocaleString()}通り`;
          return{
            values:{n,r},
            question:`${n}人の中から順序を考えずに${r}人を選ぶ方法は何通りか。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'組合せ nCr＝n!÷｛r!（n－r）!｝',
            steps:[`${n}C${r}＝${correct.toLocaleString()}通り`],
            explanation:'選ぶ順番を区別しないので組合せを使います。'
          };
        }
      });
    }

    if(!KenteiTemplateEngine.has('CAL-COMB-ORDER')){
      KenteiTemplateEngine.register({
        type:'CAL-COMB-ORDER',category:'ストラテジ系',topic:'場合の数',
        generate({rng}){
          const n=rng.int(5,10),r=rng.int(2,Math.min(4,n-1));
          const correct=permutation(n,r);
          const wrong=[combination(n,r),n**r,n*r];
          const format=v=>`${integer(v).toLocaleString()}通り`;
          return{
            values:{n,r},
            question:`${n}人の中から${r}人を選び、順番を付けて並べる方法は何通りか。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'順列 nPr＝n!÷（n－r）!',
            steps:[`${n}P${r}＝${Array.from({length:r},(_,i)=>n-i).join('×')}＝${correct.toLocaleString()}通り`],
            explanation:'順番を区別するため、組合せではなく順列を使います。'
          };
        }
      });
    }
  }

  function generateProbabilityQuestions(){
    registerProbabilityTemplates();
    const generated=[];
    const probabilityTypes=['CAL-PROB-SINGLE','CAL-PROB-CONTINUOUS','CAL-PROB-ATLEAST'];
    const combinationTypes=['CAL-COMB-SELECT','CAL-COMB-ORDER'];
    for(let set=0;set<4;set++)probabilityTypes.forEach(type=>generated.push(KenteiTemplateEngine.generateSafe(type)));
    for(let set=0;set<4;set++)combinationTypes.forEach(type=>generated.push(KenteiTemplateEngine.generateSafe(type)));
    return generated;
  }
  q.push(...generateProbabilityQuestions());

  // 稼働率：Ver3.1-4 シード付きランダム生成
  function registerAvailabilityTemplates(){
    if(!KenteiTemplateEngine.has('CAL-AVAIL-MTBF')){
      KenteiTemplateEngine.register({
        type:'CAL-AVAIL-MTBF',category:'テクノロジ系',topic:'稼働率',
        generate({rng}){
          const total=rng.step(100,1000,50);
          const mttr=rng.step(5,100,5);
          const mtbf=total-mttr;
          const correct=percent(mtbf/(mtbf+mttr));
          const wrong=[percent(mttr/(mtbf+mttr)),percent(mtbf/mttr),round(mtbf/(mtbf+mttr),1)];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{mtbf,mttr},
            question:`MTBFが${mtbf}時間、MTTRが${mttr}時間のシステムの稼働率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'稼働率＝MTBF÷（MTBF＋MTTR）',
            steps:[`${mtbf}÷（${mtbf}＋${mttr}）`,`＝${mtbf}÷${mtbf+mttr}＝${round(mtbf/(mtbf+mttr),3)}`,`＝${correct}%`],
            explanation:'正常に動く平均時間を、正常時間と修理時間を合わせた全時間で割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-AVAIL-SERIES')){
      KenteiTemplateEngine.register({
        type:'CAL-AVAIL-SERIES',category:'テクノロジ系',topic:'稼働率',
        generate({rng}){
          const a=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]),b=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]);
          const correct=percent(a*b);
          const wrong=[percent(a+b-a*b),percent((a+b)/2),percent(Math.min(1,a+b))];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{a,b},
            question:`稼働率${a*100}%の装置Aと、稼働率${b*100}%の装置Bを直列に接続した。全体の稼働率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'直列システムの稼働率＝各装置の稼働率の積',
            steps:[`${a}×${b}＝${round(a*b,4)}`,`${round(a*b,4)}×100＝${correct}%`],
            explanation:'直列では両方が同時に動作する必要があるため、稼働率を掛け合わせます。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-AVAIL-PARALLEL')){
      KenteiTemplateEngine.register({
        type:'CAL-AVAIL-PARALLEL',category:'テクノロジ系',topic:'稼働率',
        generate({rng}){
          const a=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]),b=rng.pick([0.8,0.85,0.9,0.92,0.95,0.98]);
          const correct=percent(1-(1-a)*(1-b));
          const wrong=[percent(a*b),percent((a+b)/2),percent((1-a)*(1-b))];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{a,b},
            question:`稼働率${a*100}%の装置Aと、稼働率${b*100}%の装置Bを並列に接続し、どちらか一方が動けばよい。全体の稼働率は何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'並列システムの稼働率＝1－（両方が停止する確率）',
            steps:[`A停止＝1－${a}＝${round(1-a,2)}`,`B停止＝1－${b}＝${round(1-b,2)}`,`1－（${round(1-a,2)}×${round(1-b,2)}）＝${round(correct/100,4)}`,`＝${correct}%`],
            explanation:'並列では両方が同時に停止したときだけ全体が止まるため、その確率を1から引きます。'
          };
        }
      });
    }
  }
  function generateAvailabilityQuestions(){
    registerAvailabilityTemplates();
    const types=['CAL-AVAIL-MTBF','CAL-AVAIL-SERIES','CAL-AVAIL-PARALLEL'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generateSafe(type)));
    return generated;
  }
  q.push(...generateAvailabilityQuestions());

  // 投資回収・ROI：Ver3.1-3 シード付きランダム生成
  function registerInvestmentTemplates(){
    if(!KenteiTemplateEngine.has('CAL-INVEST-PAYBACK')){
      KenteiTemplateEngine.register({
        type:'CAL-INVEST-PAYBACK',category:'ストラテジ系',topic:'投資回収',
        generate({rng}){
          const years=rng.pick([2,2.5,3,4,5,6,8]),annual=rng.step(1000000,6000000,500000);
          const investment=money(annual*years),correct=years;
          const wrong=[round(annual/investment,1),round(investment-annual,1),round(investment/(annual*12),1)];
          const format=v=>`${round(v,1)}年`;
          return{
            values:{investment,annual},
            question:`${investment.toLocaleString()}円を投資し、毎年${annual.toLocaleString()}円の効果が得られる。単純回収期間は何年か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'回収期間＝投資額÷年間効果額',
            steps:[`${investment.toLocaleString()}÷${annual.toLocaleString()}＝${correct}年`],
            explanation:'年間効果額が何年分あれば投資額に届くかを求めます。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-INVEST-ROI')){
      KenteiTemplateEngine.register({
        type:'CAL-INVEST-ROI',category:'ストラテジ系',topic:'投資回収',
        generate({rng}){
          const roi=rng.pick([0.1,0.15,0.2,0.25,0.3,0.4,0.5]),investment=rng.step(5000000,30000000,1000000);
          const profit=money(investment*roi),correct=percent(profit/investment);
          const wrong=[percent(investment/profit),round(profit/investment,1),percent((profit-investment)/investment)];
          const format=v=>`${round(v,1)}%`;
          return{
            values:{profit,investment},
            question:`投資額${investment.toLocaleString()}円に対して利益が${profit.toLocaleString()}円だった。ROIは何%か。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'ROI＝利益÷投資額×100',
            steps:[`${profit.toLocaleString()}÷${investment.toLocaleString()}＝${round(profit/investment,2)}`,`${round(profit/investment,2)}×100＝${correct}%`],
            explanation:'投資額に対して利益がどの程度の割合になったかを求めます。'
          };
        }
      });
    }
  }
  function generateInvestmentQuestions(){
    registerInvestmentTemplates();
    const types=['CAL-INVEST-PAYBACK','CAL-INVEST-ROI'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generateSafe(type)));
    return generated;
  }
  q.push(...generateInvestmentQuestions());

  // SQL基本：SELECT・WHERE・ORDER BY
  function sqlCode(value){return String(value).replace(/\s+/g,' ').trim()}
  function generateSqlQuestions(){
    const tables=[
      {table:'社員',columns:['社員番号','氏名','年齢','部署'],valueColumn:'年齢'},
      {table:'商品',columns:['商品番号','商品名','価格','在庫数'],valueColumn:'価格'},
      {table:'注文',columns:['注文番号','顧客名','金額','注文日'],valueColumn:'金額'},
      {table:'書籍',columns:['書籍番号','書籍名','価格','著者'],valueColumn:'価格'}
    ];
    const questions=[];
    for(let set=0;set<4;set++){
      const seed=KenteiRandomEngine.createSeed(),rng=KenteiRandomEngine.create(`SQL:${seed}:${set}`);
      const data=rng.pick(tables),selected=rng.sample(data.columns,2);

      const selectAnswer=sqlCode(`SELECT ${selected.join(', ')} FROM ${data.table};`);
      questions.push(makeTextQuestion({
        id:`SQL-SELECT-${seed}`,seed,templateType:'SQL-SELECT',category:'テクノロジ系',topic:'SQL',
        question:`${data.table}テーブルから「${selected.join('」と「')}」だけを取得するSQL文はどれか。`,
        answerLabel:selectAnswer,
        wrongLabels:[sqlCode(`SELECT * FROM ${data.table};`),sqlCode(`FROM ${data.table} SELECT ${selected.join(', ')};`),sqlCode(`SELECT ${selected.join(' AND ')} FROM ${data.table};`)],
        formula:'SELECT 列名 FROM テーブル名;',
        steps:[`取得する列：${selected.join(', ')}`,`対象テーブル：${data.table}`,selectAnswer],
        explanation:'必要な列名をSELECTの後ろへカンマ区切りで書き、FROMの後ろにテーブル名を書きます。'
      }));

      const threshold=rng.step(1000,100000,1000);
      const whereAnswer=sqlCode(`SELECT * FROM ${data.table} WHERE ${data.valueColumn} >= ${threshold};`);
      questions.push(makeTextQuestion({
        id:`SQL-WHERE-${seed}`,seed,templateType:'SQL-WHERE',category:'テクノロジ系',topic:'SQL',
        question:`${data.table}テーブルから、${data.valueColumn}が${threshold.toLocaleString()}以上の行をすべて取得するSQL文はどれか。`,
        answerLabel:whereAnswer,
        wrongLabels:[sqlCode(`SELECT * FROM ${data.table} WHERE ${data.valueColumn} <= ${threshold};`),sqlCode(`SELECT * FROM ${data.table} HAVING ${data.valueColumn} >= ${threshold};`),sqlCode(`SELECT * WHERE ${data.valueColumn} >= ${threshold} FROM ${data.table};`)],
        formula:'SELECT * FROM テーブル名 WHERE 条件;',
        steps:[`条件：${data.valueColumn} >= ${threshold}`,whereAnswer],
        explanation:'行を条件で絞り込むときはWHERE句を使います。以上は >= で表します。'
      }));

      const direction=rng.bool()?'DESC':'ASC',directionText=direction==='DESC'?'大きい順':'小さい順';
      const orderAnswer=sqlCode(`SELECT * FROM ${data.table} ORDER BY ${data.valueColumn} ${direction};`);
      questions.push(makeTextQuestion({
        id:`SQL-ORDER-${seed}`,seed,templateType:'SQL-ORDER',category:'テクノロジ系',topic:'SQL',
        question:`${data.table}テーブルの全行を、${data.valueColumn}の${directionText}に並べて取得するSQL文はどれか。`,
        answerLabel:orderAnswer,
        wrongLabels:[sqlCode(`SELECT * FROM ${data.table} GROUP BY ${data.valueColumn} ${direction};`),sqlCode(`SELECT * FROM ${data.table} ORDER ${data.valueColumn} ${direction};`),sqlCode(`SELECT * FROM ${data.table} ORDER BY ${data.valueColumn} ${direction==='DESC'?'ASC':'DESC'};`)],
        formula:'SELECT * FROM テーブル名 ORDER BY 列名 ASCまたはDESC;',
        steps:[`並べ替える列：${data.valueColumn}`,`順序：${directionText}（${direction}）`,orderAnswer],
        explanation:'並べ替えにはORDER BYを使います。ASCは昇順、DESCは降順です。'
      }));
    }
    return questions;
  }
  q.push(...generateSqlQuestions());

  // CPU・通信・容量：Ver3.1-4 シード付きランダム生成
  function registerTechnologyTemplates(){
    if(!KenteiTemplateEngine.has('CAL-CPU-CPI')){
      KenteiTemplateEngine.register({
        type:'CAL-CPU-CPI',category:'テクノロジ系',topic:'CPU',
        generate({rng}){
          const cpi=rng.pick([1,2,2.5,4,5,8]);
          const instructions=rng.pick([2,3,4,5,6,8,10]);
          const clockGHz=round(instructions*cpi/10,2);
          const correct=round((clockGHz*10)/cpi,2);
          const wrong=[round(clockGHz*10*cpi,2),round(clockGHz/cpi,2),round(cpi/(clockGHz*10),2)];
          const format=v=>`${round(v,2)}億命令`;
          return{
            values:{clockGHz,cpi},
            question:`クロック周波数が${clockGHz}GHz、平均CPIが${cpi}のCPUは、1秒間に平均何億命令を実行できるか。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'1秒当たり命令数＝クロック周波数÷平均CPI',
            steps:[`${clockGHz}GHz＝${clockGHz*10}億クロック/秒`,`${clockGHz*10}÷${cpi}＝${correct}億命令/秒`],
            explanation:'1秒当たりのクロック数を、1命令に必要な平均クロック数で割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-NET-TIME')){
      KenteiTemplateEngine.register({
        type:'CAL-NET-TIME',category:'テクノロジ系',topic:'通信',
        generate({rng}){
          const mb=rng.step(20,500,20),mbps=rng.pick([10,20,40,50,80,100,200]);
          const efficiency=rng.pick([0.5,0.6,0.7,0.75,0.8,0.9]);
          const correct=round((mb*8)/(mbps*efficiency),1);
          const wrong=[round(mb/(mbps*efficiency),1),round((mb*8)/mbps,1),round((mb*8)*mbps*efficiency,1)];
          const format=v=>`${round(v,1)}秒`;
          return{
            values:{mb,mbps,efficiency},
            question:`${mb}MBのファイルを、伝送速度${mbps}Mbps、伝送効率${efficiency*100}%の回線で送る。伝送時間は何秒か。1MB＝8Mbitとする。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'伝送時間＝データ量（bit）÷実効伝送速度',
            steps:[`データ量＝${mb}×8＝${mb*8}Mbit`,`実効速度＝${mbps}×${efficiency}＝${round(mbps*efficiency,2)}Mbps`,`${mb*8}÷${round(mbps*efficiency,2)}＝${correct}秒`],
            explanation:'Byteをbitへ変換し、伝送効率を反映した実効速度で割ります。'
          };
        }
      });
    }
    if(!KenteiTemplateEngine.has('CAL-STORAGE-IMAGE')){
      KenteiTemplateEngine.register({
        type:'CAL-STORAGE-IMAGE',category:'テクノロジ系',topic:'容量',
        generate({rng}){
          const width=rng.pick([640,800,1024,1280,1920]),height=rng.pick([480,600,768,720,1080]);
          const bits=rng.pick([8,16,24,32]),frames=rng.pick([24,30,60]),seconds=rng.pick([5,10,15,30]);
          const correct=round(width*height*bits*frames*seconds/8000000,1);
          const wrong=[round(width*height*bits*seconds/8000000,1),round(width*height*frames*seconds/8000000,1),round(width*height*bits*frames*seconds/1000000,1)];
          const format=v=>`${round(v,1)}MB`;
          return{
            values:{width,height,bits,frames,seconds},
            question:`解像度${width}×${height}、1画素${bits}ビット、毎秒${frames}フレームの非圧縮動画を${seconds}秒記録する。データ量は約何MBか。1MB＝8,000,000ビットとする。`,
            answer:correct,answerLabel:format(correct),choices:uniqueChoices(correct,wrong,format),
            formula:'データ量＝横×縦×色深度×フレーム数×時間÷8,000,000',
            steps:[`${width}×${height}×${bits}×${frames}×${seconds}`,`＝${(width*height*bits*frames*seconds).toLocaleString()}ビット`,`÷8,000,000＝${correct}MB`],
            explanation:'1画面のビット数にフレーム数と秒数を掛け、最後にMBへ換算します。'
          };
        }
      });
    }
  }
  function generateTechnologyQuestions(){
    registerTechnologyTemplates();
    const types=['CAL-CPU-CPI','CAL-NET-TIME','CAL-STORAGE-IMAGE'],generated=[];
    for(let set=0;set<4;set++)types.forEach(type=>generated.push(KenteiTemplateEngine.generateSafe(type)));
    return generated;
  }
  q.push(...generateTechnologyQuestions());

  // SQL応用：JOIN・GROUP BY・HAVING・集計・INSERT・UPDATE・DELETE
  function generateAdvancedSqlQuestions(){
    const questions=[];
    for(let set=0;set<3;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`SQL-ADV:${seed}:${set}`);

      const joinAnswer='SELECT 社員.氏名, 部署.部署名 FROM 社員 INNER JOIN 部署 ON 社員.部署ID = 部署.部署ID;';
      questions.push(makeTextQuestion({
        id:`SQL-JOIN-${seed}`,seed,templateType:'SQL-JOIN',category:'テクノロジ系',topic:'SQL',
        question:'社員テーブルと部署テーブルを部署IDで内部結合し、社員の氏名と部署名を取得するSQL文はどれか。',
        answerLabel:joinAnswer,
        wrongLabels:[
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 GROUP BY 部署 ON 社員.部署ID = 部署.部署ID;',
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 INNER JOIN 部署 WHERE 社員.部署ID = 部署.部署ID;',
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 INNER JOIN 部署 ON 社員.社員ID = 部署.部署ID;'
        ],
        formula:'SELECT 列 FROM 表1 INNER JOIN 表2 ON 結合条件;',
        steps:['結合する表：社員、部署','結合条件：社員.部署ID = 部署.部署ID',joinAnswer],
        explanation:'INNER JOINの後に結合先テーブルを書き、ONの後に対応する列同士の条件を書きます。'
      }));

      const groupAnswer='SELECT 部署, COUNT(*) FROM 社員 GROUP BY 部署;';
      questions.push(makeTextQuestion({
        id:`SQL-GROUP-${seed}`,seed,templateType:'SQL-GROUP',category:'テクノロジ系',topic:'SQL',
        question:'社員テーブルを部署ごとにまとめ、各部署の人数を取得するSQL文はどれか。',
        answerLabel:groupAnswer,
        wrongLabels:[
          'SELECT 部署, COUNT(*) FROM 社員 ORDER BY 部署;',
          'SELECT 部署, COUNT(*) FROM 社員 WHERE 部署;',
          'SELECT COUNT(部署) FROM 社員 HAVING 部署;'
        ],
        formula:'SELECT グループ列, 集計関数 FROM テーブル GROUP BY グループ列;',
        steps:['グループ列：部署','集計：COUNT(*)',groupAnswer],
        explanation:'部署ごとにまとめるにはGROUP BYを使い、各グループの件数はCOUNT(*)で求めます。'
      }));

      const limit=rng.int(2,8);
      const havingAnswer=`SELECT 部署, COUNT(*) FROM 社員 GROUP BY 部署 HAVING COUNT(*) >= ${limit};`;
      questions.push(makeTextQuestion({
        id:`SQL-HAVING-${seed}`,seed,templateType:'SQL-HAVING',category:'テクノロジ系',topic:'SQL',
        question:`社員テーブルを部署ごとに集計し、人数が${limit}人以上の部署だけを取得するSQL文はどれか。`,
        answerLabel:havingAnswer,
        wrongLabels:[
          `SELECT 部署, COUNT(*) FROM 社員 WHERE COUNT(*) >= ${limit} GROUP BY 部署;`,
          `SELECT 部署, COUNT(*) FROM 社員 GROUP BY 部署 WHERE COUNT(*) >= ${limit};`,
          `SELECT 部署, COUNT(*) FROM 社員 HAVING COUNT(*) >= ${limit};`
        ],
        formula:'GROUP BYで集計した結果の条件指定にはHAVINGを使う',
        steps:['部署ごとにGROUP BY','人数をCOUNT(*)で集計',`HAVING COUNT(*) >= ${limit}`,havingAnswer],
        explanation:'集計前の行条件はWHERE、GROUP BY後の集計結果に対する条件はHAVINGを使います。'
      }));

      const aggregate=rng.pick([
        {name:'平均',func:'AVG',column:'価格'},
        {name:'合計',func:'SUM',column:'金額'},
        {name:'最大値',func:'MAX',column:'価格'},
        {name:'最小値',func:'MIN',column:'価格'}
      ]);
      const table=aggregate.column==='金額'?'注文':'商品';
      const aggregateAnswer=`SELECT ${aggregate.func}(${aggregate.column}) FROM ${table};`;
      questions.push(makeTextQuestion({
        id:`SQL-AGG-${seed}`,seed,templateType:'SQL-AGG',category:'テクノロジ系',topic:'SQL',
        question:`${table}テーブルの${aggregate.column}の${aggregate.name}を求めるSQL文はどれか。`,
        answerLabel:aggregateAnswer,
        wrongLabels:[
          `SELECT COUNT(${aggregate.column}) FROM ${table};`,
          `SELECT ${aggregate.column}(${aggregate.func}) FROM ${table};`,
          `SELECT ${aggregate.func}(*) FROM ${table};`
        ],
        formula:'SELECT 集計関数(列名) FROM テーブル名;',
        steps:[`集計関数：${aggregate.func}`,`対象列：${aggregate.column}`,aggregateAnswer],
        explanation:'求めたい集計内容に対応する関数を列名へ適用します。'
      }));

      const insertAnswer="INSERT INTO 商品 (商品番号, 商品名, 価格) VALUES (101, 'マウス', 3000);";
      questions.push(makeTextQuestion({
        id:`SQL-INSERT-${seed}`,seed,templateType:'SQL-INSERT',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルに、商品番号101、商品名「マウス」、価格3000の行を追加するSQL文はどれか。',
        answerLabel:insertAnswer,
        wrongLabels:[
          "UPDATE 商品 (商品番号, 商品名, 価格) VALUES (101, 'マウス', 3000);",
          "INSERT 商品 INTO (商品番号, 商品名, 価格) VALUES (101, 'マウス', 3000);",
          "INSERT INTO 商品 SET (101, 'マウス', 3000);"
        ],
        formula:'INSERT INTO テーブル名 (列名...) VALUES (値...);',
        steps:['追加先：商品','列と値の順序を対応させる',insertAnswer],
        explanation:'行の追加にはINSERT INTOを使い、列名とVALUES内の値を同じ順序で対応させます。'
      }));

      const updateAnswer="UPDATE 商品 SET 価格 = 3500 WHERE 商品番号 = 101;";
      questions.push(makeTextQuestion({
        id:`SQL-UPDATE-${seed}`,seed,templateType:'SQL-UPDATE',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルで、商品番号101の価格を3500へ変更するSQL文はどれか。',
        answerLabel:updateAnswer,
        wrongLabels:[
          "UPDATE 商品 WHERE 商品番号 = 101 SET 価格 = 3500;",
          "INSERT INTO 商品 SET 価格 = 3500 WHERE 商品番号 = 101;",
          "UPDATE 商品 SET 商品番号 = 101 WHERE 価格 = 3500;"
        ],
        formula:'UPDATE テーブル名 SET 列名 = 値 WHERE 条件;',
        steps:['更新先：商品','変更内容：価格 = 3500','対象：商品番号 = 101',updateAnswer],
        explanation:'UPDATEの後に表、SETで変更内容、WHEREで変更対象の行を指定します。'
      }));

      const deleteAnswer='DELETE FROM 商品 WHERE 商品番号 = 101;';
      questions.push(makeTextQuestion({
        id:`SQL-DELETE-${seed}`,seed,templateType:'SQL-DELETE',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルから、商品番号101の行だけを削除するSQL文はどれか。',
        answerLabel:deleteAnswer,
        wrongLabels:[
          'DELETE 商品 FROM WHERE 商品番号 = 101;',
          'DROP FROM 商品 WHERE 商品番号 = 101;',
          'DELETE FROM 商品 SET 商品番号 = 101;'
        ],
        formula:'DELETE FROM テーブル名 WHERE 条件;',
        steps:['削除先：商品','対象：商品番号 = 101',deleteAnswer],
        explanation:'特定の行を削除するときはDELETE FROMとWHEREを使います。WHEREを省くと全行が対象になります。'
      }));
    }
    return questions;
  }
  q.push(...generateAdvancedSqlQuestions());



  // Ver3.2-3 SQL発展：外部結合・集合演算・条件・サブクエリ
  function generateExtendedSqlQuestions(){
    const questions=[];

    for(let set=0;set<3;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`SQL-EXT:${seed}:${set}`);

      const leftAnswer='SELECT 顧客.顧客名, 注文.注文番号 FROM 顧客 LEFT JOIN 注文 ON 顧客.顧客ID = 注文.顧客ID;';
      questions.push(makeTextQuestion({
        id:`SQL-LEFT-${seed}`,seed,templateType:'SQL-LEFT',category:'テクノロジ系',topic:'SQL',
        question:'注文がない顧客も含めて、全顧客の顧客名と注文番号を取得するSQL文はどれか。',
        answerLabel:leftAnswer,
        wrongLabels:[
          'SELECT 顧客.顧客名, 注文.注文番号 FROM 顧客 INNER JOIN 注文 ON 顧客.顧客ID = 注文.顧客ID;',
          'SELECT 顧客.顧客名, 注文.注文番号 FROM 顧客 RIGHT JOIN 注文 ON 顧客.顧客ID = 注文.顧客ID;',
          'SELECT 顧客.顧客名, 注文.注文番号 FROM 顧客 CROSS JOIN 注文;'
        ],
        formula:'左側の表を全件残す：LEFT JOIN',
        steps:['左側の表：顧客','結合先：注文','顧客IDで結合',leftAnswer],
        explanation:'注文が存在しない顧客も残したいので、顧客を左側に置いてLEFT JOINを使います。'
      }));

      const rightAnswer='SELECT 社員.氏名, 部署.部署名 FROM 社員 RIGHT JOIN 部署 ON 社員.部署ID = 部署.部署ID;';
      questions.push(makeTextQuestion({
        id:`SQL-RIGHT-${seed}`,seed,templateType:'SQL-RIGHT',category:'テクノロジ系',topic:'SQL',
        question:'所属社員がいない部署も含めて、全部署と社員名を取得するSQL文はどれか。',
        answerLabel:rightAnswer,
        wrongLabels:[
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 INNER JOIN 部署 ON 社員.部署ID = 部署.部署ID;',
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 LEFT JOIN 部署 ON 社員.部署ID = 部署.部署ID;',
          'SELECT 社員.氏名, 部署.部署名 FROM 社員 CROSS JOIN 部署;'
        ],
        formula:'右側の表を全件残す：RIGHT JOIN',
        steps:['右側の表：部署','部署を全件残す','部署IDで結合',rightAnswer],
        explanation:'全部署を残したいので、部署を右側に置いてRIGHT JOINを使います。'
      }));

      const crossAnswer='SELECT 商品.商品名, 店舗.店舗名 FROM 商品 CROSS JOIN 店舗;';
      questions.push(makeTextQuestion({
        id:`SQL-CROSS-${seed}`,seed,templateType:'SQL-CROSS',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルの全商品と店舗テーブルの全店舗の、すべての組合せを取得するSQL文はどれか。',
        answerLabel:crossAnswer,
        wrongLabels:[
          'SELECT 商品.商品名, 店舗.店舗名 FROM 商品 INNER JOIN 店舗;',
          'SELECT 商品.商品名, 店舗.店舗名 FROM 商品 LEFT JOIN 店舗;',
          'SELECT 商品.商品名, 店舗.店舗名 FROM 商品 UNION 店舗;'
        ],
        formula:'直積を求める：CROSS JOIN',
        steps:['全商品と全店舗の組合せを作る',crossAnswer],
        explanation:'結合条件なしですべての組合せを作るときはCROSS JOINを使います。'
      }));

      const unionAnswer='SELECT メールアドレス FROM 顧客 UNION SELECT メールアドレス FROM 会員;';
      questions.push(makeTextQuestion({
        id:`SQL-UNION-${seed}`,seed,templateType:'SQL-UNION',category:'テクノロジ系',topic:'SQL',
        question:'顧客テーブルと会員テーブルのメールアドレスを、重複を除いて一つの結果にまとめるSQL文はどれか。',
        answerLabel:unionAnswer,
        wrongLabels:[
          'SELECT メールアドレス FROM 顧客 UNION ALL SELECT メールアドレス FROM 会員;',
          'SELECT メールアドレス FROM 顧客 INNER JOIN 会員;',
          'SELECT DISTINCT メールアドレス FROM 顧客, 会員;'
        ],
        formula:'重複を除いて結果を結合：UNION',
        steps:['両方のSELECTで列数と型を合わせる','UNIONで結果を結合',unionAnswer],
        explanation:'UNIONは二つの検索結果をまとめ、重複行を除きます。UNION ALLは重複を残します。'
      }));

      const distinctAnswer='SELECT DISTINCT 部署 FROM 社員;';
      questions.push(makeTextQuestion({
        id:`SQL-DISTINCT-${seed}`,seed,templateType:'SQL-DISTINCT',category:'テクノロジ系',topic:'SQL',
        question:'社員テーブルから、重複を除いた部署名の一覧を取得するSQL文はどれか。',
        answerLabel:distinctAnswer,
        wrongLabels:[
          'SELECT UNIQUE 部署 FROM 社員;',
          'SELECT 部署 FROM 社員 GROUP;',
          'SELECT 部署 DISTINCT FROM 社員;'
        ],
        formula:'重複を除く：SELECT DISTINCT 列名',
        steps:['対象列：部署','DISTINCTで重複を除外',distinctAnswer],
        explanation:'検索結果の重複行を除くにはSELECTの直後にDISTINCTを書きます。'
      }));

      const prefix=rng.pick(['山','田','佐','中']);
      const likeAnswer=`SELECT * FROM 社員 WHERE 氏名 LIKE '${prefix}%';`;
      questions.push(makeTextQuestion({
        id:`SQL-LIKE-${seed}`,seed,templateType:'SQL-LIKE',category:'テクノロジ系',topic:'SQL',
        question:`社員テーブルから、氏名が「${prefix}」で始まる社員を取得するSQL文はどれか。`,
        answerLabel:likeAnswer,
        wrongLabels:[
          `SELECT * FROM 社員 WHERE 氏名 = '${prefix}%';`,
          `SELECT * FROM 社員 WHERE 氏名 LIKE '%${prefix}';`,
          `SELECT * FROM 社員 WHERE 氏名 IN '${prefix}%';`
        ],
        formula:'前方一致：LIKE \'文字列%\'',
        steps:[`先頭文字：${prefix}`,'後ろに%を付ける',likeAnswer],
        explanation:'%は0文字以上の任意文字を表します。文字列の後ろに付けると前方一致になります。'
      }));

      const low=rng.step(1000,5000,500);
      const high=low+rng.step(1000,5000,500);
      const betweenAnswer=`SELECT * FROM 商品 WHERE 価格 BETWEEN ${low} AND ${high};`;
      questions.push(makeTextQuestion({
        id:`SQL-BETWEEN-${seed}`,seed,templateType:'SQL-BETWEEN',category:'テクノロジ系',topic:'SQL',
        question:`商品テーブルから、価格が${low.toLocaleString()}以上${high.toLocaleString()}以下の商品を取得するSQL文はどれか。`,
        answerLabel:betweenAnswer,
        wrongLabels:[
          `SELECT * FROM 商品 WHERE 価格 BETWEEN ${high} AND ${low};`,
          `SELECT * FROM 商品 WHERE 価格 > ${low} OR 価格 < ${high};`,
          `SELECT * FROM 商品 HAVING 価格 BETWEEN ${low} AND ${high};`
        ],
        formula:'範囲条件：BETWEEN 下限 AND 上限',
        steps:[`下限：${low}`,`上限：${high}`,betweenAnswer],
        explanation:'BETWEENは下限と上限を含む範囲条件です。'
      }));

      const inAnswer="SELECT * FROM 社員 WHERE 部署 IN ('営業部', '開発部', '総務部');";
      questions.push(makeTextQuestion({
        id:`SQL-IN-${seed}`,seed,templateType:'SQL-IN',category:'テクノロジ系',topic:'SQL',
        question:'社員テーブルから、部署が営業部・開発部・総務部のいずれかである社員を取得するSQL文はどれか。',
        answerLabel:inAnswer,
        wrongLabels:[
          "SELECT * FROM 社員 WHERE 部署 = ('営業部', '開発部', '総務部');",
          "SELECT * FROM 社員 WHERE 部署 BETWEEN '営業部' AND '総務部';",
          "SELECT * FROM 社員 HAVING 部署 IN ('営業部', '開発部', '総務部');"
        ],
        formula:'複数候補のいずれか：IN (値1, 値2, ...)',
        steps:['候補を括弧内へ並べる',inAnswer],
        explanation:'同じ列を複数の値と比較するときはIN句を使うと簡潔に書けます。'
      }));

      const existsAnswer='SELECT * FROM 顧客 WHERE EXISTS (SELECT 1 FROM 注文 WHERE 注文.顧客ID = 顧客.顧客ID);';
      questions.push(makeTextQuestion({
        id:`SQL-EXISTS-${seed}`,seed,templateType:'SQL-EXISTS',category:'テクノロジ系',topic:'SQL',
        question:'1件以上の注文が存在する顧客だけを取得するSQL文はどれか。',
        answerLabel:existsAnswer,
        wrongLabels:[
          'SELECT * FROM 顧客 WHERE IN (SELECT 顧客ID FROM 注文);',
          'SELECT * FROM 顧客 HAVING EXISTS (SELECT 1 FROM 注文);',
          'SELECT * FROM 顧客 WHERE EXISTS 注文.顧客ID = 顧客.顧客ID;'
        ],
        formula:'関連行の存在確認：WHERE EXISTS (サブクエリ)',
        steps:['注文テーブルに対応行があるか確認',existsAnswer],
        explanation:'EXISTSはサブクエリが1行以上返すかどうかを判定します。'
      }));

      const subAnswer='SELECT * FROM 商品 WHERE 価格 > (SELECT AVG(価格) FROM 商品);';
      questions.push(makeTextQuestion({
        id:`SQL-SUBQUERY-${seed}`,seed,templateType:'SQL-SUBQUERY',category:'テクノロジ系',topic:'SQL',
        question:'商品テーブルから、全商品の平均価格より高い商品を取得するSQL文はどれか。',
        answerLabel:subAnswer,
        wrongLabels:[
          'SELECT * FROM 商品 WHERE 価格 > AVG(価格);',
          'SELECT * FROM 商品 HAVING 価格 > (SELECT AVG(価格) FROM 商品);',
          'SELECT AVG(価格) FROM 商品 WHERE 価格 > 商品;'
        ],
        formula:'集計結果を条件に使う：WHERE 列 比較演算子 (サブクエリ)',
        steps:['サブクエリで平均価格を求める','外側のWHEREで価格と比較',subAnswer],
        explanation:'平均値を先にサブクエリで求め、その結果と各商品の価格を比較します。'
      }));
    }

    return questions;
  }
  q.push(...generateExtendedSqlQuestions());

  // Ver3.2-2 追加計算：進数・ビット・IP・アローダイアグラム・FP・圧縮率・ページ置換
  function baseLabel(base){
    return base===2?'2進数':base===8?'8進数':base===16?'16進数':'10進数';
  }

  function formatBase(value,base){
    return Number(value).toString(base).toUpperCase();
  }

  function generateBaseQuestions(){
    const generated=[];
    for(let set=0;set<4;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`BASE:${seed}`);
      const fromBase=rng.pick([2,8,16]);
      const value=rng.int(10,255);
      const source=formatBase(value,fromBase);
      const correct=`${value}`;
      generated.push(makeTextQuestion({
        id:`CAL-BASE-TO10-${seed}`,seed,templateType:'CAL-BASE-TO10',category:'テクノロジ系',topic:'進数変換',
        question:`${fromBase}進数 ${source} を10進数に変換した値はどれか。`,
        answerLabel:correct,
        wrongLabels:[`${value+fromBase}`,`${Math.max(0,value-fromBase)}`,`${parseInt(source,10)||value*fromBase}`],
        formula:`各桁×${fromBase}の位の重みを合計する`,
        steps:[`${source}（${baseLabel(fromBase)}）＝${value}（10進数）`],
        explanation:'進数の各桁に、その位置に対応する基数の累乗を掛けて合計します。'
      }));

      const toBase=rng.pick([2,8,16]);
      const decimal=rng.int(10,255);
      const answer=formatBase(decimal,toBase);
      generated.push(makeTextQuestion({
        id:`CAL-BASE-FROM10-${seed}`,seed,templateType:'CAL-BASE-FROM10',category:'テクノロジ系',topic:'進数変換',
        question:`10進数 ${decimal} を${toBase}進数に変換した値はどれか。`,
        answerLabel:answer,
        wrongLabels:[
          formatBase(decimal+1,toBase),
          formatBase(Math.max(0,decimal-1),toBase),
          formatBase(decimal+toBase,toBase)
        ],
        formula:`10進数を${toBase}で繰り返し割り、余りを逆順に並べる`,
        steps:[`${decimal}（10進数）＝${answer}（${baseLabel(toBase)}）`],
        explanation:'変換先の基数で繰り返し割り、余りを下から上へ読みます。'
      }));

      const a=rng.int(1,15),b=rng.int(1,15),op=rng.pick(['AND','OR','XOR']);
      const result=op==='AND'?(a&b):op==='OR'?(a|b):(a^b);
      const answerBits=result.toString(2).padStart(4,'0');
      const bitCandidates=[
        a&b,
        a|b,
        a^b,
        (~result)&15,
        (result+1)&15,
        (result+2)&15,
        (result+4)&15,
        (result^1)&15,
        (result^8)&15
      ].map(value=>value.toString(2).padStart(4,'0'));
      const bitWrong=[...new Set(bitCandidates.filter(value=>value!==answerBits))].slice(0,3);
      generated.push(makeTextQuestion({
        id:`CAL-BIT-${seed}`,seed,templateType:'CAL-BIT',category:'テクノロジ系',topic:'ビット演算',
        question:`4ビットの値 ${a.toString(2).padStart(4,'0')} と ${b.toString(2).padStart(4,'0')} に ${op} 演算を行った結果はどれか。`,
        answerLabel:answerBits,
        wrongLabels:bitWrong,
        formula:`各ビットごとに${op}の真理値を適用する`,
        steps:[`${a.toString(2).padStart(4,'0')} ${op} ${b.toString(2).padStart(4,'0')} ＝ ${answerBits}`],
        explanation:'ANDは両方1、ORはいずれか1、XORは異なるとき1になります。'
      }));
    }
    return generated;
  }
  q.push(...generateBaseQuestions());

  function generateNetworkQuestions(){
    const generated=[];
    for(let set=0;set<4;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`IP:${seed}`);
      const prefix=rng.pick([24,25,26,27,28]);
      const hostBits=32-prefix;
      const addresses=2**hostBits;
      const usable=addresses-2;
      generated.push(makeTextQuestion({
        id:`CAL-SUBNET-HOST-${seed}`,seed,templateType:'CAL-SUBNET-HOST',category:'テクノロジ系',topic:'IP・サブネット',
        question:`IPv4ネットワーク /${prefix} で、通常ホストに割り当て可能なIPアドレス数はいくつか。`,
        answerLabel:`${usable}個`,
        wrongLabels:[`${addresses}個`,`${addresses-1}個`,`${2**prefix-2}個`],
        formula:'利用可能ホスト数＝2のホスト部ビット数乗－2',
        steps:[`ホスト部＝32－${prefix}＝${hostBits}ビット`,`2^${hostBits}－2＝${usable}個`],
        explanation:'ネットワークアドレスとブロードキャストアドレスを除くため2を引きます。'
      }));

      const maskOctet=256-2**(32-prefix);
      const mask=prefix===24?'255.255.255.0':`255.255.255.${maskOctet}`;
      const validMasks=[
        '255.255.255.0',
        '255.255.255.128',
        '255.255.255.192',
        '255.255.255.224',
        '255.255.255.240',
        '255.255.255.248',
        '255.255.255.252'
      ];
      const maskWrong=rng.shuffle(validMasks.filter(value=>value!==mask)).slice(0,3);
      generated.push(makeTextQuestion({
        id:`CAL-SUBNET-MASK-${seed}`,seed,templateType:'CAL-SUBNET-MASK',category:'テクノロジ系',topic:'IP・サブネット',
        question:`CIDR表記 /${prefix} に対応するサブネットマスクはどれか。`,
        answerLabel:mask,
        wrongLabels:maskWrong,
        formula:'プレフィックス長のビットを左から1、それ以降を0にする',
        steps:[`/${prefix}＝先頭${prefix}ビットが1`,`サブネットマスク＝${mask}`],
        explanation:'CIDRの数だけ左から1を並べ、8ビットごとに10進数へ変換します。'
      }));
    }
    return generated;
  }
  q.push(...generateNetworkQuestions());

  function generateManagementCalculationQuestions(){
    const generated=[];
    for(let set=0;set<4;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`MGMT:${seed}`);

      const a=rng.int(2,8),b=rng.int(2,8),c=rng.int(2,8),d=rng.int(2,8);
      const branch1=a+b,branch2=c+d,critical=Math.max(branch1,branch2);
      const arrowCandidates=[branch1+branch2,Math.min(branch1,branch2),Math.max(a,b,c,d),critical+1,Math.max(1,critical-1)];
      const arrowWrong=[...new Set(arrowCandidates.filter(value=>value!==critical))].slice(0,3).map(value=>`${value}日`);
      generated.push(makeTextQuestion({
        id:`CAL-ARROW-${seed}`,seed,templateType:'CAL-ARROW',category:'マネジメント系',topic:'アローダイアグラム',
        question:`開始後、作業A（${a}日）→B（${b}日）と、作業C（${c}日）→D（${d}日）を並行して行い、両方の完了後に終了する。最短所要日数は何日か。`,
        answerLabel:`${critical}日`,
        wrongLabels:arrowWrong,
        formula:'並行経路がある場合、最も長い経路がクリティカルパス',
        steps:[`経路A→B＝${a}+${b}＝${branch1}日`,`経路C→D＝${c}+${d}＝${branch2}日`,`長い方＝${critical}日`],
        explanation:'並行する経路は同時進行できるため、合計ではなく最長経路の時間が全体の所要時間になります。'
      }));

      const inputs=rng.int(2,10),outputs=rng.int(2,10),queries=rng.int(1,8),files=rng.int(1,8),interfaces=rng.int(1,6);
      const weights={inputs:4,outputs:5,queries:4,files:10,interfaces:7};
      const fp=inputs*weights.inputs+outputs*weights.outputs+queries*weights.queries+files*weights.files+interfaces*weights.interfaces;
      const fpCandidates=[
        inputs+outputs+queries+files+interfaces,
        inputs*4+outputs*5+queries*4+files*7+interfaces*10,
        fp+inputs+outputs,
        fp-files,
        fp+interfaces,
        fp+10
      ];
      const fpWrong=[...new Set(fpCandidates.filter(value=>value!==fp))].slice(0,3).map(value=>`${value}FP`);
      generated.push(makeTextQuestion({
        id:`CAL-FP-${seed}`,seed,templateType:'CAL-FP',category:'マネジメント系',topic:'ファンクションポイント',
        question:`入力${inputs}件（重み4）、出力${outputs}件（重み5）、照会${queries}件（重み4）、内部ファイル${files}件（重み10）、外部インタフェース${interfaces}件（重み7）のとき、未調整FPはいくつか。`,
        answerLabel:`${fp}FP`,
        wrongLabels:fpWrong,
        formula:'FP＝各機能数×対応する重みの合計',
        steps:[`${inputs}×4＋${outputs}×5＋${queries}×4＋${files}×10＋${interfaces}×7＝${fp}FP`],
        explanation:'機能の種類ごとに件数と重みを掛け、すべて合計します。'
      }));

      const original=rng.step(20,500,10),rate=rng.pick([20,25,30,40,50,60,75]);
      const compressed=round(original*rate/100,1);
      const compressCandidates=[
        round(original*(100-rate)/100,1),
        round(original/rate,1),
        round(original*rate,1),
        round(original-compressed,1),
        round(compressed+original*0.1,1)
      ];
      const compressWrong=[...new Set(compressCandidates.filter(value=>value!==compressed))].slice(0,3).map(value=>`${value}MB`);
      generated.push(makeTextQuestion({
        id:`CAL-COMPRESS-${seed}`,seed,templateType:'CAL-COMPRESS',category:'テクノロジ系',topic:'圧縮率',
        question:`${original}MBのデータを、圧縮後の大きさが元の${rate}%になるように圧縮した。圧縮後のデータ量は何MBか。`,
        answerLabel:`${compressed}MB`,
        wrongLabels:compressWrong,
        formula:'圧縮後データ量＝元データ量×圧縮後割合',
        steps:[`${original}×${rate}/100＝${compressed}MB`],
        explanation:'「元の何%になるか」なので、その割合を元データ量へ掛けます。'
      }));
    }
    return generated;
  }
  q.push(...generateManagementCalculationQuestions());

  function pageFaultCount(sequence,frames,method){
    const memory=[],lastUsed=new Map();
    let faults=0;
    sequence.forEach((page,index)=>{
      if(memory.includes(page)){
        lastUsed.set(page,index);
        return;
      }
      faults++;
      if(memory.length<frames){
        memory.push(page);
      }else if(method==='FIFO'){
        memory.shift();
        memory.push(page);
      }else{
        let victim=memory[0];
        memory.forEach(p=>{
          if((lastUsed.get(p)??-1)<(lastUsed.get(victim)??-1))victim=p;
        });
        memory[memory.indexOf(victim)]=page;
      }
      lastUsed.set(page,index);
    });
    return faults;
  }

  function generatePageReplacementQuestions(){
    const generated=[];
    for(let set=0;set<4;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`PAGE:${seed}`);
      const frames=rng.pick([2,3,4]),method=rng.pick(['FIFO','LRU']);
      const sequence=Array.from({length:8},()=>rng.int(1,5));
      const correct=pageFaultCount(sequence,frames,method);
      const pageWrongValues=[
        Math.max(1,correct-1),
        correct+1,
        Math.max(1,correct-2),
        correct+2,
        new Set(sequence).size,
        sequence.length
      ];
      const pageWrong=[...new Set(pageWrongValues.filter(value=>value!==correct))]
        .slice(0,3)
        .map(value=>`${value}回`);
      generated.push(makeTextQuestion({
        id:`CAL-PAGE-${seed}`,seed,templateType:'CAL-PAGE',category:'テクノロジ系',topic:'ページ置換',
        question:`ページ枠が${frames}個あり、参照列が「${sequence.join(' → ')}」である。初期状態を空とし、${method}方式を用いたときのページフォールト回数はいくつか。`,
        answerLabel:`${correct}回`,
        wrongLabels:pageWrong,
        formula:method==='FIFO'?'FIFO：最初に入ったページから置換':'LRU：最後の参照が最も古いページを置換',
        steps:[`参照列を左から処理し、メモリにないページの読み込み回数を数える`,`ページフォールト＝${correct}回`],
        explanation:`${method}の置換規則に従い、参照時にページが枠内に存在しない回数を数えます。`
      }));
    }
    return generated;
  }
  q.push(...generatePageReplacementQuestions());


  // Ver3.2-5 逆ポーランド記法
  function evaluateRpn(tokens){
    const stack=[];
    for(const token of tokens){
      if(/^-?\d+(?:\.\d+)?$/.test(String(token))){
        stack.push(Number(token));
        continue;
      }
      const right=stack.pop();
      const left=stack.pop();
      if(token==='+')stack.push(left+right);
      else if(token==='-')stack.push(left-right);
      else if(token==='*')stack.push(left*right);
      else if(token==='/')stack.push(left/right);
    }
    return stack[0];
  }

  function generateRpnQuestions(){
    const generated=[];
    const forms=[
      {
        infix:(a,b,c)=>`（${a}＋${b}）×${c}`,
        tokens:(a,b,c)=>[a,b,'+',c,'*'],
        wrong:(a,b,c)=>[
          `${a} ${b} ${c} + *`,
          `${a} ${b} + * ${c}`,
          `${a} ${b} ${c} * +`
        ]
      },
      {
        infix:(a,b,c)=>`${a}＋${b}×${c}`,
        tokens:(a,b,c)=>[a,b,c,'*','+'],
        wrong:(a,b,c)=>[
          `${a} ${b} + ${c} *`,
          `${a} ${b} ${c} + *`,
          `${a} ${b} * ${c} +`
        ]
      },
      {
        infix:(a,b,c)=>`（${a}－${b}）÷${c}`,
        tokens:(a,b,c)=>[a,b,'-',c,'/'],
        wrong:(a,b,c)=>[
          `${a} ${b} ${c} - /`,
          `${a} ${b} - / ${c}`,
          `${a} ${b} ${c} / -`
        ]
      },
      {
        infix:(a,b,c)=>`${a}×（${b}＋${c}）`,
        tokens:(a,b,c)=>[a,b,c,'+','*'],
        wrong:(a,b,c)=>[
          `${a} ${b} * ${c} +`,
          `${a} ${b} ${c} * +`,
          `${a} ${b} + ${c} *`
        ]
      }
    ];

    for(let set=0;set<4;set++){
      const seed=KenteiRandomEngine.createSeed();
      const rng=KenteiRandomEngine.create(`RPN:${seed}:${set}`);
      const form=rng.pick(forms);
      let a=rng.int(2,9),b=rng.int(1,8),c=rng.int(2,6);

      // 除算形式は整数になるよう調整
      if(form===forms[2]){
        const difference=c*rng.int(1,8);
        a=difference+b;
      }

      const tokens=form.tokens(a,b,c);
      const postfix=tokens.join(' ');
      const wrong=[...new Set(form.wrong(a,b,c).filter(value=>value!==postfix))].slice(0,3);

      generated.push(makeTextQuestion({
        id:`CAL-RPN-CONVERT-${seed}`,seed,templateType:'CAL-RPN-CONVERT',
        category:'テクノロジ系',topic:'逆ポーランド記法',
        question:`式 ${form.infix(a,b,c)} を逆ポーランド記法（後置記法）で表したものはどれか。`,
        answerLabel:postfix,
        wrongLabels:wrong,
        formula:'演算子を、その演算対象となる値の後ろへ置く',
        steps:[
          `通常の式：${form.infix(a,b,c)}`,
          `逆ポーランド記法：${postfix}`
        ],
        explanation:'括弧や優先順位を先に処理し、各演算子を二つの演算対象の後ろへ移動します。'
      }));

      const value=round(evaluateRpn(tokens),2);
      const evalCandidates=[
        value+1,
        value-1,
        a+b*c,
        (a+b)*c,
        a*(b+c),
        a-b/c
      ].map(number=>round(number,2));
      const evalWrong=[...new Set(evalCandidates.filter(number=>number!==value))]
        .slice(0,3)
        .map(number=>String(number));

      generated.push(makeTextQuestion({
        id:`CAL-RPN-EVAL-${seed}`,seed,templateType:'CAL-RPN-EVAL',
        category:'テクノロジ系',topic:'逆ポーランド記法',
        question:`逆ポーランド記法「${postfix}」を計算した結果はどれか。`,
        answerLabel:String(value),
        wrongLabels:evalWrong,
        formula:'左から読み、数値はスタックへ積み、演算子では上の二つを取り出して計算する',
        steps:[
          `式：${postfix}`,
          `スタックを用いて順番に計算`,
          `結果：${value}`
        ],
        explanation:'数値をスタックへ積み、演算子が出たら直前の二つの値を取り出して計算し、結果を再び積みます。'
      }));
    }
    return generated;
  }
  q.push(...generateRpnQuestions());

  window.CALCULATION_QUESTIONS=q;
  const topicCounts=q.reduce((counts,item)=>{
    counts[item.topic]=(counts[item.topic]||0)+1;
    return counts;
  },{});

  const invalidItems=q.filter(item=>{
    const labels=Array.isArray(item.choices)?item.choices.map(choice=>String(choice.label).trim()):[];
    return !item.id ||
      !item.topic ||
      !String(item.question||'').trim() ||
      labels.length!==4 ||
      labels.some(label=>!label) ||
      new Set(labels).size!==4 ||
      labels.filter(label=>label===String(item.answerLabel).trim()).length!==1 ||
      !Array.isArray(item.steps) ||
      item.steps.length===0 ||
      !String(item.formula||'').trim() ||
      !String(item.explanation||'').trim();
  });

  window.CALCULATION_VALIDATION={
    total:q.length,
    topicCounts,
    invalidCount:invalidItems.length,
    invalidIds:invalidItems.map(item=>item.id),
    valid:invalidItems.length===0
  };

  if(!window.CALCULATION_VALIDATION.valid){
    throw new Error('計算問題データの検証に失敗しました');
  }
})();
