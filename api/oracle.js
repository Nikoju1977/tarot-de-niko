// Route Vercel Node.js. Désactivée sans clé ET rate limiter Redis Upstash.
// Déploiement GitHub Pages : ce fichier n'est pas exécuté.
import {createHmac} from 'node:crypto';
import {DECK,SPREADS} from '../js/tarot-data.js';
import {analyzeSpread} from '../js/tarot-engine.js';

const ENDPOINT='https://api.mistral.ai/v1/chat/completions';
const SYSTEM='Tu es un lecteur symbolique du Tarot de Marseille dans une approche introspective. '+ 
  'Aucune prédiction de l’avenir ni diagnostic. Interprète les positions, correspondances et ressources. '+ 
  'Réponds en français en 4 parties courtes : symboles, relations, question, action prudente. '+ 
  'Respecte la liberté du consultant et n’effectue pas de recommandations médicales, juridiques ou financières.';
const fail=(res,status,msg)=>res.status(status).json({error:msg});
function validText(s,max=600){return typeof s==='string'?s.trim().slice(0,max):'';}
async function checkQuota(req){
  const origin=process.env.UPSTASH_REDIS_REST_URL;
  const token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!origin||!token)throw new Error('Limiter missing');
  const identity=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||req.socket?.remoteAddress||'unknown').split(',')[0].trim();
  const hour=Math.floor(Date.now()/3600000);
  const id=createHmac('sha256',process.env.RATE_LIMIT_SECRET||process.env.MISTRAL_API_KEY).update(identity).digest('hex').slice(0,24);
  const response=await fetch(origin.replace(/\/$/,'')+'/pipeline',{
    method:'POST',
    headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
    body:JSON.stringify([['INCR','oracle:hour:'+hour+':'+id],['EXPIRE','oracle:hour:'+hour+':'+id,3700]]),
    signal:AbortSignal.timeout(4000)
  });
  if(!response.ok)throw new Error('Limiter unavailable');
  const results=await response.json();
  const count=Number(results?.[0]?.result);
  if(!Number.isInteger(count))throw new Error('Limiter malformed');
  return count<=12;
}
export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');
  res.setHeader('X-Content-Type-Options','nosniff');
  if(req.method!=='POST')return fail(res,405,'Méthode refusée');
  const origin=req.headers.origin;
  const host=req.headers.host;
  let validOrigin=false;
  try{validOrigin=Boolean(host&&origin&&new URL(origin).host===host);}catch(_){return fail(res,403,'Origine refusée');}
  if(!validOrigin)return fail(res,403,'Origine refusée');
  if(!process.env.MISTRAL_API_KEY||!process.env.UPSTASH_REDIS_REST_URL||!process.env.UPSTASH_REDIS_REST_TOKEN)
    return fail(res,503,'IA serveur non configurée');
  try{
    const body=typeof req.body==='string'?JSON.parse(req.body):req.body;
    if(!body||JSON.stringify(body).length>9000)return fail(res,413,'Données trop longues');
    const spread=SPREADS[body.spread];
    if(!spread||!Array.isArray(body.cards)||body.cards.length!==spread.positions.length)
      return fail(res,400,'Tirage invalide');
    const dictionary=new Map(DECK.map(c=>[c.id,c]));
    const selected=body.cards.map((entry,index)=>{
      const card=dictionary.get(entry?.id);
      if(!card)return null;
      return {...card,position:spread.positions[index],reversed:entry.reversed===true};
    });
    if(selected.some(c=>!c)||new Set(selected.map(c=>c.id)).size!==selected.length)
      return fail(res,400,'Cartes invalides');
    const analysis=analyzeSpread(selected);
    const question=validText(body.question,500);
    const followup=validText(body.followup,600);
    const messages=[{role:'system',content:SYSTEM},
      {role:'user',content:'Intention : '+question+'\nTirage :\n'+analysis.summary+
        '\nRelations :\n'+[...analysis.themes,...analysis.relations].join('\n')}];
    if(Array.isArray(body.history)){
      for(const turn of body.history.slice(-6)){
        if(turn&&['user','assistant'].includes(turn.role)&&typeof turn.content==='string')
          messages.push({role:turn.role,content:validText(turn.content,1600)});
      }
    }
    if(followup)messages.push({role:'user',content:followup});
    if(!await checkQuota(req))return fail(res,429,'Quota de consultations atteint');
    const upstream=await fetch(ENDPOINT,{
      method:'POST',
      headers:{'Authorization':'Bearer '+process.env.MISTRAL_API_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({model:process.env.MISTRAL_MODEL||'mistral-large-latest',stream:true,
        messages,temperature:0.7,max_tokens:720}),
      signal:AbortSignal.timeout(28000)
    });
    if(!upstream.ok)return fail(res,502,'IA momentanément indisponible');
    res.status(200);
    res.setHeader('Content-Type','text/event-stream; charset=utf-8');
    res.setHeader('X-Accel-Buffering','no');
    for await (const chunk of upstream.body){
      if(res.destroyed)break;
      res.write(Buffer.from(chunk));
    }
    res.end();
  }catch(e){
    if(!res.headersSent)return fail(res,503,'Service momentanément indisponible');
    res.end();
  }
}
