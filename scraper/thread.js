require('dotenv').config();
const puppeteer = require('puppeteer');
const fs = require('fs');
//const asyncRedis = require("async-redis");
//const client = asyncRedis.createClient({ host: process.env.REDIS_HOST, password: process.env.REDIS_PASS});

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    scrapPage(browser, page, 5);

    page.on('response', async response => {
        const url = response.url();
        try {
            const req = response.request();
            const orig = req.url();
            const status = response.status();
            if (status === 200 && orig.startsWith('https://lihkg.com/api_v2/thread/')) {
                const json = await response.json();
                if(json.response.category){
                    console.log(orig);
                    let items = json.response.items;
                    let threads = items.map((item) => {
                        if (item.create_time > 1559318400){
                            return item.thread_id;
                        }
                        return null;
                    }).filter(function (el) { return el; });

                    fs.writeFile('threads/' + Date.now() + '.json', JSON.stringify(threads), (err) => {
                        if (err) throw err;
                        console.log('Data written to file');
                    });

                    //await client.RPUSH('threads', threads);
                }
            }
        } catch (err) {
            console.error(`Failed getting data from: ${url}`);
            console.error(err);
        }
    });
})();

async function scrapeInfiniteScrollItems(page) {
    try {
        let previousHeight;
        let times = 10000;
        while (times > 0) {
            previousHeight = await page.evaluate('document.body.scrollHeight');
            await page.evaluate('window.scrollTo({top: document.body.scrollHeight,left: 0, behavior: \'smooth\'})');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            let randomTime = Math.floor((Math.random() * 5000) + 500);
            await page.waitFor(randomTime);

            times--;
        }
    } catch (e) { }
}

async function scrapPage(browser, page, cat_id) {
    await page.goto(`https://lihkg.com/category/${cat_id}`);
    await page.setViewport({
        width: 375,
        height: 667
    });

    await page.waitForSelector('.C_300Fi04lLpFu_ZznJqq');

    await scrapeInfiniteScrollItems(page);

    await browser.close();
}
