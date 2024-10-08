const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.json());

const { shopifyRestClient } = require("../shopify")

const createAddress = async (req, res) => {
    const { id, accessToken, shop } = req.shop;
    const { id:customer_id } = req.params;
    const { address } = req.body;
    if (!address) {
      return res.status(400).json({ message: 'Address is required' });
    }
  
    const { line1, line2, city, state, zip, country } = address;
  
    const addressData = {
      address: {
        address1: line1,
        address2: line2,
        city,
        province: state,
        zip,
        country,
      },
    };
  
    try {
      const client = shopifyRestClient(shop, accessToken);
      const addressResponse = await client.post({
        path: `customers/${customer_id}/addresses.json`,
        data: addressData,
      });
     
  
  
      if (addressResponse.body.customer_address) {
        const shopifyAddress = addressResponse.body.customer_address;
  
        const addressToSave = {
          line1: shopifyAddress.address1,
          line2: shopifyAddress.address2,
          city: shopifyAddress.city,
          state: shopifyAddress.province,
          zip: shopifyAddress.zip,
          country: shopifyAddress.country,
          customer_id: customer_id,
        };
  
        const addressQuery = `
          INSERT INTO addresses (line1, line2, city, state, zip, country, customer_id, address_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const addressValues = [
          addressToSave.line1,
          addressToSave.line2,
          addressToSave.city,
          addressToSave.state,
          addressToSave.zip,
          addressToSave.country,
          customer_id,
          shopifyAddress.id,
        ];
  
        try {
          await global.connection.query(addressQuery, addressValues);
          return res.status(200).json({
            message: 'Address created and saved successfully',
            address: shopifyAddress,
          });
        } catch (dbError) {
          console.error('Error saving address to the database:', dbError.message);
          return res.status(500).json({ message: 'Failed to save address to database', error: dbError.message });
        }
      } else {
        return res.status(400).json({ message: 'Failed to create address in Shopify: No address returned' });
      }
    } catch (error) {
      console.error('Error creating address in Shopify:', error.response?.data || error.message);
      return res.status(500).json({ message: 'Failed to create address in Shopify', error: error.message });
    }
  };

  module.exports.createAddress = createAddress;
