import {SPREADS,VERSION} from './tarot-data.js';
import {drawSpread,localInterpretation,analyzeSpread} from './tarot-engine.js';
import {cardArtwork} from './card-art.js';
import {askOracle} from './oracle.js';
import {loadMistralKey,saveMistralKey,forgetMistralKey} from './mistral-key.js';
import {vaultExists,isUnlocked,unlockVault,lockVault,listReadings,addReading,removeReading,exportEncryptedVault,importEncryptedVault} from './vault.js';

const $=(id)=>document.getElementById(id);
const state={reading:null,key:'',savedKey:false,revealed:new Set(),history:[],aiText:'',busy:false,controller:null,audio:null,ambient:false,pendingSave:false};
let keyRevision=0;
let keyOperation=false;
function keyStatus(message){
  setText('apiKeyStatus',message);
  $('forgetApiKey').hidden=!state.savedKey;
}
async function restoreSavedKey(){
  const revision=keyRevision;
  try{
    const saved=await loadMistralKey();
    if(keyRevision!==revision)return;
    state.savedKey=Boolean(saved);
    if(saved)state.key=saved;
    keyStatus(saved?
      'Clé Mistral mémorisée sur cet appareil et prête pour tous tes tirages.':
      'Aucune clé enregistrée : tu peux utiliser le tirage sans IA, ou ajouter ta clé ci-dessus.');
  }catch(error){
    if(keyRevision!==revision)return;
    keyStatus(error.message);
  }
}
let statusTimer=0;
const listeners=(id,event,fn)=>$(id).addEventListener(event,fn);
const setText=(id,text)=>{$(id).textContent=text;};
function status(text){
  clearTimeout(statusTimer);
  setText('status',text);
  statusTimer=setTimeout(()=>setText('status',''),4800);
}
function navigate(to,scroll=true){
  if(to==='reading'&&!state.reading){status("Commence par choisir un tirage.");to='home';}
  for(const page of ['home','reading','journal'])$(page).hidden=page!==to;
  document.querySelectorAll('[data-view]').forEach(btn=>{
    const active=btn.dataset.view===to;
    btn.classList.toggle('is-active',active);
    if(active)btn.setAttribute('aria-current','page');
    else btn.removeAttribute('aria-current');
  });
  if(scroll)window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});
}
function cleanAsync(){
  if(state.controller){state.controller.abort();state.controller=null;}
  state.busy=false;
  $('aiRead').disabled=false;
  $('followup').disabled=false;
  document.querySelector('#followupForm button').disabled=false;
  if('speechSynthesis'in window)window.speechSynthesis.cancel();
}
function createCard(card,index){
  const slot=document.createElement('div');slot.className='tarot-slot';
  const button=document.createElement('button');
  button.type='button';button.className='flip-card';
  button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','Révéler la carte '+(index+1)+' : '+card.position);
  const sides=document.createElement('span');sides.className='card-sides';
  const back=document.createElement('span');back.className='card-back';
  const sign=document.createElement('span');sign.className='card-back-symbol';
  sign.setAttribute('aria-hidden','true');sign.textContent='✧';back.append(sign);
  const front=document.createElement('span');front.className='card-face';
  const image=document.createElement('img');
  image.src=cardArtwork(card);image.alt=card.name+(card.reversed?' (renversée)':'');
  image.loading='lazy';
  if(card.reversed)image.classList.add('reversed');
  front.append(image);sides.append(back,front);button.append(sides);
  const heading=document.createElement('div');heading.className='card-position';heading.textContent=card.position;
  const caption=document.createElement('div');caption.className='card-caption';
  caption.hidden=true;
  const name=document.createElement('span');name.textContent=card.name;
  caption.append(name);
  if(card.reversed)caption.append(document.createTextNode(' · renversée'));
  button.addEventListener('click',()=>revealCard(index));
  slot.append(heading,button,caption);
  return slot;
}
function revealCard(index){
  if(!state.reading||state.revealed.has(index))return;
  const buttons=$('cardBoard').querySelectorAll('.flip-card');
  const button=buttons[index];if(!button)return;
  button.classList.add('revealed');
  button.setAttribute('aria-pressed','true');
  button.setAttribute('aria-label','Carte '+(index+1)+' révélée : '+state.reading.cards[index].name);
  button.closest('.tarot-slot').querySelector('.card-caption').hidden=false;
  state.revealed.add(index);
  if(state.revealed.size===state.reading.cards.length)showInterpretation();
}
function newReading(){
  cleanAsync();
  const spread=$('spreadSelect').value;
  state.reading={
    spread,name:$('firstName').value.trim().slice(0,60),
    question:$('intention').value.trim().slice(0,500),
    cards:drawSpread(spread,{reverse:$('reverseCards').checked})
  };
  const enteredKey=$('apiKey').value.trim();
  if(enteredKey){
    keyRevision++;
    state.key=enteredKey;
    keyStatus('Clé active pendant cette visite. Clique sur « Mémoriser » pour la retrouver plus tard.');
  }
  $('apiKey').value='';
  $('readingNote').value='';
  state.aiText='';state.history=[];state.revealed=new Set();
  $('interpretation').hidden=true;$('aiResponse').hidden=true;$('aiChat').hidden=true;
  $('aiRead').hidden=false;$('revealAll').hidden=false;
  const d=SPREADS[spread];
  setText('spreadDescription',d.name+' · '+d.positions.length+' cartes'+
    (state.reading.name?' · Pour '+state.reading.name:''));
  const board=$('cardBoard');board.replaceChildren();
  state.reading.cards.forEach((card,i)=>board.append(createCard(card,i)));
  navigate('reading');
  $('readingTitle').focus?.();
}
function showInterpretation(){
  if(!state.reading)return;
  $('interpretation').hidden=false;$('revealAll').hidden=true;
  const symbolic=analyzeSpread(state.reading.cards);
  setText('localReading',localInterpretation(state.reading.cards)+
    (symbolic.relations.length?'':'\n\nObserve aussi la place et l’orientation des cartes.'));
  status('Le tirage est révélé. Prends le temps de le contempler.');
}
function showError(message){
  const el=$('aiResponse');
  el.hidden=false;el.classList.add('is-error');
  el.textContent=message;
  status(message);
}
async function oracleRequest(followup=''){
  if(!state.reading||state.busy)return;
  state.busy=true;
  const controller=new AbortController();state.controller=controller;
  $('aiRead').disabled=true;$('followup').disabled=true;
  document.querySelector('#followupForm button').disabled=true;
  const panel=$('aiResponse');panel.hidden=false;panel.classList.remove('is-error');
  const previous=state.aiText;
  const separator=followup?'\n\n✧ '+followup+'\n\n':'';
  panel.textContent=previous+separator+'L’Oracle compose sa lecture…';
  try{
    await keyRestorePromise;
    if(controller.signal.aborted)return;
    const answer=await askOracle(state.reading,{
      apiKey:state.key,followup,history:state.history,signal:controller.signal,
      onUpdate:(text)=>{
        if(!controller.signal.aborted)panel.textContent=previous+separator+text;
      }
    });
    if(controller.signal.aborted)return;
    state.aiText=previous+separator+answer;
    panel.textContent=state.aiText;
    if(followup)state.history.push({role:'user',content:followup});
    state.history.push({role:'assistant',content:answer});
    $('aiChat').hidden=false;
    status('Lecture IA terminée.');
  }catch(error){
    if(!controller.signal.aborted){
      panel.textContent=previous;
      if(!previous)showError(error.message);
      else status(error.message);
    }
  }finally{
    if(state.controller===controller){
      state.controller=null;state.busy=false;
      $('aiRead').disabled=false;
      $('followup').disabled=false;
      document.querySelector('#followupForm button').disabled=false;
    }
  }
}
async function saveCurrentReading(){
  if(!state.reading)return;
  if(!isUnlocked()){
    state.pendingSave=true;navigate('journal');
    status('Déverrouille ou crée ton grimoire pour enregistrer ce tirage.');
    $('vaultPassword').focus();
    return;
  }
  try{
    await addReading({name:state.reading.name,spread:state.reading.spread,
      question:state.reading.question,cards:state.reading.cards,
      note:$('readingNote').value.trim().slice(0,1200),
      analysis:localInterpretation(state.reading.cards),aiText:state.aiText});
    status('Tirage enregistré dans ton grimoire chiffré.');
    if(!$('journal').hidden)renderJournal();
  }catch(e){status(e.message);}
}
function renderJournal(){
  const container=$('journalEntries');container.replaceChildren();
  if(!isUnlocked())return;
  const readings=listReadings();
  if(!readings.length){
    const p=document.createElement('p');p.textContent='Ton grimoire est vide pour le moment.';
    container.append(p);return;
  }
  for(const reading of readings){
    const entry=document.createElement('article');entry.className='journal-entry';
    const time=document.createElement('time');
    time.dateTime=reading.date;
    time.textContent=new Date(reading.date).toLocaleString('fr-FR',{dateStyle:'medium',timeStyle:'short'});
    const title=document.createElement('h3');title.textContent=SPREADS[reading.spread]?.name||'Tirage';
    const question=document.createElement('p');question.textContent=reading.question||'Sans intention particulière';
    const details=document.createElement('details'),summary=document.createElement('summary');
    summary.textContent='Relire le tirage';
    const readingText=document.createElement('p');readingText.style.whiteSpace='pre-line';
    readingText.textContent=reading.analysis+(reading.aiText?'\n\nInterprétation IA :\n'+reading.aiText:'');
    details.append(summary,readingText);
    if(reading.note){const note=document.createElement('p');note.textContent='Note : '+reading.note;details.append(note);}
    const remove=document.createElement('button');remove.type='button';remove.className='text-button';
    remove.textContent='Supprimer cette entrée';
    remove.addEventListener('click',async()=>{
      if(!window.confirm('Supprimer définitivement ce tirage de ce navigateur ?'))return;
      try{await removeReading(reading.id);renderJournal();status('Tirage supprimé.');}
      catch(e){status(e.message);}
    });
    entry.append(time,title,question,details,remove);container.append(entry);
  }
}
function download(name,text){
  const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));
  const a=document.createElement('a');a.href=url;a.download=name;
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),500);
}
let ambientNodes=[];
async function toggleAmbient(){
  if(state.ambient){
    for(const node of ambientNodes){try{node.stop?.();node.disconnect?.();node.close?.();}catch(_){}}
    ambientNodes=[];state.ambient=false;
    $('ambientToggle').setAttribute('aria-pressed','false');status('Ambiance désactivée.');
    return;
  }
  try{
    const Context=window.AudioContext||window.webkitAudioContext;
    if(!Context)throw new Error('Audio non disponible sur ce navigateur.');
    const context=new Context();await context.resume();ambientNodes.push(context);
    const gain=context.createGain();gain.gain.value=.014;gain.connect(context.destination);
    for(const hz of [110,164.81,220]){
      const oscillator=context.createOscillator();oscillator.type='sine';oscillator.frequency.value=hz;
      oscillator.connect(gain);oscillator.start();ambientNodes.push(oscillator);
    }
    state.ambient=true;
    $('ambientToggle').setAttribute('aria-pressed','true');
    status('Ambiance sonore activée.');
  }catch(e){status(e.message);}
}
function speak(){
  if(!('speechSynthesis'in window)){status('Lecture vocale indisponible.');return;}
  if(window.speechSynthesis.speaking){window.speechSynthesis.cancel();status('Lecture arrêtée.');return;}
  const text=state.aiText||$('localReading').textContent;
  if(!text)return;
  const utterance=new SpeechSynthesisUtterance(text.slice(0,9000));
  utterance.lang='fr-FR';utterance.rate=.93;utterance.pitch=.95;
  const french=window.speechSynthesis.getVoices().find(v=>v.lang?.toLowerCase().startsWith('fr'));
  if(french)utterance.voice=french;
  window.speechSynthesis.speak(utterance);
}
document.querySelectorAll('[data-view]').forEach(btn=>btn.addEventListener('click',()=>{
  navigate(btn.dataset.view);
  if(btn.dataset.view==='journal'&&isUnlocked())renderJournal();
}));
listeners('sessionForm','submit',e=>{e.preventDefault();newReading();});
listeners('backToHome','click',()=>navigate('home'));
listeners('newSpread','click',newReading);
listeners('revealAll','click',()=>state.reading?.cards.forEach((_,i)=>revealCard(i)));
listeners('aiRead','click',()=>oracleRequest());
listeners('followupForm','submit',e=>{
  e.preventDefault();
  const question=$('followup').value.trim();if(!question)return;
  $('followup').value='';oracleRequest(question);
});
listeners('saveReading','click',saveCurrentReading);
listeners('speakReading','click',speak);
listeners('printReading','click',()=>window.print());
listeners('ambientToggle','click',toggleAmbient);
listeners('openApiSettings','click',()=>{
  navigate('home');
  $('apiSettings').open=true;
  $('apiSettings').scrollIntoView({behavior:'smooth',block:'center'});
  $('apiKey').focus();
});
listeners('saveApiKey','click',async()=>{
  if(keyOperation)return;
  const secret=$('apiKey').value.trim()||state.key;
  if(!secret){status('Colle ta clé Mistral dans le champ avant de l’enregistrer.');$('apiKey').focus();return;}
  keyRevision++;
  state.key=secret;
  $('apiKey').value='';
  keyOperation=true;
  $('saveApiKey').disabled=true;
  $('forgetApiKey').disabled=true;
  try{
    await saveMistralKey(secret);
    state.savedKey=true;
    keyStatus('Clé enregistrée et chiffrée sur cet appareil. Elle sera automatiquement réutilisée, même après fermeture du navigateur.');
    status('Clé Mistral mémorisée : tu n’auras plus à la ressaisir sur cet appareil.');
  }catch(error){
    keyStatus('Clé active pour cette visite seulement. '+error.message);
    status('Enregistrement impossible : '+error.message);
  }finally{
    keyOperation=false;
    $('saveApiKey').disabled=false;
    $('forgetApiKey').disabled=false;
  }
});
listeners('forgetApiKey','click',async()=>{
  if(keyOperation)return;
  keyRevision++;
  keyOperation=true;
  $('saveApiKey').disabled=true;
  $('forgetApiKey').disabled=true;
  try{
    await forgetMistralKey();
    state.key='';
    state.savedKey=false;
    $('apiKey').value='';
    keyStatus('Clé effacée de cet appareil. Tu peux en ajouter une nouvelle.');
    status('Clé Mistral oubliée.');
  }catch(error){
    status('Impossible d’effacer la clé : '+error.message);
  }finally{
    keyOperation=false;
    $('saveApiKey').disabled=false;
    $('forgetApiKey').disabled=false;
  }
});
listeners('microphone','click',()=>{
  const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!Speech){status('Reconnaissance vocale non disponible dans ce navigateur.');return;}
  const recognition=new Speech();recognition.lang='fr-FR';recognition.interimResults=false;
  recognition.onresult=(event)=>{const spoken=event.results?.[0]?.[0]?.transcript||'';
    $('followup').value=spoken.slice(0,600);$('followup').focus();};
  recognition.onerror=()=>status('Micro non disponible ou permission refusée.');
  try{recognition.start();status('Micro activé : tu peux parler.');}
  catch(_){status('Impossible de démarrer le micro.');}
});
listeners('importVault','click',()=>$('importVaultFile').click());
listeners('importVaultFile','change',async(event)=>{
  const file=event.target.files?.[0];
  if(!file)return;
  try{
    if(vaultExists()&&!confirm('Remplacer le grimoire existant de cet appareil ? Exporte-le auparavant si besoin.'))return;
    importEncryptedVault(await file.text());
    $('vaultForm').hidden=false;$('vaultPanel').hidden=true;
    $('vaultOpen').textContent='Déverrouiller le grimoire';
    $('vaultPassword').value='';
    status('Archive importée. Déverrouille avec sa phrase secrète.');
  }catch(err){status(err.message);}
  finally{event.target.value='';}
});
listeners('vaultForm','submit',async e=>{
  e.preventDefault();
  const password=$('vaultPassword').value;
  try{
    await unlockVault(password);
    $('vaultPassword').value='';
    $('vaultForm').hidden=true;$('vaultPanel').hidden=false;
    renderJournal();status('Grimoire déverrouillé.');
    if(state.pendingSave){state.pendingSave=false;await saveCurrentReading();}
  }catch(err){status(err.message);}
});
listeners('lockVault','click',()=>{
  lockVault();$('vaultForm').hidden=false;$('vaultPanel').hidden=true;
  $('journalEntries').replaceChildren();status('Grimoire verrouillé.');
});
listeners('exportVault','click',()=>{
  try{download('tarot-de-niko-grimoire-chiffre.json',exportEncryptedVault());}
  catch(e){status(e.message);}
});
// La clé de session est effacée à la fermeture ; seul le choix explicite
// « Mémoriser » permet un stockage chiffré dans IndexedDB sur cet appareil.
window.addEventListener('pagehide',()=>{cleanAsync();state.key='';if(state.ambient)toggleAmbient();lockVault();});
if('serviceWorker'in navigator&&location.protocol.startsWith('http')){
  window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
if(vaultExists())$('vaultOpen').textContent='Déverrouiller le grimoire';
const keyRestorePromise=restoreSavedKey();
document.title='L’Oracle — Tarot de Niko · v'+VERSION;
