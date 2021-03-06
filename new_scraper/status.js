require('dotenv').config();
const asyncRedis = require("async-redis");
const fetch = require('node-fetch');

const client = asyncRedis.createClient({ host: process.env.REDIS_HOST, password: process.env.REDIS_PASS });

var CronJob = require('cron').CronJob;

(
    async () => {
        var job = new CronJob('*/10 * * * *', async function () {
            let thread = await client.llen('threads');
            let scraped_thread = await client.scard('scraped_threads');

            let user = await client.llen('users');
            let scraped_user = await client.scard('scraped_user');

            let rate = await client.get('rate');

            await client.set('rate', 0);

            fetch('https://discordapp.com/api/webhooks/697464296606531644/qWhXOqRlNh5k5xNBPmDvnm36DZWFTS5DPnp3Zio2bERniBREagZa0RsazlRFB4wJew-2', {
                method: 'post',
                body: JSON.stringify({ 'content': `\n**Thread** \nScraped: ${scraped_thread}\nPending: ${thread}\n\n**User**\nScraped: ${scraped_user}\nPending: ${user}\n\n**Scraping Rate** ${rate} request/10 mins`}),
                headers: { 'Content-Type': 'application/json' }
            })
                .then(res => {})
        }, null, true, 'Asia/Hong_Kong');
        job.start();
    }
)();