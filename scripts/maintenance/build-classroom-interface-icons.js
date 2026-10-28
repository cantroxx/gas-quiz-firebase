// Shared, code-native interface icons. Gem and product artwork use their own catalogs.
const fs = require('node:fs');
const path = require('node:path');
const out = path.resolve(__dirname, '../../public/images/classroom-icons');
const shapes = {
  'student-card': '<rect x="23" y="18" width="82" height="96" rx="20" fill="url(#paper)"/><rect x="36" y="30" width="56" height="46" rx="14" fill="#e5ddff"/><circle cx="64" cy="45" r="9" fill="#b5a1e8"/><path d="M46 68c0-18 36-18 36 0" fill="#b5a1e8"/><path d="M42 89h44M49 100h30" stroke="#9c8bc8"/>',
  bank: '<rect x="22" y="53" width="84" height="54" rx="12" fill="url(#paper)"/><path d="m17 51 47-30 47 30z" fill="url(#mint)"/><path d="M38 63v30M64 63v30M90 63v30M20 108h88" stroke="#8cbaa7" stroke-width="7"/><circle cx="64" cy="41" r="7" fill="url(#gold)"/>',
  exchange: '<circle cx="45" cy="76" r="26" fill="url(#mint)"/><circle cx="82" cy="79" r="26" fill="url(#gold)"/><path d="M23 38c15-19 50-19 68 0M81 24l12 15-20 2" fill="none"/><path d="M38 67v18M31 76h14M74 78h16" stroke="#fff"/>',
  'point-token': '<circle cx="64" cy="65" r="47" fill="url(#mint)"/><circle cx="64" cy="65" r="36" stroke="#edfdf6" fill="none"/><path d="M53 85V44h17c21 0 21 25 0 25H54" fill="none" stroke="#fff" stroke-width="8"/>',
  'dj-coin': '<circle cx="64" cy="65" r="47" fill="url(#gold)"/><circle cx="64" cy="65" r="36" stroke="#fff1c9" fill="none"/><path d="m64 38 8 17 19 3-14 13 3 19-16-9-16 9 3-19-14-13 19-3z" fill="#fff5d5" stroke="#c99343" stroke-width="2"/>',
  inventory: '<rect x="24" y="37" width="80" height="70" rx="16" fill="url(#mint)"/><path d="M45 38v-8c0-18 38-18 38 0v8" fill="none"/><path d="M25 65h78" stroke="#e6faf0"/><rect x="54" y="59" width="20" height="17" rx="5" fill="url(#gold)"/>',
  'point-shop': '<rect x="26" y="49" width="76" height="59" rx="13" fill="url(#paper)"/><path d="m23 48 10-26h62l10 26c0 17-20 17-20 0 0 17-21 17-21 0 0 17-21 17-21 0 0 17-20 17-20 0z" fill="url(#mint)"/><rect x="53" y="73" width="24" height="35" rx="7" fill="#c5e8dd"/>',
  'coin-shop': '<rect x="26" y="49" width="76" height="59" rx="13" fill="url(#paper)"/><path d="m23 48 10-26h62l10 26c0 17-20 17-20 0 0 17-21 17-21 0 0 17-21 17-21 0 0 17-20 17-20 0z" fill="url(#gold)"/><rect x="53" y="73" width="24" height="35" rx="7" fill="#ead9b4"/>',
  'group-purchase': '<path d="M28 52h72l-8 54H36z" fill="url(#mint)"/><path d="m41 52 12-26M87 52 75 26" fill="none"/><path d="M51 70v19M76 70v19" stroke="#f6fffa"/><circle cx="95" cy="35" r="17" fill="url(#gold)"/><path d="M95 26v18M86 35h18" stroke="#fff"/>',
  home: '<path d="M30 52h68v58H30z" fill="url(#paper)"/><path d="m17 55 47-37 47 37" fill="url(#mint)"/><rect x="54" y="72" width="23" height="38" rx="7" fill="#c6b5ee"/><rect x="37" y="58" width="13" height="15" rx="4" fill="#d4eaf3"/>'
};
const charms = {
  star: '<path d="m64 48 10 19 21 3-15 15 4 22-20-11-20 11 4-22-15-15 21-3z" fill="url(#gold)"/>',
  heart: '<path d="M64 107C29 84 28 66 40 56c8-7 19-4 24 5 5-9 16-12 24-5 12 10 11 28-24 51z" fill="#edb4c4"/>',
  book: '<rect x="35" y="51" width="58" height="55" rx="9" fill="#bccfe9"/><path d="M64 53v51M44 67h12M72 67h12M44 81h12M72 81h12" stroke="#fff"/>',
  pencil: '<path d="m44 100 4-20 34-35 15 15-34 35z" fill="url(#gold)"/><path d="m48 80 15 15M77 50l15 15" fill="none"/>',
  crown: '<path d="m32 62 17 13 15-26 15 26 17-13-7 43H39z" fill="url(#gold)"/><circle cx="64" cy="87" r="6" fill="#b7a4dd"/>',
  medal: '<path d="M44 48h40L72 80H56z" fill="#bdace7"/><circle cx="64" cy="89" r="24" fill="url(#gold)"/><path d="m64 74 5 10 11 2-8 8 1 11-9-5-9 5 1-11-8-8 11-2z" fill="#fff4d1" stroke="none"/>',
  trophy: '<path d="M43 51h42v25c0 24-42 24-42 0z" fill="url(#gold)"/><path d="M43 57H30c-2 22 8 26 18 26M85 57h13c2 22-8 26-18 26M64 94v14M48 110h32" fill="none"/>',
  sprout: '<path d="M64 103V75" fill="none"/><path d="M64 81C31 82 30 61 36 53c22-1 34 15 28 28zM64 77c-2-27 17-32 30-26 1 18-7 28-30 26z" fill="url(#mint)"/><path d="M46 106h36" stroke="#b8d2ba"/>',
  lightning: '<path d="M65 47 39 83h23l-4 29 31-44H67l9-21z" fill="url(#gold)"/>',
  ribbon: '<path d="m51 82-9 29 22-10 22 10-9-29" fill="#c5b4e7"/><circle cx="64" cy="71" r="25" fill="#edb4c4"/><circle cx="64" cy="71" r="14" fill="#fff2f4"/>',
  shield: '<path d="m64 47 29 12v21c0 18-29 32-29 32S35 98 35 80V59z" fill="#bed9e9"/><path d="m49 80 10 10 22-25" fill="none" stroke="#fff" stroke-width="6"/>'
};
for(const [name, charm] of Object.entries(charms)) {
  shapes[`keyring-${name}`] = '<circle cx="64" cy="26" r="14" fill="none" stroke="#a5a5ba" stroke-width="6"/><path d="M64 40v14" stroke="#a5a5ba" stroke-width="5"/>' + charm;
}
const defs = '<defs><linearGradient id="mint" x2=".8" y2="1"><stop stop-color="#c9efdf"/><stop offset="1" stop-color="#70b89c"/></linearGradient><linearGradient id="gold" x2=".8" y2="1"><stop stop-color="#ffedaa"/><stop offset="1" stop-color="#e7b66c"/></linearGradient><linearGradient id="paper" x2=".8" y2="1"><stop stop-color="#fffefa"/><stop offset="1" stop-color="#eae7f6"/></linearGradient></defs>';
for(const [name, body] of Object.entries(shapes)) {
  fs.writeFileSync(path.join(out, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">${defs}<ellipse cx="64" cy="114" rx="42" ry="6" fill="#4e647c" opacity=".10"/><g stroke="#657482" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>\n`);
}
console.log(`Built ${Object.keys(shapes).length} classroom interface icons`);
