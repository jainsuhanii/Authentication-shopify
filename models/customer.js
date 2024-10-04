const express = require('express');
const router = express.Router();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const secretKey= "suhani123";
const {verifyJwt}=require("../middlewares/auth");
router.post('/api/token', (req, res,next) => {
  const { shop } = req.body;
  const payload = {
    shop: shop
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: '1h' })
  res.status(200).json({ token })
})

const createCustomer= async (req, res) => {
  const { id, accessToken,shop } = req.shop;
  const { first_name, last_name, email, phone } = req.body.customer;
  console.log(id,accessToken,shop);

  const customerData = {
    customer: {
      first_name,
      last_name,
      email,
      phone,
    },
  };
  console.log(customerData);
  let response;
  try {
    response = await axios.post(
      `https://${shop}/admin/api/2021-07/customers.json`,
      customerData,
      { headers: { 'X-Shopify-Access-Token': accessToken } }
    );
  } catch (error) {
    console.error('Error creating customer in Shopify:', error.response.data);
    return res.json({ message: 'Failed to create customer in Shopify' ,error:error.message});
  }


  if (response.data && response.data.customer) {
    const shopifyCustomer = response.data.customer;
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
    const values = [shopifyCustomer.id, customer.first_name, customer.last_name, customer.email, customer.phone,id];

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


const updateCustomer= async (req, res) => {
  const { id:customer_id } = req.params; 
  const { accessToken, shop } = req.shop; 
  const { first_name, last_name, email, phone } = req.body.customer; 

  const customerData = {
    customer: {
      first_name,
      last_name,
      email,
      phone,
    },
  };

  let response;
  try {
    response = await axios.put(
      `https://${shop}/admin/api/2024-07/customers/${customer_id}.json`,
      customerData, { headers: { 'X-Shopify-Access-Token': accessToken } }
    );
  } catch (error) {
    console.error('Error updating customer in Shopify:', error.response.data);
    return res.json({ message: 'Failed to update customer in Shopify', error: error.message });
  }
  if (response.data && response.data.customer) {
    const {email, first_name, last_name, phone} = response.data.customer;

    const query = `
      UPDATE customers 
      SET first_name = '${first_name}', last_name = '${last_name}', email = '${email}', phone = '${phone}'
      WHERE customer_id = '${customer_id}'
    `;

    console.log(query);

    try {    
      const [result] = await global.connection.query(query);
      return res.status(200).json({
        message: 'Customer updated successfully',
        customer: {
          first_name,
          last_name,
          email,
          phone,
        },
        dbResult: result,
      });
    } catch (dbError) {
      console.error('Database error:', dbError.message || dbError);
      return res.status(500).json({ message: 'Failed to update customer in database' });
    }
  } else {
    return res.status(400).json({ message: 'Failed' });
  }
};

module.exports = router;
module.exports.createCustomer=createCustomer;
module.exports.updateCustomer=updateCustomer;
