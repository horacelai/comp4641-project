let fs = require('fs');
let striptags = require('striptags');

let files = [
    require('./raw_data/data.json'),
    require('./raw_data/data1.json'),
    require('./raw_data/data2.json'),
    require('./raw_data/data3.json'),
    require('./raw_data/data4.json'),
    require('./raw_data/data5.json'),
    require('./raw_data/data6.json'),
    require('./raw_data/data7.json'),
    require('./raw_data/data8.json'),
    require('./raw_data/data9.json'),
    require('./raw_data/data10.json'),
];

let new_data = [];

files.forEach( data => {
    if(data.log){
        data.log.entries.forEach(entry => {
            if (entry._resourceType === 'xhr' && entry.response.content) {
                if (entry.response.content.mimeType === 'application/json') {
                    if (entry.response.content.text) {
                        new_data.push(JSON.parse(entry.response.content.text));
                    }
                }
            }
        });
    }
})

// console.log(new_data);

// var jsonContent = JSON.stringify(new_data, null, 4);

// fs.writeFile("data.json", jsonContent, 'utf8', function (err) {
//     if (err) {
//         console.log("An error occured while writing JSON Object to File.");
//         return console.log(err);
//     }

//     console.log("JSON file has been saved.");
// });

let posts = [];

new_data.forEach(entry => {
    if (entry.response && entry.response.thread_id){
        let response = entry.response;
        if(response.page === '1'){
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
                'reply_to': null
            }

            posts.push(data);
        }

        let op_id = response.user_id;

        response.item_data.forEach(post => {
            if (!(post.user.user_id === op_id && post.page === 1 && post.vote_score === "0")){
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
                    'reply_to': (post.quote) ? post.quote.user.user_id : op_id
                }

                posts.push(data);
            }
        });
    }
});

console.log('Saving ' + posts.length + ' posts');

var posts_json = JSON.stringify(posts, null, 4);

fs.writeFile("posts.json", posts_json, 'utf8', function (err) {
    if (err) {
        console.log("An error occured while writing JSON Object to File.");
        return console.log(err);
    }

    console.log("JSON file has been saved.");
});