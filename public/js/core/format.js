(function () {
  function getFirestoreTimestampMillis(value) {
    if(!value) return 0;
    if(value.toMillis) return value.toMillis();
    if(value.seconds) return (Number(value.seconds) * 1000) + Math.floor(Number(value.nanoseconds || 0) / 1000000);
    if(typeof value === 'number') return value;
    const parsed = Date.parse(String(value));
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  function normalizeDisplayImageUrl(value) {
    const raw = String(value || '').trim();
    if(!raw || raw === 'TODO') return '';
    const buildDriveImageUrl = fileId =>
      `https://lh3.googleusercontent.com/d/${encodeURIComponent(fileId)}`;
    if(/^https?:\/\//.test(raw)) {
      const fileMatch = raw.match(/\/file\/d\/([^/]+)/);
      if(fileMatch?.[1]) return buildDriveImageUrl(fileMatch[1]);
      const idMatch = raw.match(/[?&]id=([^&]+)/);
      if(raw.includes('drive.google.com') && idMatch?.[1]) return buildDriveImageUrl(idMatch[1]);
      return raw;
    }
    if(/^[A-Za-z0-9_-]{20,}$/.test(raw)) return buildDriveImageUrl(raw);
    return '';
  }

  function normalizeQuizAnswer(value) {
    return String(value || '').trim().replace(/\s+/g, '').toLowerCase();
  }

  function formatRankingElapsedText(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safeSeconds / 60);
    const remain = safeSeconds % 60;
    return minutes ? `${minutes}분 ${remain}초` : `${remain}초`;
  }

  window.DJ48Format = {
    getFirestoreTimestampMillis,
    normalizeDisplayImageUrl,
    normalizeQuizAnswer,
    formatRankingElapsedText
  };
})();
