import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
const consoleMsgs = [];
page.on('console', (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`));
page.on('pageerror', (e) => consoleMsgs.push(`[pageerror] ${e.message}`));

await page.goto('http://localhost:4321?_=' + Date.now(), {
  waitUntil: 'networkidle0',
  timeout: 30000,
});
await new Promise((r) => setTimeout(r, 2000));

// Add 3 expenses to test table + pagination
for (let i = 1; i <= 3; i++) {
  await page.evaluate((i) => {
    document.querySelector('#expense-description').value = '';
    document.querySelector('#expense-amount').value = '';
  }, i);
  await page.type('#expense-description', `Gasto prueba ${i}`);
  await page.type('#expense-amount', String(10 * i));
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Agregar gasto'),
    );
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
}

const headers = await page.evaluate(() =>
  [...document.querySelectorAll('table thead th')].map((th) => th.textContent.trim()),
);
console.log('Headers:', headers);

const rowCount = await page.evaluate(() => document.querySelectorAll('table tbody tr').length);
console.log('Filas en tabla:', rowCount);

const pageInfo = await page.evaluate(
  () => document.querySelector('.pagination-info')?.textContent?.trim(),
);
console.log('Paginación:', pageInfo);

// Click delete action (desktop path, TableBody action button)
await page.evaluate(() => {
  const btn = document.querySelector('table tbody .action-btn');
  btn?.click();
});
await new Promise((r) => setTimeout(r, 500));
const confirmTitle = await page.evaluate(
  () => document.querySelector('.swal2-popup .swal2-title')?.textContent,
);
console.log('Confirm modal (delete via CustomTable action):', confirmTitle);

console.log('Console errors:', consoleMsgs.filter((m) => /error|Hydration/i.test(m)));
await browser.close();
