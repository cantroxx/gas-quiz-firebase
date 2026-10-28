'use strict';
const questions=require('./bank.json');
const version='space-v3-25-2026-09-21';
function publicQuestions(bank=questions){return bank.map(({answer,why,...q})=>q);}
function decode(raw){try{return JSON.parse(raw);}catch{return null;}}
function valid(q,raw){
 const a=decode(raw);if(!a||!Array.isArray(a.evidence))return false;
 const needed=q.days?q.days.map(d=>`${q.target}:${d}`):[q.target];
 if(!needed.every(key=>a.evidence.includes(key))||a.evidence.length>7)return false;
 const v=a.value;
 if(q.type==='short')return typeof v==='string'&&v.trim().length>=5&&v.length<=400;
 if(!Array.isArray(v)||!v.length||new Set(v).size!==v.length)return false;
 if(q.type==='star')return v.length===1&&['polaris','u1','u2','u3','u4','u5','u6','d1','d2','d3','d4','d5','d6','d7','c1','c2','c3','c4','c5'].includes(v[0]);
 if(v.some(x=>!Number.isInteger(x)||x<0||x>=q.options.length))return false;
 return q.type==='choice'?v.length===1:q.type==='order'?v.length===q.options.length:v.length<=q.options.length;
}
function grade(answers,bank=questions){
 const items=bank.map((q,i)=>{const a=decode(answers[i]),v=a?.value,answered=valid(q,answers[i]);let correct=null;
 if(q.type!=='short')correct=answered&&v.length===q.answer.length&&(q.type==='multi'?q.answer.every(n=>v.includes(n)):q.answer.every((n,j)=>v[j]===n));
 const responseText=typeof v==='string'?v:Array.isArray(v)?v.map(n=>q.type==='star'?(n==='polaris'?'북극성':`별 표식 ${n}`):q.options[n]).join(q.type==='order'?' → ':' / '):'미응답';
 return {id:q.id,title:q.title,area:q.area,response:v??null,responseText,correct,manual:q.type==='short',answered};});
 return {correct:items.filter(q=>q.correct===true).length,automaticTotal:bank.filter(q=>q.type!=='short').length,manual:items.filter(q=>q.manual),items};
}
module.exports={questions,version,publicQuestions,valid,grade};
