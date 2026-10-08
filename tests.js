import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {DECK,MAJORS,MINORS,SPREADS,SUITS} from './js/tarot-data.js';
import {secureRandomInt,shuffle,drawSpread,analyzeSpread,localInterpretation} from './js/tarot-engine.js';
import {cardArtwork} from './js/card-art.js';
import {streamCompletion} from './js/oracle.js';
import {unlockVault,vaultExists,lockVault,listReadings,addReading,removeReading,exportEncryptedVault} from './js/vault.js';
import api from './api/oracle.js';

const html=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('sw.js','utf8');
const manifest=JSON.parse(fs.readFileSync('manifest.json','utf8'));

test('le jeu possède 78 arcanes uniques, 22 majeurs et 56 mineurs',()=>{
  assert.equal(DECK.length,78);
  assert.equal(MAJORS.length,22);
  assert.equal(MINORS.length,56);
  assert.equal(new Set(DECK.map(c=>c.id)).size,78);
  assert.equal(SUITS.length,4);
  assert.deepEqual(Object.keys(SPREADS),['3','4','5','6']);
});
test('chaque tirage respecte les positions et ne répète aucune carte',()=>{
  for(const key of Object.keys(SPREADS)){
    let i=0;
    const cards=drawSpread(key,{reverse:false,rand:(limit)=>i++%limit});
    assert.equal(cards.length,SPREADS[key].positions.length);
    assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
    assert.deepEqual(cards.map(c=>c.position),SPREADS[key].positions);
    assert.ok(cards.every(c=>!c.reversed));
  }
});
test('le mélange conserve exactement les mêmes cartes',()=>{
  assert.deepEqual([...shuffle(DECK,()=>0)].map(c=>c.id).sort(),DECK.map(c=>c.id).sort());
  assert.throws(()=>secureRandomInt(0),RangeError);
  assert.equal(secureRandomInt(7,{getRandomValues(arr){arr[0]=20;}}),6);
});
test('analyse introspective : thèmes, nombres et regards',()=>{
  const cards=[
    {...MAJORS[1],position:'A'},
    {...MAJORS[2],position:'B'},
    {...MINORS[0],position:'C'}
  ];
  const analysis=analyzeSpread(cards);
  assert.ok(analysis.relations.some(text=>text.includes('se regardent')));
  assert.equal(analysis.majors,2);
  assert.match(localInterpretation(cards),/Lecture symbolique/);
  assert.match(localInterpretation(cards),/Question à explorer/);
});
test('les 78 illustrations vectorielles sont générées sans réseau',()=>{
  for(const card of DECK){
    const uri=cardArtwork(card);
    assert.ok(uri.startsWith('data:image/svg+xml;charset=utf-8,'));
    const svg=decodeURIComponent(uri.split(',').slice(1).join(','));
    assert.match(svg,/<svg /);
    assert.ok(svg.includes(card.name.replaceAll('&','&amp;').replaceAll('<','&lt;')));
  }
});
test('lecture SSE résiste aux chunks coupés et aux retours CRLF',async()=>{
  const lines=[
    'data: '+JSON.stringify({choices:[{delta:{content:'Bon'}}]})+'\r\n',
    'data: '+JSON.stringify({choices:[{delta:{content:'jour'}}]})+'\n',
    'data: [DONE]\n'
  ].join('');
  const fragments=[lines.slice(0,7),lines.slice(7,33),lines.slice(33)];
  const updates=[];
  const body=new ReadableStream({
    pull(controller){
      if(!fragments.length){controller.close();return;}
      controller.enqueue(new TextEncoder().encode(fragments.shift()));
    }
  });
  const answer=await streamCompletion(new Response(body,{status:200}),text=>updates.push(text));
  assert.equal(answer,'Bonjour');
  assert.equal(updates.at(-1),'Bonjour');
});
test('aucune injection HTML via les champs d’interprétation',()=>{
  const html=fs.readFileSync('js/app.js','utf8');
  assert.doesNotMatch(html,/\.innerHTML\s*=/);
  assert.doesNotMatch(html,/eval\s*\(/);
  assert.match(html,/\.textContent\s*=/);
});
test('PWA installable avec chemins sous-dossier et cache des modules',()=>{
  assert.equal(manifest.start_url,'./');
  assert.equal(manifest.scope,'./');
  assert.match(html,/src="\.\/js\/app\.js"/);
  assert.match(sw,/js\/tarot-engine\.js/);
  assert.match(sw,/js\/app\.js/);
  assert.doesNotMatch(sw,/api\.mistral\.ai/);
  assert.match(sw,/request\.method!=='GET'/);
});
test('navigation, formulaire et contrôles accessibles présents',()=>{
  for(const id of ['sessionForm','cardBoard','interpretation','vaultForm','followupForm','status','saveReading','revealAll','ambientToggle']){
    assert.ok(html.includes('id="'+id+'"'),id+' présent');
  }
  assert.match(html,/class="skip-link"/);
  assert.match(html,/aria-live="polite"/);
  assert.match(fs.readFileSync('styles.css','utf8'),/prefers-reduced-motion:reduce/);
});
test('journal : chiffré en AES-GCM, verrouillage et suppression',async()=>{
  const memory=new Map();
  globalThis.localStorage={
    getItem:k=>memory.has(k)?memory.get(k):null,
    setItem:(k,v)=>memory.set(k,v),
    removeItem:k=>memory.delete(k)
  };
  const password='une-longue-phrase-secrete';
  await unlockVault(password);
  assert.equal(vaultExists(),true);
  const id=await addReading({question:'Ma question privée',cards:[{name:'Le Mat'}]});
  assert.equal(listReadings().length,1);
  const encrypted=exportEncryptedVault();
  assert.ok(!encrypted.includes('Ma question privée'),'texte non visible dans l’archive');
  lockVault();
  await assert.rejects(()=>unlockVault('phrase-incorrecte'));
  await unlockVault(password);
  assert.equal(listReadings()[0].id,id);
  await removeReading(id);
  assert.equal(listReadings().length,0);
  lockVault();
});
test('le proxy est fermé tant que son quota serveur manque',async()=>{
  const res={
    code:200,headers:{},setHeader(k,v){this.headers[k]=v;return this;},
    status(code){this.code=code;return this;},
    json(body){this.result=body;return this;}
  };
  await api({method:'GET',headers:{host:'example.org',origin:'https://example.org'}},res);
  assert.equal(res.code,405);
  const old=process.env.MISTRAL_API_KEY;
  delete process.env.MISTRAL_API_KEY;
  const other={...res};
  await api({method:'POST',headers:{host:'example.org',origin:'https://example.org'}},other);
  assert.equal(other.code,503);
  if(old!==undefined)process.env.MISTRAL_API_KEY=old;
});
