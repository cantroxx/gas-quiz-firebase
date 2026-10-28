(function(root) {
  'use strict';
  let state = null, generation = 0;
  function reset() { state = null; generation++; }
  function create(fixture, identity, teacher) {
    state = { identity, teacher, market: structuredClone(fixture.market), companies: structuredClone(fixture.companies),
      news: structuredClone(fixture.news), account: null, journal: [], audit: [], section: 'market', selected: null, search: '', sort: 'name', message: '', error: false };
    return state;
  }
  root.DJ48SecuritiesState = { get: () => state, create, reset, generation: () => generation };
})(window);
