const assert = require('node:assert/strict');
const { createHomeRepository } = require('../../public/js/infrastructure/home-repository.js');

function createCollectionSnapshot(docs = []) {
  return { docs };
}

async function testHomeRepositoryReadsMemberCollections() {
  const calls = [];
  const repository = createHomeRepository({
    getFirebaseFunctions:()=>({httpsCallable:name=>async()=>({data:{records:[{badgeId:'math',answered:101}],catalog:[{titleId:'title-1',titleName:'Title 1'}]}})}),
    getUserEconomyForRender: async () => ({ djCoin: 9 }),
    getFirestoreDb: () => ({
      collection: name => ({
        orderBy: field => ({
          get: async () => {
            calls.push(['order', name, field]);
            return createCollectionSnapshot([{
              id: 'title-1',
              data: () => ({ titleName: 'Title 1' })
            }]);
          }
        }),
        doc: id => {
          calls.push(['doc', name, id]);
          return {
            get: async () => ({ exists: true, data: () => ({ id }) }),
            collection: childName => ({
              get: async () => {
                calls.push(['sub', name, id, childName]);
                return createCollectionSnapshot([{ id: childName }]);
              }
            })
          };
        }
      })
    })
  });

  assert.deepEqual(await repository.getUserEconomyForRender(), { djCoin: 9 });
  assert.deepEqual((await repository.getUserTitleSummary('member-1')).data(), { id: 'member-1' });
  assert.deepEqual(await repository.getUserTitles('member-1'), createCollectionSnapshot([{ id: 'titles' }]));
  const progress=await repository.getUserBadges('member-1');assert.equal(progress.docs[0].data().starCount,1);assert.equal(progress.docs[0].data().correct,1);
  assert.deepEqual(await repository.loadTitleCatalog({
    normalizeTitleCatalogDoc: doc => ({ titleId: doc.id, titleName: doc.data().titleName })
  }), [{ titleId: 'title-1', titleName: 'Title 1' }]);
  assert.deepEqual(calls, [
    ['doc', 'userTitleSummary', 'member-1'],
    ['doc', 'userTitles', 'member-1'],
    ['sub', 'userTitles', 'member-1', 'titles']
  ]);
}

async function run() {
  await testHomeRepositoryReadsMemberCollections();
  console.log('Infrastructure tests passed: home-repository');
}

run().catch(error => {
  console.error(error);
  process.exit(1);
});
