import {analyzeSpread} from './tarot-engine.js';

const MISTRAL_ENDPOINT='https://api.mistral.ai/v1/chat/completions';
const MODEL='mistral-large-latest';
const SYSTEM='Tu es un accompagnant de réflexion inspiré du Tarot de Marseille et de la lecture psychologique de Jodorowsky. '+ 
  'N’annonce jamais l’avenir et ne pose jamais de diagnostic. Ton écriture est poétique mais précise. '+ 
  'Appuie-toi sur les POSITIONS, les regards, les répétitions et les ressources de chaque carte. '+ 
  'Propose une hypothèse, une question ouverte et une action réaliste, non dangereuse. '+ 
  'Respecte l’autonomie du consultant. Ne demande aucune donnée personnelle supplémentaire.';
function buildMessages(reading,followup='',history=[]){
  const analysis=analyzeSpread(reading.cards);
  const description='Intention : '+String(reading.question||'Réflexion personnelle').slice(0,500)+
    '\nTirage :\n'+analysis.summary+'\nObservations :\n'+[...analysis.themes,...analysis.relations].join('\n');
  const messages=[{role:'system',content:SYSTEM},{role:'user',content:description}];
  for(const m of history.slice(-6)){
    if((m.role==='assistant'||m.role==='user')&&typeof m.content==='string')
      messages.push({role:m.role,content:m.content.slice(0,1600)});
  }
  if(followup)messages.push({role:'user',content:String(followup).slice(0,600)});
  return messages;
}
export async function streamCompletion(response,onUpdate){
  if(!response.ok){
    let message='Erreur IA ('+response.status+').';
    if(response.status===429)message='Service sollicité : réessaie ultérieurement.';
    if(response.status===503)message='Service IA non configuré. La lecture locale reste disponible.';
    throw new Error(message);
  }
  let result='';
  const receive=(line)=>{
    if(!line.startsWith('data:'))return;
    const data=line.slice(5).trim();
    if(data==='[DONE]'||!data)return;
    try{
      const json=JSON.parse(data);
      const content=json.choices?.[0]?.delta?.content;
      if(typeof content==='string'){result+=content;onUpdate(result);}
    }catch(_){}
  };
  if(!response.body){
    const content=await response.text();
    for(const line of content.split(/\r?\n/))receive(line);
    if(!result){
      try{result=JSON.parse(content).choices?.[0]?.message?.content||'';}catch(_){}
      onUpdate(result);
    }
  }else{
    const reader=response.body.getReader(),decoder=new TextDecoder();
    let buffer='';
    while(true){
      const {done,value}=await reader.read();
      if(done)break;
      buffer+=decoder.decode(value,{stream:true});
      const parts=buffer.split('\n');
      buffer=parts.pop();
      for(const line of parts)receive(line.trimEnd());
    }
    buffer+=decoder.decode();
    if(buffer.trim())receive(buffer.trim());
  }
  if(!result.trim())throw new Error('Réponse IA vide ou interrompue.');
  return result;
}
export async function askOracle(reading,{apiKey='',followup='',history=[],signal,onUpdate=()=>{}}={}){
  const messages=buildMessages(reading,followup,history);
  const usingPersonalKey=Boolean(apiKey.trim());
  const url=usingPersonalKey?MISTRAL_ENDPOINT:'./api/oracle';
  const payload=usingPersonalKey?
    {model:MODEL,stream:true,temperature:0.75,max_tokens:720,messages}:
    {spread:reading.spread,cards:reading.cards.map(c=>({id:c.id,reversed:!!c.reversed})),
      question:reading.question||'',followup,history};
  // Le mode serveur fonctionne sur un hébergement avec /api. GitHub Pages reste en mode local/BYOK.
  if(!usingPersonalKey&&location.hostname.endsWith('.github.io'))
    throw new Error("L’IA hébergée nécessite un backend. Tu peux utiliser la lecture locale ou ta clé personnelle.");
  const response=await fetch(url,{
    method:'POST',headers:{
      'Content-Type':'application/json',
      ...(usingPersonalKey?{Authorization:'Bearer '+apiKey.trim()}:{})
    },
    body:JSON.stringify(payload),signal,cache:'no-store'
  });
  return streamCompletion(response,onUpdate);
}
