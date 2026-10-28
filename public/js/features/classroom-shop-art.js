(function(root) {
  'use strict';
  const base = '/images/classroom/market-v2/';
  const aliases = {
    shopSnack:'snack', shopLunch:'lunch', shopGift:'gift',
    shopReserveReading:'reserve/reading',
    shopReservePainting:'reserve/painting',
    shopReserveSports:'reserve/sports',
    shopReserveScience:'reserve/science',
    shopReserveCinema:'reserve/cinema',
    shopReserveCamera:'reserve/camera',
    shopReserveFlowers:'reserve/flowers',
    shopReserveWateringcan:'reserve/wateringcan',
    shopReserveBench:'reserve/bench',
    shopReserveMailbox:'reserve/mailbox',
    shopReserveTreasure:'reserve/treasure',
    shopReserveAquarium:'reserve/aquarium',

    'homework-pass':'homework', shopHomeworkPass:'homework', 'shop-homework-pass':'homework',
    'seat-choice':'seat', shopSeatChoice:'seat', 'shop-seat-choice':'seat',
    'praise-card':'praise', shopPraiseCard:'praise', 'shop-praise-card':'praise',
    'presentation-pass':'presentation', shopPresentationPass:'presentation', 'shop-presentation-pass':'presentation',
    'free-time':'freetime', shopFreeTime:'freetime', 'shop-free-time':'freetime',
    'billboard-ticket':'billboard', billboard:'billboard',
    shopMusicCoupon:'music', 'shop-music-coupon':'music',
    shopHelperTicket:'helper', 'shop-helper-ticket':'helper',
    shopMiniBadge:'badge', 'shop-mini-badge':'badge',
    'boost-farmer-friend':'scarecrow', 'boost-scarecrow':'scarecrow',
    'boost-big-tree':'tree', 'boost-tree':'tree', 'boost-fountain':'fountain',
    'boost-mini-tractor':'tractor', 'boost-tractor':'tractor',
    'boost-ripe-rice':'rice', 'boost-rice':'rice', 'boost-truck':'truck',
    'boost-log-pile':'logs', 'boost-logs':'logs', 'boost-bird-speaker':'birdspeaker',
    'boost-chick':'chick', 'boost-liquid-fertilizer':'fertilizer', 'boost-fertilizer':'fertilizer',
    'boost-greenhouse':'greenhouse', boostGreenhouse:'greenhouse',
    'boost-sprinkler':'sprinkler', boostSprinkler:'sprinkler',
    'boost-sun-lamp':'sunlamp', boostSunLamp:'sunlamp',
    'effect-golden-garden':'goldengarden', effectGoldenGarden:'goldengarden',
    'effect-star-classroom':'starclassroom', effectStarClassroom:'starclassroom'
  };
  function assetName(item = {}) {
    for(const key of [item.icon, item.itemId]) {
      if(Object.prototype.hasOwnProperty.call(aliases, key)) return aliases[key];
    }
    const title = String(item.title || '');
    const meanings = [[/간식|과자|음료|주스/,'snack'],[/급식|식판|배식/,'lunch'],[/자리|좌석/,'seat'],
      [/음악|노래|DJ/i,'music'],[/숙제/,'homework'],[/발표/,'presentation'],[/칭찬/,'praise'],
      [/도우미|도움/,'helper'],[/자유|보드게임|놀이/,'freetime'],[/뱃지|배지/,'badge'],[/전광판/,'billboard']];
    return meanings.find(([pattern]) => pattern.test(title))?.[1] || (item.itemType === 'billboardTicket' ? 'billboard' : 'gift');
  }
  function getSource(item) {
    const name = assetName(item);
    return name.startsWith('reserve/') ? `/images/classroom/market-reserve-v1/${name.slice(8)}-320.webp` : `${base}${name}-320.webp`;
  }
  function createImage(item = {}, customUrl = '', eager = false) {
    const image = document.createElement('img'), fallback = getSource(item);
    image.className = 'classroom-shop-card-image classroom-shop-art-image';
    image.alt = `${item.title || '교실 상품'} 이미지`;
    image.width = 320; image.height = 320;
    image.loading = eager ? 'eager' : 'lazy'; image.decoding = 'async';
    let stage = 0;
    const use = (url, builtin) => {
      image.removeAttribute('srcset'); image.removeAttribute('sizes');
      if(builtin) {
        image.srcset = `${url} 320w, ${url.replace('-320.webp','-640.webp')} 640w`;
        image.sizes = '(max-width: 600px) 132px, 176px';
      }
      image.src = url;
    };
    image.addEventListener('error', () => {
      if(stage === 0 && customUrl) { stage = 1; use(fallback, true); }
      else if(stage < 2 && fallback !== `${base}gift-320.webp`) { stage = 2; use(`${base}gift-320.webp`, true); }
      else {
        image.hidden = true;
        if(!image.parentElement?.querySelector('.classroom-shop-art-missing')) {
          const label = document.createElement('span'); label.className = 'classroom-shop-art-missing';
          label.textContent = '이미지 준비 중'; image.parentElement?.append(label);
        }
      }
    });
    use(customUrl || fallback, !customUrl);
    return image;
  }
  function updatePicker() {
    const select = document.getElementById('classroom-shop-icon-input');
    const preview = document.getElementById('classroom-shop-art-preview');
    if(!select || !preview) return;
    const title = document.getElementById('classroom-shop-title-input')?.value || '';
    const custom = document.getElementById('classroom-shop-image-url-input')?.value || '';
    const label = document.createElement('span');
    label.textContent = custom ? '등록된 상품 이미지' : select.selectedOptions[0]?.textContent || '상품 이미지';
    preview.replaceChildren(createImage({icon:select.value,title}, custom, true), label);
  }
  function bindPicker() {
    const select = document.getElementById('classroom-shop-icon-input');
    if(!select || select.dataset.artPickerBound) return;
    select.dataset.artPickerBound = 'true';
    select.addEventListener('change', () => {
      const custom = document.getElementById('classroom-shop-image-url-input');
      if(custom) custom.value = '';
      updatePicker();
    });
    document.getElementById('classroom-shop-title-input')?.addEventListener('input', updatePicker);
    updatePicker();
  }
  root.DJ48ClassroomShopArt = { getSource, createImage, updatePicker, bindPicker, hasIcon: key => Object.prototype.hasOwnProperty.call(aliases, key) };
})(window);
