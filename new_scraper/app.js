require('dotenv').config();
const puppeteer = require('puppeteer');
const AWS = require('aws-sdk');
const striptags = require('striptags');
const asyncRedis = require("async-redis");
const _ = require('lodash');
const sleep = require('util').promisify(setTimeout);

const client = asyncRedis.createClient({ host: process.env.REDIS_HOST, password: process.env.REDIS_PASS });

(async () => {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    page.on('response', async response => {
        const url = response.url();
        try {
            const req = response.request();
            const orig = req.url();
            const status = response.status();
            if (status === 200 && orig.startsWith('https://lihkg.com/api_v2/thread/')){
                const json = await response.json();
                if (json.response.thread_id && json.response.create_time > 1559318400){
                    let data = json.response;
                    if (parseInt(data.page, 10) < parseInt(data.total_page, 10)){
                        let randomTime = Math.floor((Math.random() * 5000) + 500);
                        setTimeout(() => { scrapPage(browser, page, data.thread_id, parseInt(data.page, 10) + 1) }, randomTime);
                    }else{
                        obtainThread(browser, page);
                    }
                    await saveS3(data);
                }
            }
            
        } catch (err) {
            console.error(`Failed getting data from: ${url}`);
            console.error(err);
        }
    });

    obtainThread(browser, page);
})();

async function obtainThread(browser, page) {
    let thread_id = await client.lpop('threads');
    if (thread_id) {
        let scraped = await client.sismember('scraped_threads', thread_id)

        if (!scraped) {
            await scrapPage(browser, page, thread_id, 1);
            await client.sadd('scraped_threads', thread_id);
        } else {
            await sleep(10000);
            obtainThread(browser, page);
        }
    } else {
        await sleep(10000);
        obtainThread(browser, page);
    }
}

//https://lihkg.com/category/5?page=1
//https://lihkg.com/category/33

async function saveS3(data){
    console.log('Saving data...');
    const BUCKET_NAME = process.env.AWS_S3_BUCKET;

    const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
        region: 'ap-east-1'
    });

    let posts = await extractPost(data);

    if(posts){
        const params = {
            Bucket: BUCKET_NAME,
            Key: `${data.thread_id}/${data.page}.json`,
            Body: posts
        };

        s3.upload(params, function (err, data) {
            if (err) {
                console.log(err);
            }
            console.log(`File uploaded successfully. ${data.Location}`);
        });
    }
}

async function scrapPage(browser, page, thread_id, page_no) {
    console.log(`Scraping thread ${thread_id} page ${page_no}`);
    await page.goto(`https://lihkg.com/thread/${thread_id}/page/${page_no}`);
    await page.setViewport({
        width: 375,
        height: 667
    });

    await page.waitForSelector('._104Xz-AMZKOPR1qS6fu7Xn');
}

async function extractPost(response){
    let posts = [];
        if (response.page === '1') {
            let post = response.item_data[0];
            let data = {
                'root': true,
                'thread_id': post.thread_id,
                'post_id': post.post_id,
                'user_id': post.user.user_id,
                'user_name': post.user.nickname,
                'user_level': post.user.level,
                'is_newbie': post.user.is_newbie,
                'is_not_push_post': false,
                'msg': response.title + "\n" + striptags(post.msg),
                'like_count': response.like_count,
                'dislike_count': response.dislike_count,
                'create_time': response.create_time,
                'reply_to': null
            }
            posts.push(data);
        }

        let op_id = response.user_id;

        response.item_data.forEach(post => {
            if (!(post.user.user_id === op_id && post.page === 1 && post.vote_score === "0")) {
                let data = {
                    'root': false,
                    'thread_id': post.thread_id,
                    'post_id': post.post_id,
                    'user_id': post.user.user_id,
                    'user_name': post.user.nickname,
                    'user_level': post.user.level,
                    'is_newbie': post.user.is_newbie,
                    'is_not_push_post': (post.remark.is_not_push_post) ? true : false,
                    'msg': striptags(post.msg),
                    'like_count': post.like_count,
                    'dislike_count': post.dislike_count,
                    'create_time': post.reply_time,
                    'reply_to': (post.quote) ? post.quote.user.user_id : op_id
                }

                posts.push(data);
            }
        });

    let users = _.uniq(posts.map((post) => {
            return post.user_id
    }));

    await client.rpush('users', users);

    return JSON.stringify(posts);
}