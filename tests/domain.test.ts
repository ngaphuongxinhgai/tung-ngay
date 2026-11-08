import {test} from 'node:test';
import assert from 'node:assert/strict';
import {scryptSync} from 'node:crypto';
import ExcelJS from 'exceljs';
import {HEADERS,parseWords,validateLibrary} from '../lib/domain';
import {startLearn,advanceLearn,choicesFor,normalizeAnswer} from '../lib/learn';
import {passwordMatches,signSession,verifySession,sameOrigin} from '../lib/auth';
import {inspectWorkbook,previewRows} from '../lib/import';
import {parseSource} from '../lib/google';
import {demo} from '../lib/demo';
test('parse stable IDs and reject duplicate or incomplete rows',()=>{
 const a=parseWords([HEADERS,['001','HSK','你好','nǐ hǎo','Xin chào']]);assert.equal(a.words[0].id,'001');assert.equal(a.decks[0].name,'HSK');
 assert.throws(()=>parseWords([HEADERS,['1','HSK','a','','a'],['1','HSK','b','','b']]),/trùng/);
 assert.throws(()=>parseWords([HEADERS,['1','HSK','','','a']]),/thiếu/);
 assert.throws(()=>parseWords([['x']]),/cột/);
 assert.throws(()=>validateLibrary({decks:[{id:'1',name:'A'},{id:'2',name:'a'}],words:[]}),/duy nhất/);
});
test('Learn repeats mistakes, advances choice to written and completes a singleton',()=>{
 const words=[demo.words[0]];let s=startLearn(words);assert.deepEqual(choicesFor(words[0],words,false),[]);
 s=advanceLearn(s,false,true);assert.deepEqual(s.queue,[words[0].id]);
 s=advanceLearn(s,true,false);assert.equal(s.stage,'written');assert.equal(s.queue.length,1);
 s=advanceLearn(s,true,true);assert.equal(s.queue.length,0);assert.equal(s.completed[0],words[0].id);assert.equal(s.attempts,3);
});
test('choice answers are unique; normalization preserves accents',()=>{
 const words=[demo.words[0],{...demo.words[1],meaning:demo.words[0].meaning},demo.words[2]];
 const opts=choicesFor(words[0],words,false);assert.equal(opts.length,2);assert.equal(new Set(opts).size,opts.length);
 assert.equal(normalizeAnswer('  XIN   Chào '),'xin chào');assert.notEqual(normalizeAnswer('Chào'),normalizeAnswer('Chao'));
});
test('password hashing, signed sessions, tampering and expiry',()=>{
 const salt='test-salt',hash='scrypt:'+salt+':'+scryptSync('test password',salt,64).toString('hex');
 assert.equal(passwordMatches('test password',hash),true);assert.equal(passwordMatches('bad',hash),false);
 process.env.SESSION_SECRET='a'.repeat(64);process.env.ADMIN_USERNAME='ngaph082';
 const now=Date.now(),token=signSession(now);assert.equal(verifySession(token,now),true);assert.equal(verifySession(token+'x',now),false);assert.equal(verifySession(token,now+8*3600*1000+1000),false);
 assert.equal(verifySession('',now),false);
});
test('reject cross-origin and missing-origin mutations',()=>{
 assert.throws(()=>sameOrigin(new Request('https://app.test/api',{headers:{origin:'https://evil.test'}})),/không hợp lệ/);
 assert.throws(()=>sameOrigin(new Request('https://app.test/api')),/không hợp lệ/);
 assert.doesNotThrow(()=>sameOrigin(new Request('https://app.test/api',{headers:{origin:'https://app.test'}})));
 assert.doesNotThrow(()=>sameOrigin(new Request('http://localhost:3000/api',{headers:{origin:'http://127.0.0.1:3000',host:'127.0.0.1:3000'}})));
});
test('only accept Google spreadsheet URLs',()=>{
 assert.deepEqual(parseSource('https://docs.google.com/spreadsheets/d/abc_123/edit','TuVung'),{spreadsheetId:'abc_123',tab:'TuVung'});
 assert.throws(()=>parseSource('https://evil.test/spreadsheets/d/abc','TuVung'));
 assert.throws(()=>parseSource('https://docs.google.com/spreadsheets/d/abc','BoThe'));
});
test('xlsx import: sample preserves Chinese and headers, bad files fail',async()=>{
 const fs=await import('node:fs/promises');const sheets=await inspectWorkbook(await fs.readFile('public/Mau-tu-vung.xlsx'));
 assert.equal(sheets[0].name,'TuVung');assert.deepEqual(sheets[0].rows[0],HEADERS);assert.equal(sheets[0].rows.length,17);assert.equal(sheets[0].rows[1][2],'你好');assert.equal(sheets[0].rows[1][0],'001');
 await assert.rejects(()=>inspectWorkbook(Buffer.from('not excel')),/Không đọc/);
});
test('preview flags duplicates, blank lines, missing fields and selected-deck fallback',()=>{
 const rows=[HEADERS,['g0','','你好','','Xin chào'],['same','B','x','',''],['same','B','y','','y'],['','','','','']];
 const out=previewRows(rows,{id:0,deck:1,term:2,pinyin:3,meaning:4},demo,'greeting');
 assert.equal(out.length,3);assert.equal(out[0].duplicate,true);assert.equal(out[0].deck,'Giao tiếp cơ bản');assert.ok(out[1].errors.length);assert.ok(out[2].errors.some(e=>e.includes('trùng')));
});
test('reject Excel formulas instead of executing or silently importing stale results',async()=>{
 const wb=new ExcelJS.Workbook(),s=wb.addWorksheet('TuVung');s.addRow(HEADERS);s.addRow(['1','A',{formula:'1+1',result:2},'','two']);
 const bytes=Buffer.from(await wb.xlsx.writeBuffer());await assert.rejects(()=>inspectWorkbook(bytes),/công thức/);
});
