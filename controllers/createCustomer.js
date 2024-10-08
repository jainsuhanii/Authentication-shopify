const express = require('express');
const router = express.Router();
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

module.exports = router;
module.exports.createCustomer = createCustomer;
module.exports.token = token;


