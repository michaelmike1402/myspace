import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Question={id:number;level:string;topic:string;kind:string;q:string;options:string[];answer:number;e:string;source:string};
const html=readFileSync('public/management-2/index.html','utf8');
const bank:Question[]=JSON.parse(html.match(/^const BANK = (.*);$/m)![1]);
const oldHtml=readFileSync('public/management/index.html','utf8');
const oldBank:Question[]=JSON.parse(oldHtml.match(/^const BANK = (.*);$/m)![1]);

test('Set 2 contains 100 new questions, balanced levels and complete English explanations',()=>{
  expect(bank).toHaveLength(100);
  expect(new Set(bank.map(q=>q.q)).size).toBe(100);
  expect(bank.some(q=>oldBank.some(p=>p.q===q.q))).toBe(false);
  expect(bank.filter(q=>q.level==='easy')).toHaveLength(35);
  expect(bank.filter(q=>q.level==='medium')).toHaveLength(40);
  expect(bank.filter(q=>q.level==='hard')).toHaveLength(25);
  expect(bank.filter(q=>q.kind==='truefalse')).toHaveLength(25);
  expect(bank.filter(q=>q.kind==='recall').length).toBeGreaterThan(20);
  expect(bank.filter(q=>q.kind==='case').length).toBeGreaterThan(40);
  expect(html).toContain('<html lang="en">');
  expect(html).not.toMatch(/\b(soal|jawaban|benar|salah|pembahasan|pilih|sudah|belum|ulang|semua|karyawan)\b/i);
  for(const [i,q] of bank.entries()){
    expect(q.id).toBe(i+1);
    expect(q.options).toHaveLength(q.kind==='truefalse'?2:4);
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.answer).toBeLessThan(q.options.length);
    expect(q.e.length).toBeGreaterThan(70);
    expect(q.source).toBeTruthy();
  }
  for(let i=0;i<4;i++)expect(bank.filter(q=>q.kind!=='truefalse'&&q.answer===i).length).toBeGreaterThanOrEqual(18);
});

test('immediate feedback, persistence, retry, and separate Set 1 progress',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./management/');
  const original=await page.evaluate(()=>localStorage.getItem('management-practice-v1'));
  await page.goto('./management-2/');
  await expect(page.locator('#check')).toBeDisabled();
  const first=bank[0];
  await page.locator('.option').nth((first.answer+1)%4).click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Not quite');
  await expect(page.locator('#feedback')).toContainText(first.options[first.answer]);
  await expect(page.locator('#feedback')).toContainText(first.e);
  await page.reload();
  await expect(page.locator('#feedback')).toContainText(first.e);
  await expect(page.locator('#checked-count')).toHaveText('1 / 100');
  await expect(page.locator('input[name="answer"]').first()).toBeDisabled();
  await page.locator('#next').click();
  await page.locator('.option').nth(bank[1].answer).click();await page.locator('#check').click();
  await expect(page.locator('#accuracy')).toHaveText('50%');
  await page.locator('#level').selectOption('hard');
  await page.locator('#retry').click();
  await expect(page.locator('#level')).toHaveValue('all');
  await expect(page.locator('#question-title')).toHaveText(first.q);
  await expect(page.locator('#feedback')).toHaveCount(0);
  await expect(page.locator('#checked-count')).toHaveText('1 / 100');
  await page.locator('.option').nth(first.answer).click();await page.locator('#check').click();
  await expect(page.locator('#accuracy')).toHaveText('100%');
  expect(await page.evaluate(()=>localStorage.getItem('management-practice-v1'))).toBe(original);
  expect(errors).toEqual([]);
});

test('difficulty and format filters persist, empty combinations are clear, reset clears filters',async({page})=>{
  await page.goto('./management-2/');
  for(const [level,count] of [['easy',35],['medium',40],['hard',25]] as const){
    await page.locator('#level').selectOption(level);
    await expect(page.locator('#list-count')).toHaveText(`${count} questions in this selection`);
    await expect(page.locator('.tag')).toContainText(level[0].toUpperCase()+level.slice(1));
  }
  await page.locator('#type').selectOption('truefalse');
  await expect(page.locator('.option')).toHaveCount(2);
  await expect(page.locator('#list-count')).toHaveText('7 questions in this selection');
  await page.reload();
  await expect(page.locator('#level')).toHaveValue('hard');
  await expect(page.locator('#type')).toHaveValue('truefalse');
  await page.locator('#topic').selectOption('Modern challenges');
  await expect(page.locator('#question-area')).toContainText('No questions match');
  await expect(page.locator('#next')).toBeDisabled();
  await page.locator('#reset').click();await page.locator('#cancel-reset').click();
  await expect(page.locator('#level')).toHaveValue('hard');
  await page.locator('#reset').click();await page.locator('#do-reset').click();
  await expect(page.locator('#level')).toHaveValue('all');
  await expect(page.locator('#type')).toHaveValue('all');
  await expect(page.locator('#topic')).toHaveValue('all');
  await expect(page.locator('#question-title')).toHaveText(bank[0].q);
});

test('all 100 answers can be checked independently with explanations and accurate score',async({page})=>{
  test.setTimeout(180000);
  await page.goto('./management-2/');
  for(const q of bank){
    await expect(page.locator('#question-title')).toHaveText(q.q);
    await page.locator('.option').nth(q.answer).click();
    await page.locator('#check').click();
    await expect(page.locator('#feedback')).toContainText('Correct!');
    await expect(page.locator('#feedback')).toContainText(q.e);
    await expect(page.locator('#correct-count')).toHaveText(String(q.id));
    if(q.id<100)await page.locator('#next').click();
  }
  await expect(page.locator('#checked-count')).toHaveText('100 / 100');
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#list-count')).toContainText('All 100 questions checked');
  await expect(page.locator('#next')).toBeDisabled();
  await expect(page.locator('#retry')).toBeDisabled();
});

test('jump, shuffle, navigation and responsive layout work across levels',async({page},info)=>{
  await page.goto('./management-2/');
  await page.locator('#question-picker summary').click();
  await page.getByRole('button',{name:'Question 100, not checked',exact:true}).click();
  await expect(page.locator('#question-title')).toHaveText(bank[99].q);
  await page.locator('.option').nth(bank[99].answer).click();await page.locator('#check').click();
  await expect(page.locator('#checked-count')).toHaveText('1 / 100');
  await page.locator('#level').selectOption('hard');
  await page.locator('#shuffle').click();
  await expect(page.locator('.tag')).toContainText('Hard');
  await expect(page.locator('#checked-count')).toHaveText('1 / 100');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${info.project.name}-management-2.png`,fullPage:true});
});

test('Set 2 loads after the MYSPACE service worker takes control and Set 1 stays reachable',async({page})=>{
  await page.goto('./');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();
  await page.goto('./management-2/');
  await expect(page.locator('#question-title')).toHaveText(bank[0].q);
  await page.getByRole('link',{name:'Open Set 1 (English questions, Indonesian explanations)',exact:true}).click();
  await expect(page.locator('#question-title')).toHaveText(oldBank[0].q);
});
