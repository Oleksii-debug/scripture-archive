// Each invocation of test-integration.mjs allocates a fresh temporary D1 database.
// Never retry a single non-idempotent HTTP mutation against the same database.
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// A retry is safe only when the *one failed test* positively identifies a
// disposable proxy restart. A restart phrase elsewhere in stdout/stderr, a
// truncated JSON parse error, or any assertion failure is not proof.
export function isDisposableWorkerRestart(log) {
  if (typeof log !== 'string' || !/(?:^|\n)ℹ fail 1(?:\r?\n|$)/u.test(log)) return false;
  const marker = log.lastIndexOf('✖ failing tests:');
  if (marker < 0) return false;
  const failures = log.slice(marker).split(/\n(?:\[wrangler:|file:\/\/\/[^\n]*\/scripts\/test-integration\.mjs)/u)[0];
  const cases = failures.match(/(?:^|\n)\s*✖ (?!failing tests:)[^\n]+/gu) || [];
  if (cases.length !== 1) return false;

  // A copied restart phrase in a different error is not trusted restart evidence.
  const body = 'Your worker restarted mid-request. Please try sending the request again. Only GET or HEAD requests are retried automatically.';
  const assertions = [...failures.matchAll(/(?:^|\n)\s*AssertionError \[ERR_ASSERTION\]: ([^\r\n]+)/gu)];
  const syntaxErrors = [...failures.matchAll(/(?:^|\n)\s*SyntaxError: ([^\r\n]+)/gu)];
  const otherErrors = failures.match(/(?:^|\n)\s*(?:AssertionError(?! \[ERR_ASSERTION\]:)|Error:|TypeError:|RangeError:|ReferenceError:)[^\r\n]*/gu) || [];
  if (otherErrors.length) return false;

  if (assertions.length === 1 && syntaxErrors.length === 0) {
    const messages = new Set([body, 'Cross-origin mutation must be rejected; local Worker response: ' + body]);
    if (!messages.has(assertions[0][1].trim())) return false;
    // Non-consuming lookahead ensures two status mismatches cannot masquerade as one.
    const statuses = failures.match(/(?:^|\n)\s*503 !== (?:200|201|202|204|400|401|403|404|409)(?=\r?\n|$)/gu) || [];
    return statuses.length === 1;
  }

  // Exact, complete native JSON parser error; fragments and generic 503s fail closed.
  const exactJSON = 'Unexpected token \'Y\', "Your worker restarted mid-request" is not valid JSON';
  return assertions.length === 0 && syntaxErrors.length === 1 &&
    syntaxErrors[0][1].trim() === exactJSON;
}

export async function runWithFreshState(execute, report = () => {}) {
  let previousRestart = false;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { code, log } = await execute();
    if (code === 0) return { attempts: attempt, recovered: previousRestart };
    if (attempt === 2 || !isDisposableWorkerRestart(log))
      throw Error(`Disposable integration failed on attempt ${attempt}; exit ${code}.`);
    previousRestart = true;
    report('Disposable Worker restart detected; rerunning the entire suite against a new temporary D1 state. The failed run remains visible in logs.');
  }
  throw Error('Unreachable integration result.');
}

async function executeOnce() {
  return new Promise((resolve, reject) => {
    const script = fileURLToPath(new URL('./test-integration.mjs', import.meta.url));
    const child = spawn(process.execPath, [script], {stdio:['inherit','pipe','pipe'],env:process.env});
    let log='';
    const append=(stream, data)=>{
      stream.write(data);
      log=(log+String(data)).slice(-131072);
    };
    child.stdout.on('data', data => append(process.stdout,data));
    child.stderr.on('data', data => append(process.stderr,data));
    child.once('error', reject);
    child.once('exit', code => resolve({code:code??1,log}));
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  runWithFreshState(executeOnce, message=>process.stderr.write(`${message}\n`)).catch(error=>{
    process.stderr.write(`${error.message}\n`);
    process.exitCode=1;
  });
}
