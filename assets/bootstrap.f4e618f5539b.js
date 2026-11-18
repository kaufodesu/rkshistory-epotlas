/* Fetch current metadata before the application starts. No map inventory is compiled into the UI. */
(function(){
 'use strict';
 const script=document.getElementById('world-bootstrap');let running=false;
 async function start(){
  if(running)return;running=true;
  const message=document.getElementById('loadingText'),recovery=document.getElementById('loadRecovery');
  try{
   recovery.hidden=true;message.textContent='最新の地図一覧を確認中…';
   if(!document.querySelector('script#embedded-maps')){
    if(location.protocol==='file:')throw Error('この分割版はGitHub Pages等のURLで開いてください。直接開く場合は内蔵HTML版を使えます。');
    const response=await fetch('maps/index.json',{cache:'no-cache'});if(!response.ok)throw Error('地図一覧を取得できません（HTTP '+response.status+'）。');
    const manifest=await response.json();if(manifest.version!==4||!manifest.maps||!Object.keys(manifest.maps).length)throw Error('地図一覧の形式が対応していません。');
    document.getElementById('atlas-data').textContent=JSON.stringify(manifest);
   }
   const app=document.createElement('script');app.src=script.dataset.app;app.onerror=()=>{message.textContent='画面プログラムを取得できません。assetsフォルダーを確認してください。';recovery.hidden=false;running=false;};document.head.append(app);
  }catch(error){message.textContent=error.message;recovery.hidden=false;running=false;}
 }
 document.getElementById('retryMap').onclick=start;
 document.getElementById('openBookWithoutMap').onclick=()=>{document.getElementById('loading').classList.add('hidden');document.getElementById('sources').open=true;document.getElementById('sources').scrollIntoView({block:'start'});};
 start();
})();
