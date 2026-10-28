// Small code-native illustrations. Existing navigation icons and generated originals stay intact.
const fs=require('node:fs'),path=require('node:path');
const out=path.resolve(__dirname,'../../public/images/classroom/illustrations');
const cream='#f5eddb',green='#bfd2b4',blue='#abc7d6',yellow='#e7c779',coral='#d99d86';
const shapes={
 snack:`<path d="M72 38h25v58H72z" fill="${coral}"/><path d="m72 38 8-10h17v10M87 38V21l13-6" fill="none"/><path d="M25 49h38l6 47H20z" fill="${cream}"/><path d="M25 49v-7h36v7" fill="${yellow}"/><circle cx="46" cy="79" r="20" fill="${yellow}"/><path d="m39 69 1 1m13 3 1 1m-10 12 1 1m-12-4 1 1m19 8 1 1" stroke-width="5"/>`,
 lunch:`<rect x="18" y="32" width="84" height="65" rx="10" fill="${cream}"/><rect x="25" y="39" width="20" height="19" rx="5" fill="${green}"/><rect x="51" y="39" width="20" height="19" rx="5" fill="${coral}"/><rect x="77" y="39" width="18" height="19" rx="5" fill="${yellow}"/><rect x="25" y="64" width="33" height="25" rx="9" fill="#fff"/><ellipse cx="79" cy="77" rx="16" ry="12" fill="${green}"/><path d="M112 36v58M108 36v12h8V36" fill="none"/>`,
 seat:`<rect x="38" y="24" width="52" height="41" rx="8" fill="${blue}"/><path d="M44 66h40v23H44z" fill="${yellow}"/><path d="M45 90v17M83 90v17M53 66v-8M75 66v-8" fill="none"/>`,
 music:`<rect x="26" y="29" width="76" height="70" rx="12" fill="${cream}"/><path d="M55 81V47l29-7v33M55 52l29-7" fill="none"/><ellipse cx="46" cy="84" rx="10" ry="7" fill="${blue}"/><ellipse cx="75" cy="77" rx="10" ry="7" fill="${blue}"/>`,
 homework:`<path d="M32 22h49l15 15v69H32z" fill="${cream}"/><path d="M81 22v16h15M44 52h28M44 65h18" fill="none"/><path d="m62 88 10 10 26-28" fill="none" stroke="${green}" stroke-width="8"/>`,
 presentation:`<rect x="23" y="26" width="82" height="55" rx="5" fill="${cream}"/><path d="M64 82v23M49 108l15-14 15 14" fill="none"/><path d="M39 63V51h13v12M61 63V42h13v21M83 63V36" fill="${blue}"/>`,
 praise:`<rect x="29" y="23" width="70" height="84" rx="7" fill="${cream}"/><path d="m64 36 8 15 17 2-12 12 3 17-16-8-16 8 3-17-12-12 17-2z" fill="${yellow}"/><path d="M46 94h36" fill="none"/>`,
 helper:`<path d="M28 45h72v55H28z" fill="${blue}"/><path d="M47 45V32h34v13" fill="none"/><path d="M55 59h18v10h10v18H73v10H55V87H45V69h10z" fill="${cream}"/>`,
 freetime:`<rect x="24" y="29" width="58" height="58" rx="10" fill="${cream}"/><circle cx="40" cy="45" r="3"/><circle cx="67" cy="45" r="3"/><circle cx="40" cy="70" r="3"/><circle cx="67" cy="70" r="3"/><path d="M85 64c-8 0-12 10-5 16l-9 17h31l-9-17c7-6 3-16-8-16z" fill="${green}"/>`,
 notebook:`<rect x="27" y="22" width="66" height="84" rx="6" fill="${cream}"/><path d="M42 23v82M52 44h26M52 57h21M52 70h18" fill="none"/><path d="m79 94 9-3 21-39-9-5-21 39z" fill="${yellow}"/>`,
 reading:`<path d="M19 29c17-4 33 0 45 9 12-9 28-13 45-9v64c-17-4-32 0-45 9-13-9-28-13-45-9z" fill="${cream}"/><path d="M64 38v64M30 48l21 5M30 64l21 5M78 53l19-5M78 69l19-5" fill="none"/>`,
 kindness:`<path d="M64 90 32 59c-20-23 9-45 32-19 23-26 52-4 32 19z" fill="${coral}"/><path d="M27 85c17-7 23 6 37 7 14-1 20-14 37-7M28 99l18-8M100 99l-18-8" fill="none"/>`,
 speech:`<path d="M27 27h74v52H67L44 98V79H27z" fill="${blue}"/><path d="M42 44h44M42 59h30" fill="none"/>`,
 diligence:`<path d="m66 63 28-42 9 6-27 43" fill="${yellow}"/><path d="m57 57 28 18-22 32-39-24z" fill="${green}"/><path d="m38 83 20 13M46 75l20 13" fill="none"/>`,
 empty:`<path d="M23 49h82v48H23z" fill="${green}"/><path d="M23 49h82l-11-21H34z" fill="${cream}"/><path d="M23 60h25l5 10h22l5-10h25" fill="none"/>`,
 billboard:`<rect x="18" y="28" width="92" height="62" rx="6" fill="${green}"/><path d="M36 91v16M92 91v16" fill="none"/><rect x="31" y="40" width="66" height="37" rx="3" fill="${cream}"/><path d="M42 52h40M42 65h26" fill="none"/>`
};
fs.mkdirSync(out,{recursive:true});
for(const [name,body] of Object.entries(shapes))fs.writeFileSync(path.join(out,`${name}.svg`),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><g stroke="#45594c" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`);
// Preserve recognizable coin-item silhouettes while matching the same stroke and palette.
const icons=path.resolve(__dirname,'../../public/images/classroom-icons');
const extras=fs.readdirSync(icons).filter(name=>/^(boost-|effect-|shop-mini-badge)/.test(name)&&name.endsWith('.svg'));
const palette=[cream,green,blue,yellow,coral,'#45594c'];
const rgb=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16));
const nearest=hex=>{
  const value=rgb(hex.length===4?'#'+[...hex.slice(1)].map(x=>x+x).join(''):hex);
  return palette.slice().sort((a,b)=>rgb(a).reduce((s,c,i)=>s+(c-value[i])**2,0)-rgb(b).reduce((s,c,i)=>s+(c-value[i])**2,0))[0];
};
for(const name of extras){
  const svg=fs.readFileSync(path.join(icons,name),'utf8').replace(/stroke="#[a-f\d]{3,6}"/gi,'stroke="#45594c"').replace(/stroke-width="[\d.]+"/g,'stroke-width="3.5"').replace(/fill="(#[a-f\d]{3,6})"/gi,(_,color)=>`fill="${nearest(color)}"`);
  fs.writeFileSync(path.join(out,name),svg);
}
console.log(`Built ${Object.keys(shapes).length} illustrations and ${extras.length} matching coin-item variants`);
