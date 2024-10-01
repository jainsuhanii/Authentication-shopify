const customer = require('./models/customer');
const address = require('./models/address');
const createConnection= require ('./db');
const express = require('express');

const axios = require('axios');
require('dotenv').config();
const crypto = require('crypto');
const router = require('./models/customer');
port = 3000;
const app = express();
app.use(express.json());

const { CLIENT_ID, CLIENT_SECRET, REDIRECT_URL, SCOPES } = process.env;
function getShopData(requestedShop) {
    return requestedShop;
  }
  
  module.exports = getShopData;

app.get('/install', (req, res) => {
    console.log(req.query); 
    const requestedShop = req.query.shop;
    if (!requestedShop) {
      return res.status(400).send('Missing shop parameter');
    }
    const installUrl = `https://${requestedShop}/admin/oauth/authorize?client_id=${CLIENT_ID}&scope=${SCOPES}&redirect_uri=${REDIRECT_URL}`;  
    res.redirect(installUrl);
  });

app.get('/api/auth/redirect/callback', async (req, res) => {
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

    const connection = await createConnection();
        console.log('Database connection established');
  
    const query = `
      INSERT IGNORE INTO store (name, accessToken,email,username) 
      VALUES (?, ?,?,?)
      ON DUPLICATE KEY UPDATE 
      username= VALUES(username),
      email=VALUES(email),
      accessToken = VALUES(accessToken);
    `;

    connection.query(query, [shop, accessToken,email,username], (err, results) => {
      if (err) {
        console.error('Error saving shop data:', err);
        return res.status(500).send('Internal server error');
      }
      console.log('Shop data saved successfully:', results);
    });

    res.send('App installed successfully!'); 
  } catch (error) {
    console.error('Error during OAuth process:', error);
    res.status(500).send('Failed to get access token');
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

module.exports=app;
app.use(customer, router);
app.use(express.json());
app.use("/customers",customer);
app.use(express.json());
app.use("/address",address);
app.use(address,router);