(function (root) {
  'use strict';
  // Raster pages preserve Korean glyphs on every computer without remote PDF/font libraries.
  // Each A4 page is painted at 2x, then embedded as a JPEG in a standards-compliant PDF.
  const W = 794, H = 1123, M = 48;
  const enc = s => new TextEncoder().encode(s);
  async function download(room, report) {
    await document.fonts.ready;
    const pages = []; let canvas, ctx, y;
    const font = (size, bold = false) => { ctx.font = `${bold ? 700 : 400} ${size}px "Noto Sans KR", "Apple SD Gothic Neo", sans-serif`; };
    function text(s, x, yy, size = 12, color = '#343d30', bold = false) { font(size, bold); ctx.fillStyle = color; ctx.fillText(String(s), x, yy); }
    function line(yy) { ctx.strokeStyle = '#dfdfd2'; ctx.beginPath(); ctx.moveTo(M, yy); ctx.lineTo(W - M, yy); ctx.stroke(); }
    function wrap(s, max, size = 12, bold = false) { font(size, bold); const rows = []; let row = ''; for (const c of String(s)) { if (c === '\n') { rows.push(row); row = ''; continue; } if (ctx.measureText(row + c).width > max && row) { rows.push(row); row = c; } else row += c; } if (row) rows.push(row); return rows; }
    function page(title) {
      canvas = document.createElement('canvas'); canvas.width = W * 2; canvas.height = H * 2; ctx = canvas.getContext('2d'); ctx.scale(2, 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); pages.push(canvas);
      text('분수 피자집 | 4학년 2학기 1단원 평가', M, 46, 11, '#bd422d', true);
      text(title, M, 88, 25, '#343d30', true);
      const label = `${room.school} · ${room.grade}학년 ${room.classNo}반 · ${new Date(room.createdAt).toLocaleDateString('ko-KR')}`;
      const rows = wrap(label, W - M * 2, 11); rows.forEach((row, i) => text(row, M, 112 + i * 17, 11, '#727868')); y = 140 + (rows.length - 1) * 17; line(y); y += 27;
    }
    function ensure(height, title) { if (y + height > H - 70) page(title + ' (계속)'); }
    function paragraph(s, size = 12, color = '#343d30') { const rows = wrap(s, W - 2 * M, size); for (const row of rows) { ensure(21, '평가 결과'); text(row, M, y, size, color); y += 21; } y += 8; }
    page('우리 반 평가 결과');
    ctx.fillStyle = '#f0f3e8'; ctx.fillRect(M, y - 8, W - M * 2, 86);
    text('채점 대상', M + 20, y + 15, 11, '#727868'); text(`${report.total}명`, M + 20, y + 48, 25, '#466546', true);
    text('학급 평균', M + 240, y + 15, 11, '#727868'); text(`${report.average}점`, M + 240, y + 48, 25, '#466546', true);
    text('평가 문항', M + 470, y + 15, 11, '#727868'); text('25문항 / 100점', M + 470, y + 48, 21, '#466546', true); y += 110;
    paragraph('문항당 4점. 입장한 학생의 저장된 답안으로 채점했습니다. 미제출 학생의 빈 답안은 오답에 포함하고, 미입장 학생은 점수와 평균에서 제외합니다.', 11, '#727868');
    paragraph(`미입장 번호: ${report.absent.length ? report.absent.map(n => n + '번').join(', ') : '없음'}`, 11, '#727868');
    text('학생별 점수', M, y, 17, '#343d30', true); y += 29;
    function tableHead() { ctx.fillStyle = '#f4f1e8'; ctx.fillRect(M, y - 16, W - 2 * M, 28); ['번호', '점수', '정답 수', '제출 상태', '다시 볼 문제'].forEach((s, i) => text(s, [M + 10, M + 65, M + 128, M + 205, M + 300][i], y + 2, 11, '#466546', true)); y += 36; }
    tableHead();
    for (let n = 1; n <= room.lastNumber; n++) {
      const row = report.students.find(s => s.number === n), wrong = row ? row.wrong.join(', ') || '없음' : '-';
      const wrapped = wrap(wrong, W - M * 2 - 312, 10), height = Math.max(33, wrapped.length * 16 + 12);
      if (y + height > H - 70) { page('학생별 점수'); tableHead(); }
      text(`${n}번`, M + 10, y, 11, '#343d30', true); text(row ? `${row.score}점` : '-', M + 65, y, 12, '#466546', true); text(row ? `${row.correct}/25` : '-', M + 128, y, 11);
      text(!row ? '미입장' : row.submitted ? '최종 제출' : '미제출 마감', M + 205, y, 10, row?.submitted ? '#466546' : '#a2763e');
      wrapped.forEach((s, i) => text(s, M + 300, y + i * 16, 10, '#727868')); y += height; line(y - 13);
    }
    page('문항별 오답 분석');
    paragraph(`오답이 많은 순서입니다. 오답률의 분모는 채점 대상 ${report.total}명입니다. 빈 답안은 오답에 포함합니다.`, 11, '#727868');
    const questions = [...report.questions].sort((a, b) => b.wrong - a.wrong || a.id - b.id);
    for (const q of questions) {
      const title = `${q.id}번 · ${q.station}`, promptLines = wrap(q.expression ? `${q.prompt}  [${q.expression}]` : q.prompt, W - M * 2 - 16, 11), answerLines = wrap(`정답: ${q.answer}`, W - M * 2 - 16, 11, true), feedbackLines = wrap(q.feedback, W - M * 2 - 16, 10);
      const height = 46 + promptLines.length * 18 + answerLines.length * 18 + feedbackLines.length * 16 + 22;
      ensure(height, '문항별 오답 분석');
      text(title, M, y, 13, '#343d30', true); text(`${q.wrong}/${q.total}명 오답 · ${q.total ? Math.round(q.wrong / q.total * 100) : 0}% · 빈 답안 ${q.blank}명`, W - M - 245, y, 10, '#bd422d', true); y += 17;
      ctx.fillStyle = '#f0e8df'; ctx.fillRect(M, y - 4, W - M * 2, 4); ctx.fillStyle = '#cc8c72'; ctx.fillRect(M, y - 4, (W - M * 2) * (q.total ? q.wrong / q.total : 0), 4); y += 20;
      for (const s of promptLines) { text(s, M + 4, y, 11); y += 18; }
      for (const s of answerLines) { text(s, M + 4, y, 11, '#466546', true); y += 18; }
      for (const s of feedbackLines) { text(s, M + 4, y, 10, '#727868'); y += 16; } y += 20; line(y - 10);
    }
    for (let i = 0; i < pages.length; i++) { ctx = pages[i].getContext('2d'); text(`분수 피자집 · 평가 회차 ${room.id.slice(0, 8)} · 교사용 결과`, M, H - 33, 9, '#8b8e81'); text(`${i + 1} / ${pages.length}`, W - M - 45, H - 33, 10, '#8b8e81'); }
    const blob = await pdf(pages), url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = `분수피자집_${room.school.replace(/[\\/:*?"<>|]/g, '_')}_${room.grade}학년${room.classNo}반_${new Date(room.createdAt).toISOString().slice(0, 10)}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  async function pdf(canvases) {
    const objects = [], add = data => { objects.push(data); return objects.length; };
    add(enc('<< /Type /Catalog /Pages 2 0 R >>')); add(null);
    const kids = [];
    for (const canvas of canvases) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .94)); if (!blob) throw Error('PDF 이미지를 만들지 못했어요. 다시 시도해 주세요.');
      const bytes = new Uint8Array(await blob.arrayBuffer());
      const image = add([enc(`<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n`), bytes, enc('\nendstream')]);
      const stream = `q\n595.28 0 0 841.89 0 0 cm\n/Im0 Do\nQ\n`, content = add(enc(`<< /Length ${enc(stream).length} >>\nstream\n${stream}endstream`));
      const page = add(enc(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${image} 0 R >> >> /Contents ${content} 0 R >>`)); kids.push(`${page} 0 R`);
    }
    objects[1] = enc(`<< /Type /Pages /Count ${kids.length} /Kids [${kids.join(' ')}] >>`);
    const chunks = [enc('%PDF-1.4\n')], offsets = [0]; let size = chunks[0].length;
    objects.forEach((obj, i) => { offsets.push(size); const parts = [enc(`${i + 1} 0 obj\n`), ...(Array.isArray(obj) ? obj : [obj]), enc('\nendobj\n')]; parts.forEach(part => { chunks.push(part); size += part.length; }); });
    const xref = size; chunks.push(enc(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(n => String(n).padStart(10, '0') + ' 00000 n \n').join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
    return new Blob(chunks, { type: 'application/pdf' });
  }
  root.PizzaReport = { download };
})(globalThis);
