window.KenteiConfusionData=(()=>{
  const groups=[
    ['ERP','CRM','SCM','SFA'],
    ['MTBF','MTTR','RAS','稼働率','可用性','信頼性'],
    ['DNS','DHCP','NTP','SMTP','POP3','IMAP'],
    ['SMTP','POP3','IMAP','MIME'],
    ['SPF','DKIM','DMARC','S/MIME'],
    ['CRC','パリティ','ハミング符号','チェックディジット'],
    ['ロールバック','ロールフォワード','コミット','チェックポイント'],
    ['インスタンス化','カプセル化','汎化','特化'],
    ['アクティビティ図','シーケンス図','ステートマシン図','クラス図','ユースケース図'],
    ['トップダウンテスト','ボトムアップテスト','スタブ','ドライバ'],
    ['スタック','キュー','プッシュ','ポップ'],
    ['FIFO','LRU','LFU','ページ置換'],
    ['DRAM','SRAM','SDRAM','ROM'],
    ['マルウェア','ウイルス','ワーム','トロイの木馬','ランサムウェア'],
    ['フィッシング','ファーミング','スミッシング','標的型攻撃'],
    ['ゼロデイ攻撃','サイドチャネル攻撃','辞書攻撃','総当たり攻撃'],
    ['公開鍵暗号方式','共通鍵暗号方式','ハイブリッド暗号方式','電子署名'],
    ['認証','認可','アクセス制御','多要素認証'],
    ['WAF','ファイアウォール','IDS','IPS'],
    ['SQLインジェクション','クロスサイトスクリプティング','CSRF','ディレクトリトラバーサル'],
    ['バックアップ','アーカイブ','レプリケーション','ミラーリング'],
    ['RAID0','RAID1','RAID5','RAID6'],
    ['正規化','主キー','外部キー','候補キー'],
    ['トランザクション','排他制御','デッドロック','コミット'],
    ['WHERE','HAVING','GROUP BY','ORDER BY'],
    ['INNER JOIN','LEFT JOIN','RIGHT JOIN','CROSS JOIN'],
    ['SELECT','INSERT','UPDATE','DELETE'],
    ['COUNT','SUM','AVG','MAX','MIN'],
    ['UNION','DISTINCT','LIKE','BETWEEN','IN','EXISTS'],
    ['OJT','off-JT','e-ラーニング','ロールプレイング','ケーススタディ'],
    ['職能別組織','事業部制','マトリックス組織','プロジェクト組織','カンパニー制'],
    ['CEO','CIO','CTO','CFO','COO'],
    ['PDCA','OODAループ','BCP','BCM'],
    ['CSR','SRI','SDGs','ESG'],
    ['カーボンニュートラル','ゼロエミッション','カーボンフットプリント','グリーンIT'],
    ['Society5.0','超スマート社会','第4次産業革命','デジタルトランスフォーメーション'],
    ['パレート図','ヒストグラム','散布図','管理図','特性要因図'],
    ['箱ひげ図','レーダーチャート','モザイク図','ヒートマップ'],
    ['最小二乗法','回帰分析','相関分析','仮説検定'],
    ['第1種の誤り','第2種の誤り','有意水準','帰無仮説'],
    ['データウェアハウス','データマート','データレイク','データベース'],
    ['データマイニング','テキストマイニング','BI','ビッグデータ'],
    ['売上総利益','営業利益','経常利益','税引前当期純利益','当期純利益'],
    ['固定費','変動費','損益分岐点','限界利益'],
    ['貸借対照表','損益計算書','キャッシュフロー計算書','株主資本等変動計算書'],
    ['ROE','ROI','ROA','自己資本比率'],
    ['機会損失','埋没原価','限界利益','損益分岐点'],
    ['BYOD','COPE','CYOD','シャドーIT'],
    ['IoT','M2M','O2O','OMO'],
    ['アクセシビリティ','ユーザビリティ','ユニバーサルデザイン','デジタルディバイド'],
    ['レコメンド','フィンテック','アダプティブラーニング','HRテック'],
    ['SCM','CIM','CRM','KM','ERP','SFA'],
    ['チェンジマネジメント','ナレッジマネジメント','インシデント管理','問題管理'],
    ['ウォーターフォール','アジャイル','スクラム','プロトタイピング'],
    ['ブラックボックステスト','ホワイトボックステスト','回帰テスト','受入テスト'],
    ['限界値分析','同値分割','デシジョンテーブル','状態遷移テスト'],
    ['コンパイラ','インタプリタ','アセンブラ','リンカ'],
    ['スループット','レスポンスタイム','ターンアラウンドタイム','レイテンシ'],
    ['クロック周波数','CPI','MIPS','FLOPS'],
    ['IPv4','IPv6','MACアドレス','サブネットマスク'],
    ['TCP','UDP','HTTP','HTTPS'],
    ['LAN','WAN','VPN','VLAN'],
    ['ルータ','スイッチ','ハブ','ゲートウェイ'],
    ['IPoE','PPPoE','NAPT','NAT'],
    ['RFID','QRコード','バーコード','NFC'],
    ['XBRL','XML','HTML','CSV'],
    ['CAPTCHA','ワンタイムパスワード','生体認証','多要素認証']
  ];

  const aliases={
    'ハミング':['ハミング符号'],
    'ステートチャート図':['ステートマシン図'],
    '状態遷移図':['ステートマシン図'],
    'オフJT':['off-JT'],
    'OFF-JT':['off-JT'],
    'DX':['デジタルトランスフォーメーション']
  };

  function normalize(value){
    return String(value||'').trim().toUpperCase().normalize('NFKC');
  }

  function canonical(value){
    const raw=String(value||'').trim();
    const alias=aliases[raw]||aliases[normalize(raw)];
    return alias?.[0]||raw;
  }

  function related(word){
    const target=normalize(canonical(word));
    const found=[];
    groups.forEach(group=>{
      const normalized=group.map(normalize);
      if(normalized.includes(target)){
        group.forEach(item=>{
          if(normalize(item)!==target&&!found.some(x=>normalize(x)===normalize(item)))found.push(item);
        });
      }
    });
    return found;
  }

  function sameGroup(a,b){
    const target=normalize(canonical(a));
    return related(target).some(item=>normalize(item)===normalize(canonical(b)));
  }

  function diagnostics(words=[]){
    const available=new Set(words.map(x=>normalize(x.word||x)));
    let usableGroups=0;
    groups.forEach(group=>{
      if(group.filter(x=>available.has(normalize(x))).length>=2)usableGroups++;
    });
    return{valid:groups.length>0,totalGroups:groups.length,usableGroups};
  }

  return{groups,related,sameGroup,canonical,diagnostics};
})();