const axios = require("axios");
const https = require("https");
const cheerio = require("cheerio");
const config = require("./config");
const jimp = require("jimp");
const fs = require('fs');

const twitter = require('twitter-api-client');


const fetchData = async () => {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const result = await axios.get(config.siteUrl, {httpsAgent});

  return cheerio.load(result.data);
};

const getCount = async () => {
  const $ = await fetchData();
  return $('h1 > em').text();

}

const writeTextOnImage = async (input, output, text) => {
  const inputImage = await jimp.read(input);
  const font = await jimp.loadFont(jimp.FONT_SANS_128_WHITE);
  await inputImage.color([{ apply: 'shade', params: [50] }]).print(font, 0, 0, {
    text,
    alignmentX: jimp.HORIZONTAL_ALIGN_CENTER,
    alignmentY: jimp.VERTICAL_ALIGN_MIDDLE
  }, inputImage.bitmap.width, inputImage.bitmap.height).write(output);
}

const twitterClient = new twitter.TwitterClient({
  apiKey: config.twitterApiKey,
  apiSecret: config.twitterApiSecret,
  accessToken: config.twitterAccessToken,
  accessTokenSecret: config.twitterAccessTokenSecret,
});

const updateTwitterBanner = async (image) => {
  const bannerBase64 = fs.readFileSync(image, {encoding: 'base64'});
  await twitterClient.accountsAndUsers.accountUpdateProfileBanner({banner: bannerBase64});
}

const main = async () => {
  const count = await getCount();
  const lastCount = fs.existsSync(config.lastCountFile) ? fs.readFileSync(config.lastCountFile) : 0;

  if (+count === +lastCount) {
    console.log(`Count hasn't changed (${count}), quitting.`);
    return;
  }

  fs.writeFileSync(config.lastCountFile, count);
  console.log(`Count has changed: now ${count}, was ${lastCount}.`);

  console.log(`Producing banner image in ${config.tempImage}...`);
  await writeTextOnImage(config.backgroundImage, config.tempImage, count);

  console.log(`Updating twitter image banner...`);
  await updateTwitterBanner(config.tempImage);

  console.log("All done!");
}

main();
