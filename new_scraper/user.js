require('dotenv').config();
const puppeteer = require('puppeteer');
const asyncRedis = require("async-redis");
const client = asyncRedis.createClient({ host: process.env.REDIS_HOST, password: process.env.REDIS_PASS });
const sleep = require('util').promisify(setTimeout);

(async () => {
    console.log("Running user scraper...");

    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('response', async response => {
        const url = response.url();
        try {
            const req = response.request();
            const orig = req.url();
            const status = response.status();
            if (status === 200 && orig.startsWith('https://lihkg.com/api_v2/user/')) {
                const json = await response.json();
                if (!(json.error_code) && json.response.items) {
                    let items = json.response.items;
                    let threads = (await Promise.all(items.map(async (item) => {
                        if (item.create_time > 1559318400) {
                            let scraped = await client.sismember('scraped_threads', item.thread_id);
                            if (scraped === '1'){
                                return null;
                            }
                            return item.thread_id;
                        }
                        return null;
                    }))).filter(function (el) { return el; });

                    if (threads.length > 0){
                        await client.rpush('threads', threads);
                    }
                }
            }
        } catch (err) {
            console.error(`Failed getting data from: ${url}`);
            console.error(err);
        }
    });

    while (true){
        await obtainUser(browser, page);
        await sleep(10000);
    }
    
})();

async function obtainUser(browser, page){
    let user_id = await client.lpop('users');
    if(user_id){
        let scraped = await client.sismember('scraped_user', user_id)

        if (!scraped){
            await scrapPage(browser, page, user_id);

            console.log('Scraped user ' + user_id + ' successfully.');
            await client.sadd('scraped_user', user_id);
        }
    }
}

async function scrapeInfiniteScrollItems(page) {
    try {
        let previousHeight;
        let times = 100;
        while (times > 0) {
            let currentHeight = await page.evaluate('document.body.scrollHeight');
            if (previousHeight && currentHeight - previousHeight <= 100){
                break;
            }
            previousHeight = currentHeight;
            await page.evaluate('window.scrollTo({top: document.body.scrollHeight,left: 0, behavior: \'smooth\'})');
            await page.waitForFunction(`document.body.scrollHeight > ${previousHeight}`);
            let randomTime = Math.floor((Math.random() * 5000) + 500);
            await page.waitFor(randomTime);

            times--;
        }
    } catch (e) { }
}

// https://lihkg.com/profile/21470?type=create_time
// https://lihkg.com/profile/21470?type=reply_time

// https://lihkg.com/api_v2/user/184103/thread?page=1&sort=create_time

//{"success":1,"server_time":1586335068,"response":{"is_pagination":true,"items":[{"thread_id":"702151","cat_id":"31","sub_cat_id":"0","title":"[\u6559\u5b78] \u614e\u5165 \u63a7\u5236\u4f60\u5605\u8eab\u9ad4\u9032\u5165\u56f0\u96e3\u6a21\u5f0f","user_id":"184103","user_nickname":"\u8ff7\u8ff7\u7cca\u7cca","user_gender":"F","no_of_reply":"7","no_of_uni_user_reply":"5","like_count":1,"dislike_count":16,"reply_like_count":"3","reply_dislike_count":"0","max_reply_like_count":"1","max_reply_dislike_count":"0","create_time":1528991941,"last_reply_time":1529023870,"status":"1","is_adu":false,"remark":{"last_reply_count":1},"last_reply_user_id":"184103","max_reply":"1001","total_page":1,"is_hot":false,"category":{"cat_id":"31","name":"\u5275\u610f\u53f0","postable":true},"display_vote":true,"vote_status":"0","is_bookmarked":false,"is_replied":false,"user":{"user_id":"184103","nickname":"\u8ff7\u8ff7\u7cca\u7cca","level":"10","gender":"F","status":"1","create_time":1524653567,"level_name":"\u666e\u901a\u6703\u54e1","is_following":false,"is_blocked":false,"is_disappear":false,"is_newbie":false}},{"thread_id":"688567","cat_id":"26","sub_cat_id":"0","title":"\u5c4b\u4f01\u6709\u500b\u767d\u75f4\u7747\u5b8c\u5572\u6559\u5b78\u6587\u88dd\u5de6Linux \u6158\u904e\u98df\u5c4e","user_id":"184103","user_nickname":"\u8ff7\u8ff7\u7cca\u7cca","user_gender":"F","no_of_reply":"23","no_of_uni_user_reply":"17","like_count":21,"dislike_count":2,"reply_like_count":"25","reply_dislike_count":"7","max_reply_like_count":"10","max_reply_dislike_count":"1","create_time":1528023132,"last_reply_time":1528073560,"status":"1","is_adu":false,"remark":{"last_reply_count":1},"last_reply_user_id":"6677","max_reply":"1001","total_page":1,"is_hot":false,"category":{"cat_id":"26","name":"\u8edf\u4ef6\u53f0","postable":true},"display_vote":true,"vote_status":"0","is_bookmarked":false,"is_replied":false,"user":{"user_id":"184103","nickname":"\u8ff7\u8ff7\u7cca\u7cca","level":"10","gender":"F","status":"1","create_time":1524653567,"level_name":"\u666e\u901a\u6703\u54e1","is_following":false,"is_blocked":false,"is_disappear":false,"is_newbie":false}},{"thread_id":"675826","cat_id":"11","sub_cat_id":"0","title":"\u9999\u6e2f\u53f2\u4e0a\u6709\u7121\u908a\u5957\u5361\u58eb\u52c1\u5f97\u904e \u8d85\u7d1a\u5b78\u6821\u9738\u738b\uff1f","user_id":"184103","user_nickname":"\u8ff7\u8ff7\u7cca\u7cca","user_gender":"F","no_of_reply":"9","no_of_uni_user_reply":"9","like_count":1,"dislike_count":0,"reply_like_count":"10","reply_dislike_count":"2","max_reply_like_count":"5","max_reply_dislike_count":"0","create_time":1527122864,"last_reply_time":1527125847,"status":"1","is_adu":false,"remark":{"last_reply_count":1},"last_reply_user_id":"75050","max_reply":"1001","total_page":1,"is_hot":false,"category":{"cat_id":"11","name":"\u5f71\u8996\u53f0","postable":true},"display_vote":true,"vote_status":"0","is_bookmarked":false,"is_replied":false,"user":{"user_id":"184103","nickname":"\u8ff7\u8ff7\u7cca\u7cca","level":"10","gender":"F","status":"1","create_time":1524653567,"level_name":"\u666e\u901a\u6703\u54e1","is_following":false,"is_blocked":false,"is_disappear":false,"is_newbie":false}},{"thread_id":"673199","cat_id":"11","sub_cat_id":"0","title":"\u5514\u597d\u641e\u932f BP\u5957\u886b \u540c CA\u500b\u76fe \u5514\u4fc2\u540c\u4e00\u7a2e\u91d1\u5c6c","user_id":"184103","user_nickname":"\u8ff7\u8ff7\u7cca\u7cca","user_gender":"F","no_of_reply":"25","no_of_uni_user_reply":"16","like_count":4,"dislike_count":20,"reply_like_count":"9","reply_dislike_count":"17","max_reply_like_count":"4","max_reply_dislike_count":"0","create_time":1526916422,"last_reply_time":1526920153,"status":"1","is_adu":false,"remark":{"last_reply_count":1},"last_reply_user_id":"177620","max_reply":"1001","total_page":1,"is_hot":false,"category":{"cat_id":"11","name":"\u5f71\u8996\u53f0","postable":true},"display_vote":true,"vote_status":"0","is_bookmarked":false,"is_replied":false,"user":{"user_id":"184103","nickname":"\u8ff7\u8ff7\u7cca\u7cca","level":"10","gender":"F","status":"1","create_time":1524653567,"level_name":"\u666e\u901a\u6703\u54e1","is_following":false,"is_blocked":false,"is_disappear":false,"is_newbie":false}},{"thread_id":"641916","cat_id":"14","sub_cat_id":"0","title":"IT\u72d7\u5ca9\u5ca9\u6536\u52303\u500boffer\u5514\u77e5\u8981\u908a\u500b\u597d","user_id":"184103","user_nickname":"\u8ff7\u8ff7\u7cca\u7cca","user_gender":"F","no_of_reply":"310","no_of_uni_user_reply":"111","like_count":20,"dislike_count":104,"reply_like_count":"938","reply_dislike_count":"301","max_reply_like_count":"215","max_reply_dislike_count":"5","create_time":1524654433,"last_reply_time":1582996193,"status":"4","is_adu":false,"remark":{"last_reply_count":1},"last_reply_user_id":"184103","max_reply":"1001","total_page":13,"is_hot":false,"category":{"cat_id":"14","name":"\u4e0a\u73ed\u53f0","postable":true},"display_vote":true,"vote_status":"0","is_bookmarked":false,"is_replied":false,"user":{"user_id":"184103","nickname":"\u8ff7\u8ff7\u7cca\u7cca","level":"10","gender":"F","status":"1","create_time":1524653567,"level_name":"\u666e\u901a\u6703\u54e1","is_following":false,"is_blocked":false,"is_disappear":false,"is_newbie":false}}]}}
//{"success":0,"server_time":1586335069,"error_code":100,"error_message":"\u6c92\u6709\u76f8\u95dc\u6587\u7ae0"}


async function scrapPage(browser, page, user_id) {
    await page.goto(`https://lihkg.com/profile/${user_id}?type=reply_time`);

    await page.setViewport({
        width: 375,
        height: 667
    });

    await page.waitForSelector('._2JnkV7flhQCKN2EsmonRcN');

    await scrapeInfiniteScrollItems(page);
}
