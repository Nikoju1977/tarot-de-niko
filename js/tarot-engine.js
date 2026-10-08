import {DECK,SPREADS,SUITS} from './tarot-data.js';

// Rejection sampling sur 32 bits : pas de biais modulo.
export function secureRandomInt(limit,source=globalThis.crypto){
  if(!Number.isInteger(limit)||limit<1||limit>0xFFFFFFFF)throw new RangeError('limite invalide');
  if(!source || typeof source.getRandomValues!=='function')throw new Error('Aléa cryptographique indisponible');
  const max=0x100000000,threshold=Math.floor(max/limit)*limit;
  const numbers=new Uint32Array(1);
  do{source.getRandomValues(numbers);}while(numbers[0]>=threshold);
  return numbers[0]%limit;
}
export function shuffle(cards,rand=secureRandomInt){
  const result=cards.slice();
  for(let i=result.length-1;i>0;i--){
    const j=rand(i+1);
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}
export function drawSpread(key='3',{reverse=false,rand=secureRandomInt}={}){
  const spread=SPREADS[key];
  if(!spread)throw new RangeError('Tirage inconnu');
  return shuffle(DECK,rand).slice(0,spread.positions.length).map((card,index)=>({
    ...card,position:spread.positions[index],reversed:reverse&&rand(100)<30
  }));
}
export function analyzeSpread(cards){
  if(!Array.isArray(cards)||!cards.length)return {themes:[],relations:[],summary:'Aucune carte tirée.'};
  const majors=cards.filter(c=>c.type==='major');
  const counts=Object.fromEntries(SUITS.map(s=>[s.id,cards.filter(c=>c.suit===s.id).length]));
  const dominant=SUITS.filter(s=>counts[s.id]>=2).sort((a,b)=>counts[b.id]-counts[a.id]);
  const themes=[];
  if(majors.length>=Math.ceil(cards.length/2))themes.push('Les arcanes majeurs dominent : le tirage invite à regarder les grandes étapes intérieures.');
  for(const suit of dominant)themes.push('Le domaine « '+suit.theme+' » revient '+counts[suit.id]+' fois.');
  if(!themes.length)themes.push('Les cartes invitent à relier plusieurs dimensions de la situation.');
  const numbers=new Map();
  for(const card of cards){
    const n=card.number<=10?card.number:null;
    if(n!==null)numbers.set(n,(numbers.get(n)||0)+1);
  }
  const repeats=[...numbers.entries()].filter(([,count])=>count>1);
  for(const [n,count] of repeats)themes.push('Le nombre '+n+' apparaît '+count+' fois : explorer le rythme qui se répète.');
  const relations=[];
  for(let i=0;i<cards.length-1;i++){
    const left=cards[i],right=cards[i+1];
    if(left.type==='major'&&right.type==='major'){
      if(left.gaze==='droite'&&right.gaze==='gauche')relations.push(left.name+' et '+right.name+' se regardent : un dialogue symbolique.');
      else if(left.gaze==='gauche'&&right.gaze==='droite')relations.push(left.name+' et '+right.name+' tournent le regard vers l’extérieur : deux voies possibles.');
    }
  }
  return {
    themes,relations,
    summary:cards.map(c=>c.position+' : '+c.name+(c.reversed?' (renversée)':'')+' — '+c.theme).join('\n'),
    resource:cards.map(c=>c.resource).slice(0,3).join(' · '),
    majors:majors.length
  };
}
export function localInterpretation(cards){
  const analysis=analyzeSpread(cards);
  const lines=['Lecture symbolique'];
  cards.forEach(c=>lines.push(c.position+' — '+c.name+'. '+(c.reversed?'Énergie à réexaminer : ':'')+'Thème : '+c.theme+'. Ressource : '+c.resource+'.'));
  lines.push('',...analysis.themes,...analysis.relations,'','Question à explorer : quelle action concrète et bienveillante peux-tu choisir aujourd’hui ?');
  return lines.join('\n');
}
