function escapePdfText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

export function buildSimplePdf(title: string, lines: string[]): Buffer {
  const pageWidth = 595;
  const pageHeight = 842;
  const left = 50;
  const top = 790;
  const step = 16;

  const safeLines = [title, ...lines].map((line) => escapePdfText(line));
  const contentLines: string[] = ['BT', '/F1 12 Tf'];

  let y = top;
  safeLines.forEach((line, index) => {
    const fontSize = index === 0 ? 16 : 11;
    contentLines.push(`/F1 ${fontSize} Tf`);
    contentLines.push(`1 0 0 1 ${left} ${y} Tm (${line}) Tj`);
    y -= step + (index === 0 ? 6 : 0);
  });
  contentLines.push('ET');

  const stream = contentLines.join('\n');

  const objects: string[] = [];
  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj');
  objects.push('2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj');
  objects.push(
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj`
  );
  objects.push('4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj');
  objects.push(`5 0 obj\n<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream\nendobj`);

  const header = '%PDF-1.4\n';
  let body = '';
  const offsets: number[] = [0];

  objects.forEach((obj) => {
    offsets.push(header.length + body.length);
    body += `${obj}\n`;
  });

  const xrefPos = header.length + body.length;
  let xref = `xref\n0 ${objects.length + 1}\n`;
  xref += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(header + body + xref + trailer, 'utf8');
}

