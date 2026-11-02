import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

type Question = {id:number;q:string;options:string[];answer:number;e:string;kind:string;topic:string};
const html=readFileSync('public/management/index.html','utf8');
const bank:Question[]=JSON.parse(html.match(/^const BANK = (.*);$/m)![1]);

test('management bank has 100 complete, distinct questions with all three formats',()=>{
  expect(bank).toHaveLength(100);
  expect(new Set(bank.map(q=>q.q)).size).toBe(100);
  expect(bank.filter(q=>q.kind==='truefalse')).toHaveLength(25);
  expect(bank.filter(q=>q.kind==='case')).toHaveLength(53);
  expect(bank.filter(q=>q.kind==='recall')).toHaveLength(22);
  for(const [i,q] of bank.entries()){
    expect(q.id).toBe(i+1);
    expect(q.options).toHaveLength(q.kind==='truefalse'?2:4);
    expect(new Set(q.options).size).toBe(q.options.length);
    expect(q.answer).toBeGreaterThanOrEqual(0);
    expect(q.answer).toBeLessThan(q.options.length);
    expect(q.e.length).toBeGreaterThan(40);
    expect(q.topic.length).toBeGreaterThan(0);
  }
});

test('check one answer immediately, explain mistakes, persist, and retry only wrong answers',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('./management/');
  await expect(page.locator('#check')).toBeDisabled();
  const first=bank[0],wrong=(first.answer+1)%4;
  await page.locator('.option').nth(wrong).click();
  await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Belum tepat');
  await expect(page.locator('#feedback')).toContainText(first.options[first.answer]);
  await expect(page.locator('#feedback')).toContainText(first.e);
  await expect(page.locator('#checked-count')).toHaveText('1 / 100');
  await expect(page.locator('#correct-count')).toHaveText('0');
  await expect(page.locator('input[name="answer"]').first()).toBeDisabled();
  await page.reload();
  await expect(page.locator('#feedback')).toContainText(first.e);
  await page.locator('#next').click();
  await page.locator('.option').nth(bank[1].answer).click();
  await page.locator('#check').click();
  await expect(page.locator('#correct-count')).toHaveText('1');
  await expect(page.locator('#accuracy')).toHaveText('50%');
  await page.locator('#retry').click();
  await expect(page.locator('#question-title')).toHaveText(first.q);
  await expect(page.locator('#feedback')).toHaveCount(0);
  await expect(page.locator('#checked-count')).toHaveText('1 / 100');
  await page.locator('.option').nth(first.answer).click();
  await page.locator('#check').click();
  await expect(page.locator('#accuracy')).toHaveText('100%');
  await expect(page.locator('#checked-count')).toHaveText('2 / 100');
  expect(errors).toEqual([]);
});

test('filter formats, grade True/False independently, handle empty filters, and reset deliberately',async({page})=>{
  await page.goto('./management/');
  await page.locator('#type').selectOption('truefalse');
  await expect(page.locator('.option')).toHaveCount(2);
  const tf=bank.find(q=>q.kind==='truefalse')!;
  await page.locator('.option').nth(tf.answer).click();await page.locator('#check').click();
  await expect(page.locator('#feedback')).toContainText('Benar!');
  await expect(page.locator('#correct-count')).toHaveText('1');
  await page.locator('#type').selectOption('recall');
  await page.locator('#topic').selectOption('Cognitive biases');
  await expect(page.locator('#question-area')).toContainText('Tidak ada soal');
  await expect(page.locator('#next')).toBeDisabled();
  await page.locator('#topic').selectOption('all');
  await expect(page.locator('.option')).toHaveCount(4);
  await page.locator('#shuffle').click();
  await expect(page.locator('#correct-count')).toHaveText('1');
  await page.locator('#reset').click();await page.locator('#cancel-reset').click();
  await expect(page.locator('#correct-count')).toHaveText('1');
  await page.locator('#reset').click();await page.locator('#do-reset').click();
  await expect(page.locator('#checked-count')).toHaveText('0 / 100');
  await expect(page.locator('#question-title')).toHaveText(bank[0].q);
});

test('jump to the last question without finishing earlier ones and fit the viewport',async({page},info)=>{
  await page.goto('./management/');
  await page.locator('#question-picker summary').click();
  await page.getByRole('button',{name:'Soal 100, belum dicek',exact:true}).click();
  const last=bank[99];
  await expect(page.locator('#question-title')).toHaveText(last.q);
  await page.locator('.option').nth(last.answer).click();await page.locator('#check').click();
  await expect(page.locator('#checked-count')).toHaveText('1 / 100');
  await expect(page.locator('#feedback')).toContainText(last.e);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/${info.project.name}-management.png`,fullPage:true});
});

test('the quiz is reachable after the MYSPACE service worker takes control',async({page})=>{
  await page.goto('./');
  await page.evaluate(async()=>{await navigator.serviceWorker.ready;});
  await page.reload();
  await page.goto('./management/');
  await expect(page.locator('#question-title')).toHaveText(bank[0].q);
});
