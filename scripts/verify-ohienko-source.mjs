// Offline fidelity gate for the onlydotbible/ohienko USJ corpus.
// It verifies all 66 Scripture verse texts and their positions, not footnotes,
// typography, maps, legal permissions, or publication clearance.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const SOURCE_REPOSITORY = 'https://github.com/onlydotbible/ohienko';
export const PINNED_SOURCE_COMMIT = 'a849415161c588156cae144c7ae870c54f3b9969';
export const EXPECTED_BOOKS = 66;
export const EXPECTED_VERSES = 31170;
const TEXT_PARAGRAPHS = new Set(['p','m','q','q1','q2','q3','q4','pi','pi1','pi2','li','li1','li2','li3','pc','pr','nb','b']);
const normalize = value => String(value ?? '').replace(/\s+/gu, ' ').trim();

export function usjVerseMatrix(document) {
  if (document?.type !== 'USJ' || !Array.isArray(document.content)) throw Error('invalid_source_usj');
  const matrix = [];
  let chapter = -1, verse = -1;
  function read(node) {
    if (typeof node === 'string') {
      if (chapter >= 0 && verse >= 0) {
        matrix[chapter] ??= [];
        matrix[chapter][verse] = (matrix[chapter][verse] || '') + node;
      }
      return;
    }
    if (!node || typeof node !== 'object') return;
    if (node.type === 'chapter') {
      chapter = Number(node.number) - 1;
      if (!Number.isSafeInteger(chapter) || chapter < 0) throw Error('invalid_source_chapter');
      verse = -1;
      return;
    }
    if (node.type === 'verse') {
      verse = Number(node.number) - 1;
      if (!Number.isSafeInteger(verse) || verse < 0 || chapter < 0) throw Error('invalid_source_verse');
      return;
    }
    if (node.type === 'note') return;
    if (node.type === 'para' && !TEXT_PARAGRAPHS.has(node.marker)) return;
    if (Array.isArray(node.content)) node.content.forEach(read);
  }
  document.content.forEach(read);
  return matrix;
}

export function verifyOhienkoBook(code, local, upstream) {
  if (!/^[1-3]?[A-Z]{2,3}$/.test(code)) throw Error('invalid_book_code');
  const header = upstream?.content?.find(item => item?.type === 'book');
  if (header?.code !== code || local?.bookCode !== code || local?.editionId !== 'uk-ohiienko' ||
      local?.locale !== 'uk' || !Array.isArray(local?.chapters)) throw Error(`invalid_book_metadata:${code}`);
  const source = usjVerseMatrix(upstream);
  if (source.length !== local.chapters.length) throw Error(`chapter_count_mismatch:${code}`);
  let verified = 0;
  const digest = createHash('sha256');
  for (let ci = 0; ci < local.chapters.length; ci++) {
    const localChapter = local.chapters[ci], fromSource = source[ci];
    if (!Array.isArray(localChapter) || !Array.isArray(fromSource) || localChapter.length !== fromSource.length)
      throw Error(`verse_count_mismatch:${code}:${ci + 1}`);
    for (let vi = 0; vi < localChapter.length; vi++) {
      const localVerse = normalize(localChapter[vi]), sourceVerse = normalize(fromSource[vi]);
      if (localVerse !== sourceVerse) throw Error(`verse_content_mismatch:${code}:${ci + 1}:${vi + 1}`);
      digest.update(`${ci + 1}:${vi + 1}:${localVerse}\n`);
      verified++;
    }
  }
  return { code, chapters: local.chapters.length, verifiedVerses: verified, normalizedSha256: digest.digest('hex') };
}

export function checkOhienkoRightsMetadata(catalog, upstreamSourceReadme) {
  const edition = catalog?.translations?.['uk-ohiienko'];
  if (!edition || edition.license !== 'CC BY-SA 4.0' ||
      edition.licenseUrl !== 'https://creativecommons.org/licenses/by-sa/4.0/' ||
      edition.source !== SOURCE_REPOSITORY || !edition.attribution?.includes('Огієнк') ||
      !upstreamSourceReadme.includes('CC BY-SA 4.0') ||
      !upstreamSourceReadme.includes('MIT license in the repository root does not apply'))
    throw Error('rights_metadata_missing_or_wrong');
  // Metadata consistency is not a legal determination of publication rights.
  return true;
}

export async function verifyOhienkoCorpus({ archiveRoot, sourceRoot, requirePinnedGit = true }) {
  if (!archiveRoot || !sourceRoot) throw Error('archive_and_source_roots_required');
  if (requirePinnedGit) {
    let commit = '';
    try { commit = execFileSync('git', ['-C', sourceRoot, 'rev-parse', 'HEAD'], {encoding:'utf8'}).trim(); }
    catch { throw Error('upstream_git_revision_unavailable'); }
    if (commit !== PINNED_SOURCE_COMMIT) throw Error(`unexpected_upstream_commit:${commit}`);
  }
  const localFolder = path.join(archiveRoot,'public','data','bible','uk-ohiienko');
  const catalog = JSON.parse(await readFile(path.join(archiveRoot,'public','data','catalog.json'),'utf8'));
  const licenseReadme = await readFile(path.join(sourceRoot,'source','README.md'),'utf8');
  checkOhienkoRightsMetadata(catalog,licenseReadme);
  const expectedCodes = (catalog.books?.en || []).map(book => book.code).sort();
  const files = (await readdir(localFolder)).filter(filename => filename.endsWith('.json')).map(filename => filename.slice(0,-5)).sort();
  if (expectedCodes.length !== EXPECTED_BOOKS || JSON.stringify(files) !== JSON.stringify(expectedCodes))
    throw Error('missing_or_unexpected_local_books');
  const audits=[];
  let verses=0;
  for (const code of expectedCodes) {
    const [local, upstream] = await Promise.all([
      readFile(path.join(localFolder,`${code}.json`),'utf8'),
      readFile(path.join(sourceRoot,'usj',`${code.toLowerCase()}.json`),'utf8'),
    ]);
    const result = verifyOhienkoBook(code,JSON.parse(local),JSON.parse(upstream));
    audits.push(result);
    verses += result.verifiedVerses;
  }
  if (verses !== EXPECTED_VERSES) throw Error(`unexpected_verse_total:${verses}`);
  return { sourceRepository: SOURCE_REPOSITORY, sourceCommit: PINNED_SOURCE_COMMIT,
    books: audits.length, verses, status: 'MATCHED_NORMALIZED_VERSE_TEXT_ONLY', audits };
}

async function main(args) {
  const pos = args.indexOf('--source-root');
  if (args.includes('--help') || pos < 0 || !args[pos+1]) {
    process.stdout.write('Usage: node scripts/verify-ohienko-source.mjs --source-root /path/to/onlydotbible-ohienko [--archive-root /path/to/scripture-archive]\nThe upstream clone must be checked out at pinned commit '+PINNED_SOURCE_COMMIT+'.\n');
    process.exitCode = args.includes('--help') ? 0 : 2;
    return;
  }
  const archivePos = args.indexOf('--archive-root');
  const archiveRoot = archivePos<0?path.resolve(fileURLToPath(new URL('..', import.meta.url))):path.resolve(args[archivePos+1]);
  try {
    const result = await verifyOhienkoCorpus({ archiveRoot, sourceRoot:path.resolve(args[pos+1]) });
    process.stdout.write(JSON.stringify({books:result.books,verses:result.verses,status:result.status,sourceCommit:result.sourceCommit})+'\n');
  } catch(error) {
    process.stderr.write('Source fidelity verification failed: '+String(error.message||error)+'\n');
    process.exitCode=1;
  }
}
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url)
  await main(process.argv.slice(2));
