// Code-native gemstone artwork. Run explicitly; preserves existing asset URLs and icon keys.
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../../public/images/classroom-icons');
const gems = [
  ['reading', '독서', '#64c7ad', '#168e7b', '<path d="M39 49q14-5 25 3 11-8 25-3v29q-14-4-25 3-11-7-25-3Z"/><path d="M64 52v29M46 58l10 2m-10 7 10 2m16-9 10-2m-10 11 10-2" fill="none"/>'],
  ['math', '수학', '#78b5f8', '#4964c9', '<rect x="44" y="43" width="40" height="42" rx="7"/><path d="M52 56h12m-6-6v12m8 10h11m-11 7h11" fill="none"/>'],
  ['history', '역사', '#e8b971', '#b9783f', '<path d="m40 53 24-15 24 15ZM44 80h40M48 55v23m16-23v23m16-23v23M40 85h48"/>'],
  ['science', '과학', '#70d7ca', '#278cab', '<path d="M55 41h18m-15 1v16L45 79q-3 7 5 7h28q8 0 5-7L70 58V42"/><path d="M51 71h26" fill="none"/><circle cx="60" cy="77" r="2" fill="#fff" stroke="none"/>'],
  ['writing', '글쓰기', '#c5a1f5', '#8b62c9', '<rect x="42" y="42" width="34" height="44" rx="5"/><path d="M50 53h17m-17 8h12" fill="none"/><path d="m64 76 19-25 7 6-19 25-10 5Z"/>'],
  ['speech', '발표', '#79c8ef', '#3c85bc', '<path d="M42 44h44v31H65L53 85V75H42Z"/><path d="M51 54h26m-26 11h17" fill="none"/>'],
  ['teamwork', '협동', '#b2d789', '#4b956a', '<circle cx="53" cy="53" r="8"/><circle cx="77" cy="53" r="8"/><path d="M40 80q1-17 13-17t13 17m-2 0q1-17 13-17t13 17Z"/>'],
  ['diligence', '성실', '#f0c578', '#c28b42', '<circle cx="64" cy="64" r="23"/><path d="M64 49v16l12 7" fill="none"/><path d="M61 35h6" fill="none"/>'],
  ['challenge', '도전', '#f2aa86', '#cb675a', '<path d="m39 84 22-39 27 39Z"/><path d="m53 59 8 8 7-9M61 45V33l18 5-18 6"/>'],
  ['kindness', '친절', '#ef9cba', '#c35f8d', '<path d="M64 85 44 66c-16-17 7-33 20-16 13-17 36-1 20 16Z"/>'],
  ['creativity', '창의', '#e8b0e2', '#9a6dc4', '<path d="M55 75c0-9-10-10-10-23a19 19 0 0 1 38 0c0 13-10 14-10 23Zm0 8h18m-15 7h12"/><path d="m57 53 7 7 7-7m-7 7v14" fill="none"/>'],
  ['focus', '집중', '#9eb8f3', '#626bbd', '<circle cx="64" cy="64" r="23"/><circle cx="64" cy="64" r="13" fill="none"/><circle cx="64" cy="64" r="4"/><path d="M64 35v7m0 44v7M35 64h7m44 0h7" fill="none"/>'],
  ['keyring', '보석 키링', '#8acbf1', '#6862c5', '<path d="M45 54h38l10 14-29 25-29-25Z"/><path d="m45 54 19 39 19-39M35 68h58M57 54l-6 14m20-14 6 14" fill="none"/>']
];

for (const [name, label, light, dark, symbol] of gems) {
  const keyring = name === 'keyring';
  const body = keyring ? 'M36 39H92L110 65 93 99 64 115 35 99 18 65Z'
    : ['reading', 'writing', 'diligence', 'math'].includes(name)
      ? 'M41 17H87L108 38V86L87 108H41L20 86V38Z'
      : 'M64 12 99 31 112 66 94 98 64 114 34 98 16 66 29 31Z';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" role="img" aria-label="${label} 젬">
  <defs>
    <linearGradient id="stone" x1=".2" y1="0" x2=".8" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${light}"/><stop offset=".52" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient>
    <linearGradient id="gold" x2=".65" y2="1"><stop stop-color="#fff6d5"/><stop offset=".35" stop-color="#e8cc95"/><stop offset=".7" stop-color="#b58a52"/><stop offset="1" stop-color="#f9e4b1"/></linearGradient>
    <linearGradient id="face" x2=".7" y2="1"><stop stop-color="#fff" stop-opacity=".6"/><stop offset=".6" stop-color="${light}" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity=".32"/></linearGradient>
    <clipPath id="cut"><path d="${body}"/></clipPath>
  </defs>
  <ellipse cx="64" cy="117" rx="31" ry="4" fill="${dark}" opacity=".12"/>
  ${keyring ? '<circle cx="64" cy="22" r="14" fill="none" stroke="#9f835e" stroke-width="6"/><circle cx="64" cy="21" r="14" fill="none" stroke="url(#gold)" stroke-width="4"/>' : ''}
  <path d="${body}" transform="translate(0 3)" fill="${dark}" opacity=".8"/>
  <path d="${body}" fill="url(#stone)" stroke="#a07c53" stroke-width="3" stroke-linejoin="round"/>
  <g clip-path="url(#cut)">
    <path d="M10 12 41 17 45 40 20 66Z" fill="#fff" opacity=".5"/>
    <path d="m41 17 46 0-7 23H45Z" fill="#fff" opacity=".65"/>
    <path d="m87 17 30 26-21 25-16-28Z" fill="#fff" opacity=".18"/>
    <path d="m96 68 22 12-31 35-7-27Z" fill="${dark}" opacity=".65"/>
    <path d="m80 88 7 27H41l4-27Z" fill="#fff" opacity=".25"/>
    <path d="m20 66 25 22-4 27L10 83Z" fill="${dark}" opacity=".5"/>
    <path d="M45 36H80L96 52V78L80 94H45L31 78V52Z" fill="url(#face)" stroke="#fff" stroke-opacity=".45" stroke-width="1.5"/>
    <path d="m26 41 18-18h37" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".65"/>
  </g>
  <path d="${body}" fill="none" stroke="url(#gold)" stroke-width="3" stroke-linejoin="round"/>
  <g transform="translate(0 2)" fill="${dark}" stroke="${dark}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" opacity=".5">${symbol}</g>
  <g fill="#fff6dc" stroke="${dark}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${symbol}</g>
  <path d="m104 17 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z" fill="#e8c780"/>
  <path d="m26 84 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#fff9e6"/>
  <circle cx="19" cy="35" r="2" fill="${light}"/>
</svg>\n`;
  fs.writeFileSync(path.join(output, keyring ? 'keyring-gem.svg' : `gem-${name}.svg`), svg.replace(/ +\n/g, '\n'));
}
console.log(`Built ${gems.length} classroom gemstone icons.`);
