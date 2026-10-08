// Clé personnelle conservée chiffrée sur cet appareil, jamais dans le dépôt.
// La clé de chiffrement non exportable est conservée dans IndexedDB avec le ciphertext.
// Important : un script actif sur la même origine peut déchiffrer la clé ; ne pas utiliser
// sur un appareil partagé et protéger l'accès au navigateur.
const DATABASE = 'tarot-de-niko-mistral-v1';
const STORE = 'credentials';
const ENCRYPTED = 'mistral-ciphertext';
const WRAPPING_KEY = 'mistral-device-key';
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function openDatabase(){
  return new Promise((resolve,reject)=>{
    if(!globalThis.indexedDB || !globalThis.crypto?.subtle)
      return reject(new Error("L'enregistrement chiffré n'est pas disponible dans ce navigateur."));
    const req=indexedDB.open(DATABASE,1);
    req.onupgradeneeded=()=>{
      if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);
    };
    req.onsuccess=()=>{
      const db=req.result;
      db.onversionchange=()=>db.close();
      resolve(db);
    };
    req.onerror=()=>reject(new Error("Stockage local indisponible ou bloqué."));
    req.onblocked=()=>reject(new Error("Ferme les autres onglets du Tarot puis réessaie."));
  });
}
async function getValue(name){
  const db=await openDatabase();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const req=tx.objectStore(STORE).get(name);
      req.onsuccess=()=>resolve(req.result??null);
      req.onerror=()=>reject(new Error('Lecture de la clé enregistrée impossible.'));
      tx.onabort=()=>reject(new Error('Lecture interrompue.'));
    });
  }finally{db.close();}
}
function transact(mode,fn){
  return openDatabase().then(db=>new Promise((resolve,reject)=>{
    let tx;
    try{
      tx=db.transaction(STORE,mode);
      fn(tx.objectStore(STORE));
      tx.oncomplete=()=>{db.close();resolve();};
      tx.onerror=()=>{db.close();reject(new Error('Impossible de modifier la clé enregistrée.'));};
      tx.onabort=()=>{db.close();reject(new Error('Enregistrement interrompu.'));};
    }catch(error){db.close();reject(error);}
  }));
}
export async function hasSavedMistralKey(){
  return Boolean(await getValue(ENCRYPTED));
}
export async function saveMistralKey(value){
  const secret=String(value??'').trim();
  if(!secret)throw new Error('Saisis ta clé Mistral avant de l’enregistrer.');
  if(secret.length>512)throw new Error('Clé API anormalement longue.');
  const key=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,encoder.encode(secret));
  await transact('readwrite',store=>{
    store.put(key,WRAPPING_KEY);
    store.put({v:1,iv:[...iv],ciphertext:[...new Uint8Array(ciphertext)]},ENCRYPTED);
  });
  return true;
}
export async function loadMistralKey(){
  const db=await openDatabase();
  let credential,key;
  try{
    [credential,key]=await new Promise((resolve,reject)=>{
      const tx=db.transaction(STORE,'readonly');
      const store=tx.objectStore(STORE);
      const cipherReq=store.get(ENCRYPTED);
      const keyReq=store.get(WRAPPING_KEY);
      tx.oncomplete=()=>resolve([cipherReq.result,keyReq.result]);
      tx.onerror=()=>reject(new Error('Lecture de la clé Mistral impossible.'));
      tx.onabort=()=>reject(new Error('Lecture interrompue.'));
    });
  }finally{db.close();}
  if(!credential&&!key)return '';
  if(!credential||!key||credential.v!==1||!Array.isArray(credential.iv)||
    !Array.isArray(credential.ciphertext))
    throw new Error('Clé enregistrée incomplète. Efface-la pour recommencer.');
  try{
    const plain=await crypto.subtle.decrypt(
      {name:'AES-GCM',iv:new Uint8Array(credential.iv)},
      key,new Uint8Array(credential.ciphertext)
    );
    return decoder.decode(plain);
  }catch(_){
    throw new Error('Clé enregistrée illisible. Efface-la pour recommencer.');
  }
}
export async function forgetMistralKey(){
  await transact('readwrite',store=>{
    store.delete(ENCRYPTED);
    store.delete(WRAPPING_KEY);
  });
}
