'use strict';
async function answerCurrent(page){
const q=await page.evaluate(()=>{const s=FWStore.get().quiz;return FWStudy.generate(s.question.template,s.question.seed);});
if(q.type==='written'){await page.fill('#study-written','내 생각: '+q.explanation);await page.click('#study-submit');return q;}
for(const f of q.fields){if(f.kind==='fraction'){const [n,d]=f.answer.split('/').map(Number);await page.fill(`[data-whole="${f.id}"]`,String(Math.floor(n/d)));await page.fill(`[data-numerator="${f.id}"]`,String(n%d));}else if(f.kind==='number')await page.fill(`[data-answer="${f.id}"]`,f.answer);else for(const a of Array.isArray(f.answer)?f.answer:[f.answer])await page.click(`[data-field="${f.id}"][data-option="${f.options.indexOf(a)}"]`);}
await page.click('#study-submit');return q;
}
module.exports={answerCurrent};
