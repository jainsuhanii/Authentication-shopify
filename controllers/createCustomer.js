const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const secretKey = "suhani123";
const bodyParser = require('body-parser');
router.use(bodyParser.json());

const { shopifyRestClient } = require("../shopify")


const token = async (req, res, next) => {
  const { shop } = req.body;
  const payload = {
    shop: shop
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: '1h' })
  res.status(200).json({ token })
};

const createCustomer = async (req, res) => {
  const { id, accessToken, shop } = req.shop;
  const { first_name, last_name, email, phone } = req.body.customer;
  console.log(id, accessToken, shop);
  const customerData = {
    customer: {
      first_name,
      last_name,
      email,
      phone,
    },
  };

  const client = shopifyRestClient(shop, accessToken);
  const customerResponse = await client.post({
    path: 'customers',
    data: customerData,
  });


  if (customerResponse?.body?.customer) {
    const shopifyCustomer = customerResponse.body.customer;
    console.log(shopifyCustomer);

    const customer = {
      first_name: shopifyCustomer.first_name,
      last_name: shopifyCustomer.last_name,
      email: shopifyCustomer.email,
      phone: shopifyCustomer.phone,
      store_id: id,
    };
    const query = `
          INSERT INTO customers (customer_id, first_name, last_name, email, phone, store_id)
          VALUES (?, ?, ?, ?, ?,?)
        `;
    const values = [shopifyCustomer.id, customer.first_name, customer.last_name, customer.email, customer.phone, id];
    try {
      const [result] = await global.connection.query(query, values);
      return res.status(200).json({
        message: 'Customer created and saved to database successfully',
        customer,
        dbResult: result,
      });
    } catch (dbError) {
      console.error('Database error:', dbError.message || dbError);
      return res.status(500).json({ message: 'Failed to save customer in database' });
    }
  } else {
    return res.status(400).json({ message: 'Failed to create customer in Shopifyy' });
  }
};

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


module.exports = router;
module.exports.createCustomer = createCustomer;
module.exports.createAddress = createAddress;
module.exports.token = token;


