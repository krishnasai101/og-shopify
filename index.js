const dotenv = require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const cookie = require('cookie');
const nonce = require('nonce')();
const querystring = require('querystring');
// const axios = require('axios');
const http = require('http');
const shopifyApiPublicKey = process.env.SHOPIFY_API_KEY;
const shopifyApiSecretKey = process.env.SHOPIFY_API_SECRET;
const scopes = 'write_products';
const appUrl = 'https://og-shopify.herokuapp.com';
const request = require('request');

const app = express();
const PORT = process.env.PORT

app.get('/', (req, res) => {
  res.send('Welcome to shopify app');
});


app.get('/shopify', (req, res) => {

  const shop = req.query.shop;
  if (shop) {
    const state = nonce();
    console.log("Stateee", state);
    const redirectUri = `${appUrl}/shopify/callback`;
    const installUrl = `https://${shop}/admin/oauth/authorize?client_id=${shopifyApiPublicKey}&scope=${scopes}&state=${state}&redirect_uri=${redirectUri}`;
    res.cookie('state', state);
    res.redirect(installUrl);
  }
  else {
    return res.status(400).send('Shop is not availabe..can you please check the url whether you entered shop name correctly')
  }

})


app.get('/shopify/callback', (req, res) => {


  console.log("ree", req.query);
  const { shop, hmac, code, state } = req.query;
  const stateCookie = cookie.parse(req.headers.cookie).state;

  if (state !== stateCookie) {
    return res.status(403).send('cannot verify');
  }
  if (shop && hmac && code) {

    const map = Object.assign({}, req.query);
    delete map['signature'];
    delete map['hmac'];
    const message = querystring.stringify(map);
    const generatedHash = crypto.createHmac('sha256', shopifyApiSecretKey).update(message).digest('hex');

    if (generatedHash !== hmac) {
      return res.status(400).send('HMAC validation failed');
    }
    // res.status(200).send('HMAC validated');
    try {
      const accessTokenRequestUrl = `https://${shop}/admin/oauth/access_token`;
      const accessTokenPayload = {
        client_id: shopifyApiPublicKey,
        client_secret: shopifyApiSecretKey,
        code,
      };
      request.post(accessTokenRequestUrl, { json: accessTokenPayload }, (err, accessTokenResponse) => {
        const accessToken = accessTokenResponse['body']['access_token'];
        console.log("aaaa", accessTokenResponse['body']['access_token']);
        // res.status(200).send("Got access tokemn");
        const shopRequestUrl = `https://${shop}/admin/shop.json`;
        const shopRequestHeaders = {
          'X-Shopify-Access-Token': accessToken
        }
        console.log("II", shopRequestUrl)
        request.get(shopRequestUrl, { headers: shopRequestHeaders }, (err, shopResponse) => {
          if (err) {
            throw new Error('Gotchaaaa');
          }
          // res.send(shopResponse);
          res.send(`<h1>Welcome to <a href="outgrow" target="_blank">Outgrow-Shopify</a></h1>`);
        })

      })

    }
    catch (err) {
      res.status(err.statusCode).send("Error over here");
    }

  }
  else {
    res.status(400).send("Parameters missing");
  }

})


app.get('/shopify/outgrow', (req, res) => {
  console.log("REQQQ URLLLL", req.url);

  const url = req.url.split('/').pop();
  if (url === 'outgrow') {
    console.log(req.url);
    res.redirect('https://app.outgrow.co');
  }

})


app.listen(PORT, () => console.log(`listening on port ${PORT}`));