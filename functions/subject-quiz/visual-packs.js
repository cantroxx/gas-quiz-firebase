'use strict';
const {item}=require('./question');
const catalog={...require('./visual-science'),...require('./visual-social')};
function questions(u){return (catalog[u.id]||[]).flatMap(c=>c.tasks.map(([prompt,correct,wrong,explanation],i)=>item(`${u.id}:visual-${c.key}-${i}`,c.passage,prompt,correct,wrong,explanation,{diagram:c.diagram,materialId:`${u.id}:visual-${c.key}`,objective:`visual-${c.key}`,difficulty:i+1,family:['visual-read','visual-apply','visual-evaluate'][i]})));}
module.exports={catalog,questions};
