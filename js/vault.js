// Journal opt-in chiffré, sans envoi réseau. Le mot de passe n'est jamais persisté.
const KEY='tarot-niko-v2-vault';
const ITERATIONS=250000;
const encoder=new TextEncoder(),decoder=new TextDecoder();
let session=null; // {key, salt, records}
const bytesTo64=(bytes)=>btoa(String.fromCharCode(...bytes));
const from64=(s)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function derive(password,salt){
  const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:ITERATIONS,hash:'SHA-256'},
    material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
export function vaultExists(){return localStorage.getItem(KEY)!==null;}
export function isUnlocked(){return session!==null;}
export function lockVault(){session=null;}
export async function unlockVault(password){
  if(typeof password!=='string'||password.length<10)throw new Error('Utilise une phrase secrète de 10 caractères minimum.');
  const saved=localStorage.getItem(KEY);
  if(!saved){
    const salt=crypto.getRandomValues(new Uint8Array(16));
    session={key:await derive(password,salt),salt,records:[]};
    await persist();
    return [];
  }
  try{
    const vault=JSON.parse(saved);
    if(vault.v!==1||vault.iter!==ITERATIONS)throw new Error('Format non reconnu');
    const salt=from64(vault.salt),key=await derive(password,salt);
    const content=await crypto.subtle.decrypt({name:'AES-GCM',iv:from64(vault.iv)},key,from64(vault.data));
    const records=JSON.parse(decoder.decode(content));
    if(!Array.isArray(records))throw new Error('Journal invalide');
    session={key,salt,records};
    return [...records];
  }catch(_){session=null;throw new Error('Phrase secrète incorrecte ou archive endommagée.');}
}
async function persist(){
  if(!session)throw new Error('Déverrouille le journal.');
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},session.key,encoder.encode(JSON.stringify(session.records)));
  localStorage.setItem(KEY,JSON.stringify({
    v:1,iter:ITERATIONS,salt:bytesTo64(session.salt),iv:bytesTo64(iv),data:bytesTo64(new Uint8Array(ciphertext))
  }));
}
export function listReadings(){
  if(!session)throw new Error('Déverrouille le journal.');
  return session.records.map(r=>({...r})).reverse();
}
export async function addReading(record){
  if(!session)throw new Error('Déverrouille le journal.');
  const copy=JSON.parse(JSON.stringify(record));
  copy.id=crypto.randomUUID();copy.date=new Date().toISOString();
  session.records.push(copy);
  await persist();
  return copy.id;
}
export async function removeReading(id){
  if(!session)throw new Error('Déverrouille le journal.');
  session.records=session.records.filter(r=>r.id!==id);
  await persist();
}
export function exportEncryptedVault(){
  const data=localStorage.getItem(KEY);
  if(!data)throw new Error('Aucun journal chiffré.');
  return data;
}

export function importEncryptedVault(contents){
  if(typeof contents!=='string'||contents.length>3000000)throw new Error('Archive trop volumineuse.');
  let parsed;
  try{parsed=JSON.parse(contents);}catch(_){throw new Error('Archive JSON invalide.');}
  if(parsed?.v!==1||parsed.iter!==ITERATIONS||
     !['salt','iv','data'].every(field=>typeof parsed[field]==='string'&&parsed[field].length>0))
    throw new Error('Format d’archive non pris en charge.');
  try{
    if(from64(parsed.salt).length!==16||from64(parsed.iv).length!==12||from64(parsed.data).length<16)
      throw new Error();
  }catch(_){throw new Error('Archive chiffrée invalide.');}
  session=null;
  localStorage.setItem(KEY,JSON.stringify(parsed));
}
