'use strict';
async function reviewSetup(page){for(let i=0;i<6&&await page.locator('#setup-next').count();i++)await page.click('#setup-next');}
async function startTower(page){await reviewSetup(page);if(await page.locator('#setup-guide').getAttribute('aria-pressed')==='true')await page.click('#setup-guide');await page.click('#tower-start');}
module.exports={reviewSetup,startTower};
