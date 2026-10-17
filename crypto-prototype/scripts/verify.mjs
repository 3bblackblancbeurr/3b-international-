import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';

const compilation=execFileSync(process.execPath,['scripts/compile.mjs'],{encoding:'utf8'});
const tap=execFileSync(process.execPath,['--test','--test-reporter=tap','tests/token.test.mjs','tests/deployment-plan.test.mjs'],{encoding:'utf8'});
writeFileSync('build/compilation.log',compilation);
writeFileSync('build/tests.tap',tap);
const count=label=>Number(tap.match(new RegExp('^# '+label+' (\\d+)$','m'))?.[1]||0);
const report={status:count('fail')===0&&count('pass')===18?'passed':'failed',scope:'12 ERC20 EVM tests and 6 offline deployment preparation tests; no RPC, public network, keys, wallet, signed transaction or real fees.',capturedAt:new Date().toISOString(),tests:count('tests'),passed:count('pass'),failed:count('fail'),erc20EvmTests:12,deploymentPreparationTests:6,testNetworkGuard:'fetch, HTTP(S) and TCP connect paths throw during EVM tests',compiler:JSON.parse(readFileSync('build/compilation-report.json','utf8')),testSourceSha256:createHash('sha256').update(readFileSync('tests/token.test.mjs')).digest('hex'),deploymentTestSourceSha256:createHash('sha256').update(readFileSync('tests/deployment-plan.test.mjs')).digest('hex')};
writeFileSync('build/verification-report.json',JSON.stringify(report,null,2)+'\n');
process.stdout.write(`${compilation}${report.passed}/${report.tests} local tests passed (12 ERC20 EVM + 6 deployment preparation). Evidence saved under build/.\n`);
if(report.status!=='passed')process.exitCode=1;
