(function (root) {
  'use strict';
  const KEY = 'dj48-cloud-tower-prototype-v1';
  function create(storage, domain) {
    let available = true, rows = [];
    function valid(r) {
      return r && r.version === domain.VERSION && typeof r.nickname === 'string' && r.nickname.length > 0 && r.nickname.length <= 12 &&
        Number.isInteger(r.score) && r.score > 0 && Number.isInteger(r.floor) && r.floor > 0 &&
        Number.isFinite(r.accuracy) && r.accuracy >= 0 && r.accuracy <= 100 &&
        Number.isFinite(r.elapsed) && r.elapsed >= 0 && r.elapsed <= domain.DURATION && Number.isFinite(r.createdAt);
    }
    function read() {
      try {
        const data = JSON.parse(storage.getItem(KEY) || '[]');
        if (Array.isArray(data)) rows = data.filter(valid);
      } catch (_) { available = false; }
      return rows;
    }
    function best() {
      const names = new Set();
      return [...rows].sort(domain.compare).filter(row => {
        if (names.has(row.nickname)) return false;
        names.add(row.nickname); return true;
      }).slice(0, 50);
    }
    function save(row) {
      if (!valid(row)) return { saved: false, improved: false };
      read();
      const previous = best().find(r => r.nickname === row.nickname);
      const improved = !previous || domain.compare(row, previous) < 0;
      if (improved) rows = rows.filter(r => r.nickname !== row.nickname).concat(row);
      rows = best();
      try { storage.setItem(KEY, JSON.stringify(rows)); available = true; }
      catch (_) { available = false; }
      return { saved: available, improved };
    }
    read();
    return { best, save, read, isAvailable: () => available };
  }
  const api = { KEY, create };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CloudTowerStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
