const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const secretKey= "suhani123";
const bodyParser = require('body-parser');
router.use(bodyParser.json());

const token = async (req, res,next) => {
  const { shop } = req.body;
  const payload = {
    shop: shop
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: '1h' })
  res.status(200).json({ token })
};

const createCustomerAndAddress = async (req, res) => {
    const { id, accessToken, shop } = req.shop;
    const { first_name, last_name, email, phone, address } = req.body.customer;
  
    console.log(id, accessToken, shop);
  
    const customerData = {
      customer: {
        first_name,
        last_name,
        email,
        phone,
      },
    };
  
    let customerResponse;
    try {
      customerResponse = await axios.post(
        `https://${shop}/admin/api/2021-07/customers.json`,
        customerData,
        { headers: { 'X-Shopify-Access-Token': accessToken } }
      );
    } catch (error) {
      console.error('Error creating customer in Shopify:', error.response?.data || error.message);
      return res.status(500).json({ message: 'Failed to create customer in Shopify', error: error.message });
    }
  
    if (customerResponse.data && customerResponse.data.customer) {
      const shopifyCustomer = customerResponse.data.customer;
      console.log('Shopify Customer:', shopifyCustomer);
  
      const customer = {
        first_name: shopifyCustomer.first_name,
        last_name: shopifyCustomer.last_name,
        email: shopifyCustomer.email,
        phone: shopifyCustomer.phone,
        store_id: id,
      };
  
      const customerQuery = `
        INSERT INTO customers (customer_id, first_name, last_name, email, phone, store_id)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const customerValues = [
        shopifyCustomer.id,
        customer.first_name,
        customer.last_name,
        customer.email,
        customer.phone,
        id,
      ];
  
      try {
        const [customerResult] = await global.connection.query(customerQuery, customerValues);
  
        if (address) {
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
  
          let addressResponse;
          try {
            addressResponse = await axios.post(
              `https://${shop}/admin/api/2024-07/customers/${shopifyCustomer.id}/addresses.json`,
              addressData,
              { headers: { 'X-Shopify-Access-Token': accessToken } }
            );
          } catch (error) {
            console.error('Error creating address in Shopify:', error.response?.data || error.message);
            return res.status(500).json({ message: 'Failed to create address in Shopify', error: error.message });
          }
  
          if (addressResponse.data && addressResponse.data.customer_address) {
            const shopifyAddress = addressResponse.data.customer_address;
  
            const addressToSave = {
              line1: shopifyAddress.address1,
              line2: shopifyAddress.address2,
              city: shopifyAddress.city,
              state: shopifyAddress.province,
              zip: shopifyAddress.zip,
              country: shopifyAddress.country,
              customer_id: shopifyCustomer.id,
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
              shopifyCustomer.id,
              shopifyAddress.id,
            ];
  
            try {
              const [addressResult] = await global.connection.query(addressQuery, addressValues);
              return res.status(200).json({
                message: 'Customer and address created and saved successfully',
                customer: shopifyCustomer,
                address: shopifyAddress,
              });
            } catch (dbError) {
              console.error('Error saving address to the database:', dbError.message);
              return res.status(500).json({ message: 'Failed to save address to database', error: dbError.message });
            }
          } else {
            console.error('No address returned in Shopify response');
            return res.status(400).json({ message: 'Failed to create address in Shopify: No address returned' });
          }
        } else {
          return res.status(200).json({ message: 'Customer created and saved successfully', customer: shopifyCustomer });
        }
      } catch (dbError) {
        console.error('Database error:', dbError.message);
        return res.status(500).json({ message: 'Failed to save customer in database' });
      }
    } else {
      return res.status(400).json({ message: 'Failed to create customer in Shopify' });
    }
  };
module.exports = router;
module.exports.createCustomerAndAddress = createCustomerAndAddress;
module.exports.token = token;
