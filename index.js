const puppeteer = require('puppeteer');
const cheerio = require('cheerio')
const mongoose = require('mongoose')
const clc = require("cli-color");
const Listing = require("./model/Listing");
require('dotenv').config()

const scrapingResults = [
    {
        title: 'Entry Level software engineer',
        datePosted: new Date("2021-16-05"),
        neighborhood: 'Palo Alto',
        url:
            (process.env.MONGO_URI),
        jobDescription: 'Major technology company seeking software engineer',
        compensation: 'Up to US $0.00 per year'
    }

]

async function connectToMongoDb() {
    await mongoose.connect(
        `mongodb+srv://${process.env.MONGO_USERNAME}:${process.env.MONGO_PASSWORD}@cluster0.3pze3.mongodb.net/${process.env.MONGO_DATABASE}?retryWrites=true&w=majority`,
        {useNewUrlParser: true, useUnifiedTopology: true },
    );

    console.log(clc.green('=================\nConnected to MongoDb\n================'))
}

async function scrapeListings(page) {
    await page.goto("https://lasvegas.craigslist.org/d/software-qa-dba-etc/search/sof?lang=en&cc=gb")
    const html = await page.content();
    const $ = cheerio.load(html);
    const listings = $(".result-info")
        .map((index, element) => {
            const titleElement = $(element).find(".result-title")
            const timeElement = $(element).find(".result-date");
            const hoodElement = $(element).find(".result-hood")
            const title = $(titleElement).text();
            const url = $(titleElement).attr("href");
            const datePosted = new Date($(timeElement).attr("datetime"));
            const hood = $(hoodElement)
                .text()
                .trim()
                .replace("(", "")
                .replace(")", "");
            return {title, url, datePosted, hood}
        })
        .get();
    return listings;
}

async function scrapeJobDescriptions(listings, page) {
    for (let i = 0; i < listings.length; i++) {
        await page.goto(listings[i].url);
        const html = await page.content();
        const $ = cheerio.load(html);
        const jobDescription = $("#postingbody").text();
        const compensation = $("p.attrgroup > span:nth-child(1) > b").text();
        listings[i].jobDescription = jobDescription;
        listings[i].compensation = compensation;
        console.log(listings[i].jobDescription);
        console.log(listings[i].compensation);
        const listingModel = new Listing(listings[i]);
        await listingModel.save();
        await sleep(3000);
    }
}

async function sleep(milliseconds) {
    return new Promise(resolve => setTimeout(resolve, milliseconds));
}

async function main() {
    await connectToMongoDb();
    const browser = await puppeteer.launch({headless: false});
    const page = await browser.newPage();
    const listings = await scrapeListings(page);
    const listingsWithJobDescriptions = await scrapeJobDescriptions(
        listings,
        page
    );
    console.log(listings);
}


main();