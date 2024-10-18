
const express = require('express');
const app = express();
app.use(express.json());

const axios = require('axios');
require('dotenv').config();
const crypto = require('crypto');
const db = require('../database/db');
port = 3000;


const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URL, SCOPES } = process.env;
function getShopData(requestedShop) {
    return requestedShop;
  }
  
const install=async (req, res) => {
    const requestedShop = req.query.shop;
    if (!requestedShop) {
      return res.status(400).send('Missing shop parameter');
    }
    const installUrl = `https://${requestedShop}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${REDIRECT_URL}`;  
    res.redirect(installUrl);
  };

const redirect= async (req, res) => {
  const { shop, hmac, code } = req.query;

  const params = new URLSearchParams(req.query);
  params.delete('hmac');
  const message = decodeURIComponent(params.toString());
  
  const generatedHmac = crypto
    .createHmac('sha256', CLIENT_SECRET)
    .update(message)
    .digest('hex');

  if (generatedHmac !== hmac) {
    return res.status(400).send('HMAC validation failed');
  }

  try {
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    const tokenResponse = await axios.post(tokenUrl, {
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code
    });


    const accessToken = tokenResponse.data.access_token;

    const storeUrl = `https://${shop}/admin/api/2022-01/shop.json`;
    const storeResponse = await axios.get(storeUrl, {
      headers: {
        'X-Shopify-Access-Token': accessToken
      }
    });
    const email = storeResponse.data.shop.email;
    const username = email.split('@')[0];
  
    const storeData = {
      name: shop,
      accessToken: accessToken,
      email: email,
      username: username
    };

    let [strs, created] = await db.Stores.findOrCreate({
      where: {
         name: shop 
      },
      defaults: storeData
    });

    if (!created) await strs.update(storeData);
    
    // db.Stores.findOrCreate({
    //   where: { name: shop },
    //   defaults: storeData
    // }).spread((store, created) => {
    //   if (!created) {
    //     db.Stores.update(storeData).then(() => {
    //       console.log('Shop data saved successfully');
    //     }).catch(err => {
    //       console.error('Error saving shop data:', err);
    //       return res.status(500).send('Internal server error');
    //     });
    //   }
    // });
    // sequelize.query(query, [shop, accessToken,email,username], (err, results) => {
    //   if (err) {
    //     console.error('Error saving shop data:', err);
    //     return res.status(500).send('Internal server error');
    //   }
    //   console.log('Shop data saved successfully:', results);
    // });

    res.send('App installed successfully!'); 
  } catch (error) {
    console.error('Error during OAuth process:', error);
    res.status(500).send('Failed to get access token');
  }
};

module.exports = app;
module.exports.install = install;
module.exports.redirect = redirect;