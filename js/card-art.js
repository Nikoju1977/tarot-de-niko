// Illustrations vectorielles originales générées localement, sans ressources tierces.
const xml=(s)=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function cardArtwork(card){
  const major=card.type==='major';
  const tint=major?'#ab843b':card.color||'#9a7655';
  const ornaments=Array.from({length:7},(_,i)=>{
    const x=90+(i-3)*15;
    const y=130+Math.abs(i-3)*10;
    return '<circle cx="'+x+'" cy="'+y+'" r="'+(2+(i%3))+'" fill="'+tint+'" opacity=".65"/>';
  }).join('');
  const stars=Array.from({length:card.number%7+3},(_,i)=>{
    const x=42+i*21,y=72+(i%2)*12;
    return '<path d="M'+x+' '+(y-5)+'v10m-5-5h10" stroke="'+tint+'" stroke-width=".8" opacity=".6"/>';
  }).join('');
  const majorPattern=major?
    '<circle cx="90" cy="151" r="55" fill="none" stroke="'+tint+'" stroke-width="1.2"/><circle cx="90" cy="151" r="49" fill="none" stroke="'+tint+'" opacity=".4"/>'+
    '<path d="M90 85L153 151L90 217L27 151Z" fill="none" stroke="'+tint+'" opacity=".65"/>'
  :
    '<rect x="39" y="100" width="102" height="103" rx="50" fill="none" stroke="'+tint+'" stroke-width="1.2"/>'+
    '<path d="M90 82v143M22 151h136" stroke="'+tint+'" opacity=".4"/>';
  const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 300" role="img" aria-label="'+xml(card.name)+'">'+
  '<defs><linearGradient id="paper" x2="1" y2="1"><stop stop-color="#f4e8ce"/><stop offset=".5" stop-color="#e7d2ae"/><stop offset="1" stop-color="#cbb38e"/></linearGradient>'+
  '<radialGradient id="a"><stop stop-color="'+tint+'" stop-opacity=".28"/><stop offset="1" stop-color="'+tint+'" stop-opacity="0"/></radialGradient></defs>'+
  '<rect width="180" height="300" rx="9" fill="url(#paper)"/><rect x="7" y="7" width="166" height="286" rx="5" fill="none" stroke="#5a3a24" stroke-width="1.4"/>'+
  '<rect x="13" y="13" width="154" height="274" rx="3" fill="none" stroke="'+tint+'" opacity=".8"/>'+
  '<circle cx="90" cy="151" r="72" fill="url(#a)"/>'+stars+majorPattern+ornaments+
  '<text x="90" y="47" font-family="Georgia,serif" font-size="17" text-anchor="middle" fill="#4e3524">'+(major?(card.number===0?'✶':xml(card.number)) : xml(card.number))+'</text>'+
  '<text x="90" y="173" font-family="Georgia,serif" font-size="65" text-anchor="middle" fill="'+tint+'">'+xml(card.symbol)+'</text>'+
  '<path d="M35 237H145M55 242H125" stroke="'+tint+'" opacity=".8"/>'+
  '<text x="90" y="263" font-family="Georgia,serif" font-size="'+(card.name.length>20?10:12)+'" text-anchor="middle" fill="#382b20">'+xml(card.name)+'</text>'+
  '<text x="90" y="281" font-family="Georgia,serif" font-style="italic" font-size="8" text-anchor="middle" fill="#6a4932">'+xml(card.theme.slice(0,26))+'</text></svg>';
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
}
