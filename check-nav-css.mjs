import puppeteer from 'puppeteer-core';
const browser = await puppeteer.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: 'new',
  args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });

const audit = async (label) => {
  const res = await page.evaluate(() => {
    const tiles = document.querySelector('.tiles');
    const band = document.querySelector('.band');
    const tile = document.querySelector('.tile');
    return {
      url: location.pathname,
      tilesCols: tiles ? getComputedStyle(tiles).gridTemplateColumns.split(' ').length : 'NO-TILES',
      bandCols: band ? getComputedStyle(band).gridTemplateColumns.split(' ').length : 'NO-BAND',
      tileCount: document.querySelectorAll('.tile').length,
      tileDisplay: tile ? getComputedStyle(tile).display : 'none',
      dashFont: document.querySelector('.num-xl') ? getComputedStyle(document.querySelector('.num-xl')).fontSize : 'NO-NUM',
    };
  });
  console.log(label, JSON.stringify(res));
};

await page.goto('http://localhost:4321/presupuestos/', { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 1500));
await audit('DIRECT');

await page.evaluate(() => {
  [...document.querySelectorAll('a')].find(x => x.href?.includes('/gastos'))?.click();
});
await new Promise(r => setTimeout(r, 1500));
await audit('GASTOS');

await page.evaluate(() => {
  [...document.querySelectorAll('a')].find(x => x.href?.includes('/presupuestos'))?.click();
});
await new Promise(r => setTimeout(r, 1500));
await audit('BACK-PRESUP');

// una vuelta más para descartar flaky
await page.evaluate(() => {
  [...document.querySelectorAll('a')].find(x => x.href?.includes('/ingresos'))?.click();
});
await new Promise(r => setTimeout(r, 1200));
await page.evaluate(() => {
  [...document.querySelectorAll('a')].find(x => x.href?.includes('/presupuestos'))?.click();
});
await new Promise(r => setTimeout(r, 1200));
await audit('BACK2');

await browser.close();
