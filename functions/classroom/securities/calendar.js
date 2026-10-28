'use strict';
const C=require('./contracts');
const DEFAULT_SCHEDULE={newsMinute:510,openMinute:570,closeMinute:870};
function clock(stamp) { const d=new Date(stamp+9*3600000); return {date:d.toISOString().slice(0,10),minute:d.getUTCHours()*60+d.getUTCMinutes()}; }
function at(date,minute) { C.date(date); return Date.parse(`${date}T00:00:00+09:00`)+minute*60000; }
function business(date,holidays=[]) {const day=new Date(C.date(date)).getUTCDay();return day!==0&&day!==6&&!holidays.includes(date);}
function shift(date,n){const d=new Date(C.date(date));d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function next(date,holidays=[],direction=1) {for(let i=0;i<370;i++){date=shift(date,direction);if(business(date,holidays))return date;}C.fail('failed-precondition','거래일 달력을 확인해 주세요.');}
function session(m,stamp) {
 const c=clock(stamp),schedule=m.sessionSchedule;
 let state=!business(c.date,m.holidayDates)?'holiday':c.minute<schedule.openMinute?'preopen':c.minute>=schedule.closeMinute?'closed':m.lastPriceDate!==c.date?'error':'open';
 const nextDate=business(c.date,m.holidayDates)&&c.minute<schedule.openMinute?c.date:next(c.date,m.holidayDates);
 return {session:state,date:c.date,priceDate:m.lastPriceDate,priceVersion:m.currentPriceVersion,nextOpenAt:at(nextDate,schedule.openMinute),serverNow:stamp};
}
function effectiveDate(m,publishedAt){const c=clock(publishedAt);return business(c.date,m.holidayDates)&&c.minute<m.sessionSchedule.newsMinute?c.date:next(c.date,m.holidayDates);}
module.exports={DEFAULT_SCHEDULE,clock,at,business,shift,next,session,effectiveDate};
