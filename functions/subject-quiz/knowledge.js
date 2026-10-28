'use strict';
const inquiry=require('./inquiry'),history=require('./history');
module.exports={generate:(unit,r,index)=>unit.group.endsWith('history')?history.generate(unit,r,index):inquiry.generate(unit,r,index)};
