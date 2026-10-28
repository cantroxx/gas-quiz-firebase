const MAPLE_OFFICIAL_HASH_PATTERN = /^[A-Z]{40,1400}$/;
const MAPLE_OFFICIAL_LOOK_ALLOWED_HOSTS = new Set([
  "open.api.nexon.com",
  "avatar.maplestory.nexon.com"
]);
const MAPLE_OFFICIAL_IMAGE_CACHE_CONTROL = "public, max-age=86400, stale-while-revalidate=604800";
const MEAEGI_DRESSING_ROOM_ACTION_ID = "408995376681fbfb08405506ff5e438b6ee182f2be";
const MEAEGI_DRESSING_ROOM_ACTION_URL = "https://meaegi.com/dressing-room";
const MEAEGI_DRESSING_ROOM_ROUTER_STATE = "%5B%22%22%2C%7B%22children%22%3A%5B%22dressing-room%22%2C%7B%22children%22%3A%5B%22__PAGE__%22%2C%7B%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%5D%7D%2Cnull%2Cnull%2Ctrue%5D";
const MAPLE_COORDI_SLOT_KEYS = [
  "skin",
  "face",
  "hair",
  "cap",
  "faceDeco",
  "eyeDeco",
  "earring",
  "dress",
  "pants",
  "shoes",
  "glove",
  "subWeapon",
  "cape",
  "weapon"
];

function sendJsonResponse(response, statusCode, payload, cacheControl = "no-store") {
  response
    .status(statusCode)
    .set("Cache-Control", cacheControl)
    .set("Content-Type", "application/json; charset=utf-8")
    .send(JSON.stringify(payload));
}

function normalizeMapleOfficialHash(value) {
  const normalized = String(value || "").trim().replace(/\.png$/i, "").toUpperCase();
  return MAPLE_OFFICIAL_HASH_PATTERN.test(normalized) ? normalized : "";
}

function extractMapleOfficialHash(input) {
  const value = String(input || "").trim();
  if (!value) return "";
  const rawHash = normalizeMapleOfficialHash(value);
  if (rawHash) return rawHash;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "https:" || !MAPLE_OFFICIAL_LOOK_ALLOWED_HOSTS.has(parsed.hostname)) return "";
    const segments = parsed.pathname.split("/").filter(Boolean);
    const lastSegment = segments[segments.length - 1] || "";
    return normalizeMapleOfficialHash(lastSegment);
  } catch(error) {
    return "";
  }
}

function clampInteger(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(Math.round(number), max));
}

function normalizeMapleOfficialImageSize(value) {
  return String(value || "180") === "96" ? "96" : "180";
}

function buildMapleOfficialImageUrl(hash, size = "180") {
  const imageSize = normalizeMapleOfficialImageSize(size);
  return imageSize === "96"
    ? `https://avatar.maplestory.nexon.com/Character/${hash}.png`
    : `https://avatar.maplestory.nexon.com/Character/180/${hash}.png`;
}

function buildMapleOfficialImageProxyUrl(hash, query = {}) {
  const imageSize = normalizeMapleOfficialImageSize(query.imageSize || query.size || "180");
  const params = new URLSearchParams({ hash, size: imageSize });
  return `/api/maple/official-image?${params.toString()}`;
}

function buildMapleOfficialLookPayload(hash, query = {}) {
  const width = clampInteger(query.width, 220, 96, 1000);
  const height = clampInteger(query.height, 180, 96, 1000);
  const x = clampInteger(query.x, Math.round(width / 2), 0, width);
  const y = clampInteger(query.y, Math.round(height / 2 + 50), 0, height + 200);
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    x: String(x),
    y: String(y)
  });
  const lookUrl = `https://open.api.nexon.com/static/maplestory/character/look/${hash}?${params.toString()}`;
  const character96Url = buildMapleOfficialImageUrl(hash, "96");
  const character180Url = buildMapleOfficialImageUrl(hash, "180");
  const proxyImageUrl = buildMapleOfficialImageProxyUrl(hash, query);
  return {
    success: true,
    renderer: "nexon-official-look",
    hash,
    imageUrl: proxyImageUrl,
    urls: {
      look: lookUrl,
      character96: character96Url,
      character180: character180Url,
      proxyImage: proxyImageUrl
    },
    size: { width, height, x, y }
  };
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringify(entry)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableStringify(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

function clampMapleFlag(value, fallback = 1) {
  const number = Number(value);
  return number === 0 || number === 1 ? number : fallback;
}

function clampMapleCode(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0 || number > 99999999) return null;
  return number;
}

function normalizeMapleOfficialCoordiPayload(input = {}) {
  const itemCode = {};
  const sourceItemCode = input.itemCode && typeof input.itemCode === "object" ? input.itemCode : {};
  MAPLE_COORDI_SLOT_KEYS.forEach((slot) => {
    const code = clampMapleCode(sourceItemCode[slot]);
    if (code) itemCode[slot] = code;
  });
  if (!itemCode.skin || !itemCode.face || !itemCode.hair) return null;
  return {
    gender: Number(input.gender) === 0 ? 0 : 1,
    earType: clampInteger(input.earType, 0, 0, 3),
    weaponMotion: clampInteger(input.weaponMotion, 0, 0, 4),
    variation: clampInteger(input.variation, 0, 0, 20),
    variationType: clampInteger(input.variationType, 0, 0, 20),
    weaponBaseEffect: clampMapleFlag(input.weaponBaseEffect),
    weaponJumpEffect: clampMapleFlag(input.weaponJumpEffect),
    weaponSpecialEffect: clampMapleFlag(input.weaponSpecialEffect),
    capeEffect: clampMapleFlag(input.capeEffect),
    hideWeaponOnSkill: clampMapleFlag(input.hideWeaponOnSkill),
    capEffect: clampMapleFlag(input.capEffect),
    floatEffect: clampMapleFlag(input.floatEffect),
    itemCode,
    itemPrism: input.itemPrism && typeof input.itemPrism === "object" ? input.itemPrism : {}
  };
}

function extractMapleOfficialHashFromRsc(text) {
  const match = String(text || "").match(/T[0-9a-fA-F]+,([A-Z]{40,1400})/);
  return normalizeMapleOfficialHash(match && match[1]);
}

async function requestMeaegiOfficialCoordiHash(payload) {
  const response = await fetch(MEAEGI_DRESSING_ROOM_ACTION_URL, {
    method: "POST",
    headers: {
      "accept": "text/x-component",
      "content-type": "text/plain;charset=UTF-8",
      "next-action": MEAEGI_DRESSING_ROOM_ACTION_ID,
      "next-router-state-tree": MEAEGI_DRESSING_ROOM_ROUTER_STATE,
      "origin": "https://meaegi.com",
      "referer": "https://meaegi.com/dressing-room"
    },
    signal: AbortSignal.timeout(12000),
    body: JSON.stringify([payload])
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`meaegi-action-${response.status}`);
  }
  const hash = extractMapleOfficialHashFromRsc(text);
  if (!hash) {
    throw new Error("meaegi-action-missing-hash");
  }
  return hash;
}


module.exports = {normalizeMapleOfficialCoordiPayload,requestMeaegiOfficialCoordiHash,buildMapleOfficialLookPayload,extractMapleOfficialHash,buildMapleOfficialImageUrl};
