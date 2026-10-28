'use strict';
const { createCoordiPreviewService } = require('./service');
const { createReader } = require('./local-renderer/browser-reader');
const local = require('./local-provider');

function environmentConfig(env = process.env) {
  return {
    mode: env.COORDI_RENDERER_MODE || 'official',
    baseUrl: env.COORDI_DATA_BASE_URL,
    snapshot: env.COORDI_DATA_SNAPSHOT,
    manifestSha256: env.COORDI_MANIFEST_SHA256
  };
}

function createConfiguredPreviewService({ config = environmentConfig(), allowLoopback = false, fetchData, authorize, ErrorType, ...deps }) {
  if (config.mode === 'official') return createCoordiPreviewService({ authorize, ErrorType, ...deps });
  if (config.mode !== 'local') throw Error('Unknown coordi renderer mode');
  const base = new URL(config.baseUrl);
  const loopback = allowLoopback && base.protocol === 'http:' && base.hostname === '127.0.0.1';
  if (!loopback && (base.protocol !== 'https:' || !['dj48-quiztown-firebase.web.app', 'dj48-quiztown-firebase.firebaseapp.com'].includes(base.hostname))) {
    throw Error('Unapproved coordi data origin');
  }
  if (!/^[A-F0-9]{64}$/.test(config.snapshot) || base.pathname !== `/codi/${config.snapshot}/` || !/^[a-f0-9]{64}$/.test(config.manifestSha256)) {
    throw Error('Pinned local data config required');
  }
  const reader = createReader(base.href, { origin: base.origin, manifestSha256: config.manifestSha256, fetch: fetchData });
  let initialization;
  const getProvider = () => initialization || (initialization = local.createLocalProvider({ reader }).catch(error => {
    initialization = null;
    throw error;
  }));
  const asCallableError = error => error.code === 'coordi-unsupported'
    ? new ErrorType('failed-precondition', error.message, error.details) : error;
  let active = 0;
  const queue = [];
  const provider = {
    id: 'quiztown-local-static',
    version: [config.snapshot, config.manifestSha256, require('./local-renderer/core').version, 'default-outfit-v1', 'http-v1'].join(':'),
    normalize(input) {
      try { return local.normalize(input); } catch (error) { throw asCallableError(error); }
    },
    async render(payload) {
      // Bound live compositions as well as decoded asset and finished PNG caches.
      if (active >= 2) {
        if (queue.length >= 8) throw new ErrorType('resource-exhausted', '미리보기 요청이 많아요. 잠시 후 다시 시도해 주세요.');
        await new Promise(resolve => queue.push(resolve));
      } else active++;
      try {
        return await (await getProvider()).render(payload);
      } catch (error) {
        throw asCallableError(error);
      } finally {
        const next = queue.shift();
        if (next) next(); else active--;
      }
    }
  };
  // Authorization precedes normalization, lazy manifest fetch, image-cache and queue access.
  // A local failure is returned to the client; it never invokes the official provider.
  const render = createCoordiPreviewService({ provider, authorize, ErrorType });
  render.stats = () => ({ ...reader.stats(), active, queued: queue.length });
  return render;
}
module.exports = { createConfiguredPreviewService, environmentConfig };
