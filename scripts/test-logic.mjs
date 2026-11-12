// Uji logika murni (ranking feed, filter pencarian, jarak) tanpa React Native/Expo.
// Berkas src/lib/*.ts memakai impor tanpa ekstensi (standar Metro), sedangkan Node menuntut ekstensi, jadi skrip ini
// menyalin berkas ke folder sementara, menyesuaikan impor, lalu menjalankan scripts/logic.test.mts dengan test runner Node.
// Jalankan: npm run test:logic   (butuh Node 22.6+)
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tmp = mkdtempSync(join(tmpdir(), 'saudagrow-logic-'));

const fixImports = (code) =>
  code
    .replace(/from '\.\/(geo|feedRank|searchFilter)'/g, "from './$1.ts'")
    .replace(/from '\.\.\/types'/g, "from './types.ts'")
    .replace(/from '\.\.\/src\/lib\/(geo|feedRank|searchFilter)'/g, "from './$1.ts'");

for (const f of ['geo', 'feedRank', 'searchFilter']) {
  writeFileSync(join(tmp, `${f}.ts`), fixImports(readFileSync(join(root, 'src/lib', `${f}.ts`), 'utf8')));
}
// types.ts hanya dipakai sebagai tipe; buang impor React/ikon yang tidak tersedia di Node murni.
const types = readFileSync(join(root, 'src/types.ts'), 'utf8')
  .replace(/^import type .*$/gm, '')
  .replace(/export type FeatherName = .*/, 'export type FeatherName = string;');
writeFileSync(join(tmp, 'types.ts'), types);
cpSync(join(root, 'scripts/logic.test.mts'), join(tmp, 'logic.test.mts'));
writeFileSync(join(tmp, 'logic.test.mts'), fixImports(readFileSync(join(tmp, 'logic.test.mts'), 'utf8')));

const r = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--test', join(tmp, 'logic.test.mts')], {
  stdio: 'inherit',
});
process.exit(r.status ?? 1);
