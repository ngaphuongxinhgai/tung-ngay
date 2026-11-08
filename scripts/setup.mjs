import {scryptSync,randomBytes} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import readline from 'node:readline/promises';
let password='';
if(process.stdin.isTTY){
 process.stdout.write('Mật khẩu quản trị (ẩn khi nhập): ');process.stdin.setRawMode(true);
 password=await new Promise(resolve=>{let text='';const onData=chunk=>{for(const c of chunk.toString()){if(c==='\r'||c==='\n'){process.stdin.off('data',onData);process.stdin.setRawMode(false);process.stdout.write('\n');resolve(text);return}if(c==='\u0003'){process.exit(1)}if(c==='\u007f')text=text.slice(0,-1);else text+=c}};process.stdin.on('data',onData)});
}else {const rl=readline.createInterface({input:process.stdin,output:process.stdout});password=(await rl.question('Mật khẩu: ')).trim();rl.close()}
if(password.length<10)throw Error('Mật khẩu cần ít nhất 10 ký tự.');
const salt=randomBytes(16).toString('hex'),hash='scrypt:'+salt+':'+scryptSync(password,salt,64).toString('hex');
let current='';try{current=await readFile('.env.local','utf8')}catch{}
const entries={ADMIN_USERNAME:'ngaph082',ADMIN_PASSWORD_HASH:hash,SESSION_SECRET:randomBytes(48).toString('hex')};
for(const [key,value]of Object.entries(entries)){const line=key+'='+value;const re=new RegExp('^'+key+'=.*$','m');current=re.test(current)?current.replace(re,line):current+'\n'+line}
await writeFile('.env.local',current.trim()+'\n',{mode:0o600});console.log('Đã ghi thông tin quản trị vào .env.local (không đưa file này lên Git).');
process.stdin.pause();
