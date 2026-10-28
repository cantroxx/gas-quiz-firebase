'use strict';
const {item}=require('./question');
const packs=Object.assign({},require('./transfer-packs-korean'),require('./transfer-packs-science'),require('./transfer-packs-social'));
function questions(u){const p=packs[u.id];if(!p)return [];
 return p.questions.map(([type,prompt,correct,wrong,explanation],i)=>item(`${u.id}:unit-transfer-${i}`,`${p.title}\n${p.text}`,prompt,correct,wrong,explanation,{difficulty:3,objective:'unit-core-evidence',family:'unit-'+type,materialId:u.id+':unit-transfer'}));
}
module.exports={packs,questions};
