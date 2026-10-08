// Données symboliques. Lectures introspectives, jamais prédictives.
const majorRows = [
  ['Le Mat','✶','Élan','Liberté','Dispersion','droite'],
  ['Le Bateleur','✧','Commencement','Initiative','Hésitation','droite'],
  ['La Papesse','☽','Intériorité','Écoute','Retrait','gauche'],
  ["L'Impératrice",'✿','Création','Expression','Précipitation','droite'],
  ["L'Empereur",'♜','Structure','Responsabilité','Rigidité','gauche'],
  ['Le Pape','✣','Transmission','Sagesse','Dogme','droite'],
  ["L'Amoureux",'♡','Choix','Lien','Indécision','centre'],
  ['Le Chariot','✦','Mouvement','Détermination','Contrôle','droite'],
  ['La Justice','⚖','Équilibre','Lucidité','Jugement','centre'],
  ["L'Ermite",'◇','Recherche','Patience','Isolement','gauche'],
  ['La Roue de Fortune','◉','Cycles','Adaptation','Répétition','centre'],
  ['La Force','♌','Courage','Douceur','Domination','droite'],
  ['Le Pendu','⌑','Pause','Lâcher-prise','Immobilisme','centre'],
  ["L'Arcane XIII",'❖','Transformation','Renouveau','Rupture','droite'],
  ['Tempérance','♒','Circulation','Harmonie','Évitement','centre'],
  ['Le Diable','♢','Désir','Vitalité','Attachement','centre'],
  ['La Maison Dieu','⚡','Libération','Vérité','Déstabilisation','centre'],
  ["L'Étoile",'✳','Confiance','Générosité','Idéalisation','centre'],
  ['La Lune','☾','Imaginaire','Intuition','Confusion','gauche'],
  ['Le Soleil','☼','Rayonnement','Partage','Surexposition','centre'],
  ['Le Jugement','♬','Appel','Éveil','Pression','centre'],
  ['Le Monde','◎','Accomplissement','Intégration','Perfectionnisme','centre']
];

export const MAJORS = Object.freeze(majorRows.map(([name,symbol,theme,resource,tension,gaze],number) =>
  Object.freeze({id:'maj-'+number,number,type:'major',name,symbol,theme,resource,tension,gaze,suit:null})
));
export const SUITS = Object.freeze([
  Object.freeze({id:'batons',name:'Bâtons',symbol:'♧',theme:'créativité et énergie',center:'action',color:'#ad693d'}),
  Object.freeze({id:'coupes',name:'Coupes',symbol:'♡',theme:'émotions et relations',center:'ressenti',color:'#6490ac'}),
  Object.freeze({id:'epees',name:'Épées',symbol:'♤',theme:'pensée et discernement',center:'pensée',color:'#a39bb5'}),
  Object.freeze({id:'deniers',name:'Deniers',symbol:'◈',theme:'matière et réalisation',center:'corps',color:'#b5a061'})
]);
export const RANKS = Object.freeze([
  ['As',1,'potentiel'],['Deux',2,'rencontre'],['Trois',3,'expression'],
  ['Quatre',4,'structure'],['Cinq',5,'transition'],['Six',6,'échange'],
  ['Sept',7,'initiative'],['Huit',8,'consolidation'],['Neuf',9,'maturation'],
  ['Dix',10,'aboutissement'],['Valet',11,'apprentissage'],
  ['Cavalier',12,'mouvement'],['Reine',13,'intériorisation'],['Roi',14,'maîtrise']
]);
export const MINORS = Object.freeze(SUITS.flatMap(suit => RANKS.map(([rank,number,theme]) => Object.freeze({
  id:suit.id+'-'+number,number,type:'minor',name:rank+' de '+suit.name,
  symbol:suit.symbol,theme:theme+' dans '+suit.theme,resource:theme,
  tension:'excès ou manque de '+suit.center,gaze:'centre',suit:suit.id,
  center:suit.center,color:suit.color
}))));
export const DECK = Object.freeze([...MAJORS,...MINORS]);
export const SPREADS = Object.freeze({
  '3':Object.freeze({name:'La Phrase Optique',positions:['Ce que je vis','Ce qui agit','La direction à explorer']}),
  '4':Object.freeze({name:'Les Racines',positions:['Héritage paternel','Héritage maternel','Ma place','Ce que je transforme']}),
  '5':Object.freeze({name:'La Croix',positions:['Mon appui','Mon obstacle','Ma conscience','Mon ancrage','Ma voie']}),
  '6':Object.freeze({name:"L'Hexagramme",positions:['Le ciel','Le passé','Le cœur','Le proche','Le lointain','La terre']})
});
export const VERSION = '2.0.0';
