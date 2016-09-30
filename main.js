"use strict";

const cheerio = require("cheerio");
const express = require("express");
const request = require('request');
const updateRate = 60000;

let searchedStreamers = {
    "brysson": true,
    "melodycums4u": true,
    "squirtcockcum1": true,
    "amorpowers001": true,
    "makyu05": true
};
let searchedActiveStreamers = [];
let topStreamers = {
    "female": [],
    "male": [],
    "trans": [],
    "couple": []
};

const app = express();
app.get("/", (req, res) => {
    let streamers = {};
    let formStreamer = function formStreamerArr(streamersArr) {
        streamersArr.map(streamer => {
            streamers[streamer.name] = {
                "gender": streamer.gender,
                "age": streamer.age,
                "description": streamer.descr
            };
        });
    };
    console.log(topStreamers.female, topStreamers.male, topStreamers.couple, topStreamers.trans).catch(err);
    let arr = topStreamers.female
        .concat(topStreamers.male)
        .concat(topStreamers.couple)
        .concat(topStreamers.trans);
        
    if (searchedActiveStreamers !== []) arr = arr.concat(searchedActiveStreamers);
    formStreamer(arr);
    res.send(streamers);
});
update(() => {
    app.listen(process.env.PORT);
});

function updateSearchedActiveStreamers(searchedStreamers, activeStreamers) {
    let arr = [];
    for (let streamer of activeStreamers) {
        let searchedActiveStreamer = searchedStreamers[streamer.name];
        if (searchedActiveStreamer) {
            arr.push(streamer);
        }
    }
    for(let a of arr){
        arr.filter((c) => c === a && c);
    }
}

function update(cb) {
    const url = {
        femaleURL: "https://en.chaturbate.com/female-cams/",
        maleURL: "https://en.chaturbate.com/male-cams/",
        coupleURL: "https://en.chaturbate.com/couple-cams/",
        transURL: "https://en.chaturbate.com/trans-cams/"
    };
    topStreamers = {};
    Promise.all([
        checkAllPages(url.femaleURL, 10),
        checkAllPages(url.maleURL, 10),
        checkAllPages(url.coupleURL, 10),
        checkAllPages(url.transURL, 10)
    ]).then((arrStreamers) => {
        let activeStreamers = [];
        for (let streamers of arrStreamers) {
            activeStreamers = activeStreamers.concat(streamers);
        }
        console.log("Active Streamers: ", activeStreamers.length);
        updateSearchedActiveStreamers(searchedStreamers, activeStreamers);
        if (cb) cb();
        setTimeout(update, updateRate);
    }).catch((error) => {
        console.log(error);
        setTimeout(() => {
            update(cb);
        }, updateRate);
    });
}

function checkAllPages(url, maxTopStreamers) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let html = cheerio.load(body);
                let pages = [];
                html(".endless_page_link").each((index, element) => {
                    let page = parseInt(html(element).text(), 10);
                    if (!isNaN(page)) pages.push(page);
                });
                let lastPage = 0;
                for (let n of pages) {
                    if (n > lastPage) lastPage = n;
                }
                let requests = [];
                let topStreamersCount = 0;
                let gender = url.replace("https://en.chaturbate.com/", "").replace("-cams/", "");
                topStreamers[gender] = [];
                for (let i = 1; i <= lastPage; i++) {
                    let link = url + "?page=" + i;
                    let req = SearchStreamersOnPage(link, (streamers) => {
                        if (i === 1) {
                            for (let streamer of streamers) {
                                if (topStreamersCount <= maxTopStreamers) {
                                    topStreamers[gender].push(streamer);
                                    topStreamersCount++;
                                }
                            }
                        }
                    });
                    requests.push(req);
                }
                let activeStreamers = [];
                Promise.all(requests).then((arrStreamers) => {
                    for (let streamers of arrStreamers) {
                        activeStreamers = activeStreamers.concat(streamers);
                    }
                    resolve(activeStreamers); // hier
                }).catch((error) => {
                    console.log(error);
                    reject(new Error("Could not reach pages."));
                });
            }
            else {
                reject(new Error("Could not reach " + url));
            }
        });
    });
}

function SearchStreamersOnPage(url, cb) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (!error && response.statusCode == 200) {
                let html = cheerio.load(body);
                let streamers = [];
                html(".details").each((index, element) => {
                    let info = {};
                    info.name = html(element).find(".title").find("a").text().toLowerCase().substring(1);
                    info.link = "https:/en.chaturbate.com/" + html(element).find(".title").find("a").attr("href").substring(1);
                    info.descr = html(element).find("li").attr("title");
                    info.age = html(element).find(".title").find("span").text();
                    info.viewers = parseInt(html(element).find(".cams").text().split(" ")[2], 10); //241 min, 1072 Betrachter
                    streamers.push(info);
                });
                cb(streamers);
                resolve(streamers);
            }
            else {
                let msg = "Could not reach " + url;
                reject(new Error(msg));
            }
        });
    });
}
