import {execFileSync} from 'node:child_process';

const history=execFileSync('git',['log','-p','--all','--full-history','--no-ext-diff','--','.'],{
  encoding:'utf8',
  maxBuffer:1024*1024*80
});

const patterns=[
  ['Supabase secret key',new RegExp('sb_'+'secret_'+'[A-Za-z0-9_-]{20,}','g')],
  ['Stripe live secret',new RegExp('sk_'+'live_'+'[A-Za-z0-9]{16,}','g')],
  ['GitHub token',new RegExp('gh'+'[pousr]_'+'[A-Za-z0-9]{30,}','g')],
  ['AWS access key',new RegExp('AK'+'IA[0-9A-Z]{16}','g')],
  ['Private key PEM',new RegExp('-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----','g')],
];

const findings=[];
for(const [label,re] of patterns){
  for(const match of history.matchAll(re)){
    findings.push({label,preview:match[0].slice(0,12)+'…'});
  }
}

if(findings.length){
  console.error('Potential secret material found in Git history:',findings);
  process.exit(1);
}

console.log('Fortress history scan: no high-confidence secret patterns found.');
