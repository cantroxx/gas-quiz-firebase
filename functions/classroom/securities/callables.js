'use strict';
const {createService}=require('./service');
const {createAuthorization}=require('./authorization');
function register({onCall,region,db,ErrorType,...helpers}){
 const service=createService({db,ErrorType,authorize:createAuthorization(helpers)});
 const options={region,maxInstances:5,concurrency:20};
 return {
  classroomSecuritiesQuery:onCall(options,request=>service.query(request.auth?.uid,request.data)),
  classroomSecuritiesAction:onCall(options,request=>service.action(request.auth?.uid,request.data)),
  classroomSecuritiesAdminAction:onCall(options,request=>service.admin(request.auth?.uid,request.data))
 };
}
module.exports={register};
