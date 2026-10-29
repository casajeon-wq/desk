// 올리기 전에 한 번: node tools/add-bom.mjs
// · PowerShell 5.1은 BOM 없는 UTF-8 .ps1의 한글을 깨뜨린다 → .ps1에 BOM
// · cmd·wscript는 LF 줄끝이면 깨질 수 있다 → .bat·.vbs는 CRLF
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name.startsWith('.') ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let n = 0;
for (const f of walk(root)) {
  const b = fs.readFileSync(f), rel = path.relative(root, f);
  if (f.endsWith('.ps1') && !(b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf)) { fs.writeFileSync(f, Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), b])); console.log('BOM:', rel); n++; }
  if (/\.(bat|vbs)$/.test(f)) {
    const t = b.toString('utf8'), fixed = t.replace(/\r?\n/g, '\r\n');
    if (/[^\x00-\x7f]/.test(t)) throw new Error(`${rel}: bat·vbs 안에는 영어만 (cmd가 한글을 깨뜨림)`);
    if (fixed !== t) { fs.writeFileSync(f, fixed); console.log('CRLF:', rel); n++; }
  }
}
console.log(`고친 파일 ${n}개`);
