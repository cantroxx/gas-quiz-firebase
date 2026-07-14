#!/usr/bin/env node

// 하우징 가구 에셋 묶음(번들) 빌드
//
// 하우징 원본 저장소의 furni/ 폴더(가구별 정의 JSON + 스프라이트시트 JSON + PNG)를
// 단일 JSON으로 합친 뒤 gzip으로 압축해 산출한다.
// 산출물은 Storage(housingAssets/)에 업로드해 "로그인+학급 연결" 사용자에게만 제공한다.
// (가구 이미지는 Habbo © Sulake 저작물 — public/ 폴더로 공개 배포하지 않는다)
//
// 사용법:
//   node scripts/maintenance/build-housing-bundle.js [--source <furni 폴더>] [--dev]
//   --source  기본값: ../habboasset/housing/furni (이 저장소 기준 상대 경로)
//   --dev     public/housing/dev-assets/ 에도 복사 (로컬 개발용, gitignore + 배포 제외 대상)

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..', '..');
const BUNDLE_VERSION = 6;
const OUT_DIR = path.join(ROOT, 'private', 'housing-assets');
const DEV_DIR = path.join(ROOT, 'public', 'housing', 'dev-assets');

function parseArgs(argv) {
  const args = {
    source: path.resolve(ROOT, '..', 'habboasset', 'housing', 'furni'),
    dev: false
  };
  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--dev') args.dev = true;
    else if (arg === '--source') args.source = path.resolve(argv[++index] || '');
    else if (arg.startsWith('--source=')) args.source = path.resolve(arg.slice('--source='.length));
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readFurniEntry(sourceDir, classname) {
  const dir = path.join(sourceDir, classname);
  const defPath = path.join(dir, `${classname}.json`);
  const sheetPath = path.join(dir, `${classname}_spritesheet.json`);
  const pngPath = path.join(dir, `${classname}.png`);

  if (!fs.existsSync(defPath) || !fs.existsSync(sheetPath) || !fs.existsSync(pngPath)) {
    return null;
  }

  const def = JSON.parse(fs.readFileSync(defPath, 'utf8'));
  const sheet = JSON.parse(fs.readFileSync(sheetPath, 'utf8'));
  return {
    def,
    frames: sheet.frames || {},
    png: fs.readFileSync(pngPath).toString('base64')
  };
}

function buildBundle(sourceDir) {
  const classnames = fs.readdirSync(sourceDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name)
    .sort();

  const furni = {};
  const skipped = [];
  for (const classname of classnames) {
    const entry = readFurniEntry(sourceDir, classname);
    if (entry) furni[classname] = entry;
    else skipped.push(classname);
  }

  return {
    bundle: {
      version: BUNDLE_VERSION,
      generatedAt: new Date().toISOString(),
      count: Object.keys(furni).length,
      furni
    },
    skipped
  };
}

function verifyGzipFile(filePath, expectedCount) {
  const raw = zlib.gunzipSync(fs.readFileSync(filePath));
  const parsed = JSON.parse(raw.toString('utf8'));
  if (parsed.count !== expectedCount || Object.keys(parsed.furni).length !== expectedCount) {
    throw new Error(`번들 검증 실패: count=${parsed.count}, keys=${Object.keys(parsed.furni).length}, expected=${expectedCount}`);
  }
  const sampleName = Object.keys(parsed.furni)[0];
  const sample = parsed.furni[sampleName];
  if (!sample.def || !sample.frames || !sample.png) {
    throw new Error(`번들 검증 실패: ${sampleName} 항목에 def/frames/png 누락`);
  }
  Buffer.from(sample.png, 'base64'); // base64 복원 가능 여부
  return parsed;
}

function main() {
  const args = parseArgs(process.argv);
  if (!fs.existsSync(args.source)) {
    throw new Error(`furni 원본 폴더를 찾을 수 없습니다: ${args.source}`);
  }

  const { bundle, skipped } = buildBundle(args.source);
  const json = JSON.stringify(bundle);
  const gz = zlib.gzipSync(Buffer.from(json, 'utf8'), { level: 9 });

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const fileName = `furni-bundle-v${BUNDLE_VERSION}.json.gz`;
  const outPath = path.join(OUT_DIR, fileName);
  fs.writeFileSync(outPath, gz);

  const parsed = verifyGzipFile(outPath, bundle.count);
  const md5 = crypto.createHash('md5').update(gz).digest('hex');

  console.log(`가구 수: ${bundle.count} (건너뜀: ${skipped.length}${skipped.length ? ' — ' + skipped.join(', ') : ''})`);
  console.log(`원본 JSON: ${(json.length / 1024 / 1024).toFixed(2)}MB → gzip: ${(gz.length / 1024 / 1024).toFixed(2)}MB`);
  console.log(`산출: ${outPath}`);
  console.log(`md5: ${md5}`);
  console.log(`검증: 압축 해제·파싱·${parsed.count}종 확인 통과`);

  if (args.dev) {
    fs.mkdirSync(DEV_DIR, { recursive: true });
    fs.copyFileSync(outPath, path.join(DEV_DIR, fileName));
    console.log(`개발용 복사: ${path.join(DEV_DIR, fileName)}`);
  }
}

main();
