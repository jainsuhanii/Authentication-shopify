const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.json());

const { shopifyRestClient } = require("../shopify")

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


const updateCustomer = async (req, res) => {
    const { id: customer_id } = req.params;
    const { id, accessToken, shop } = req.shop; 
    const { customer } = req.body;

    console.log(id, accessToken, shop, customer_id);

    let currentCustomer;
    try {
        const [customerRows] = await global.connection.query(
            "SELECT * FROM customers WHERE customer_id = ?",
            [customer_id]
        );

        if (customerRows.length === 0) {
            return res.status(404).json({ message: 'Customer not found in the database.' });
        }

        currentCustomer = customerRows[0]; 
    } catch (error) {
        console.error('Error fetching customer data:', error.message);
        return res.status(500).json({ message: 'Failed to fetch customer data', error: error.message });
    }

    if (customer) {
        const customerData = {
            customer: {
                id: customer_id,
                last_name: customer.last_name || currentCustomer.last_name,
                email: customer.email || currentCustomer.email,
                phone: customer.phone || currentCustomer.phone,
            },
        };

        try {
            const client = shopifyRestClient(shop, accessToken); 
            const customerResponse = await client.put({
                path: `customers/${customer_id}`,
                data: customerData,
            });

            console.log('Customer updated in Shopify:', customerResponse);

            const customerUpdateQuery = `
                UPDATE customers 
                SET first_name = ?, last_name = ?, email = ?, phone = ? 
                WHERE customer_id = ?
            `;

            const customerUpdateValues = [
                customer.first_name || currentCustomer.first_name,
                customer.last_name || currentCustomer.last_name,
                customer.email || currentCustomer.email,
                customer.phone || currentCustomer.phone,
                customer_id,
            ];

            await global.connection.query(customerUpdateQuery, customerUpdateValues);

            return res.status(200).json({ message: 'Customer updated successfully' });
        } catch (error) {
            console.error('Error updating customer in Shopify:', error.message);
            return res.status(500).json({ message: 'Failed to update customer in Shopify', error: error.message });
        }
    } else {
        return res.status(400).json({ message: 'No customer data provided to update' });
    }
};

async function getAllCustomers(req, res) {
    const store_domain = req.shop.shop;
    const shopifyAccessToken = req.shop.accessToken;
  
    const limit = parseInt(req.query.limit) || 5; 
    const pageInfo = req.query.page_info || null; 
    const offset = parseInt(req.query.offset) || 0;  
  
    try {
      const client = shopifyRestClient(store_domain, shopifyAccessToken);
  
      const requestParams = { 
        limit,
      };
  
      if (pageInfo) {
        requestParams.page_info = pageInfo;
      }
  
      const shopifyResponse = await client.get({
        path: 'customers',
        query: requestParams,
      });
  
      const shopifyCustomers = shopifyResponse.body.customers || [];
      const nextPageInfo = shopifyResponse.body.page_info?.next || null;
  
      // Fetch customers from the database
      const sqlQuery = `SELECT * FROM customers LIMIT ? OFFSET ?`;
      const [dbCustomers] = await global.connection.query(sqlQuery, [limit, offset]);
  
      const countQuery = `SELECT COUNT(*) as total FROM customers`;
      const [countResult] = await global.connection.query(countQuery);
      const totalCustomers = countResult[0].total;
  
      return res.status(200).json({
        message: 'Customers fetched successfully',
        dbCustomers,
        pagination: {
          currentPage: offset / limit + 1,
          limit,
          totalCustomers,
          totalPages: Math.ceil(totalCustomers / limit),
          nextPageInfo,
        },
      });
    } catch (error) {
      console.error('Error fetching customers:', error?.response?.body || error.message);
      return res.status(500).json({
        message: 'Error fetching customers',
        error: error.message || error?.response?.body,
      });
    }
  }
  
  async function deleteCustomer(req, res) {
    const store_domain = req.shop.shop;
    const shopifyAccessToken = req.shop.accessToken;
    const { customer_id } = req.params; 
  
    try {
      const checkCustomerQuery = `SELECT * FROM customers WHERE customer_id = ?`;
      const [customer] = await global.connection.query(checkCustomerQuery, [customer_id]);
  
      if (customer.length === 0) {
        return res.status(404).json({
          message: 'Customer not found in the database',
        });
      }
  
      await global.connection.query('START TRANSACTION');
      await global.connection.query(`DELETE FROM addresses WHERE customer_id = ?`, [customer[0].id]);
      await global.connection.query(`DELETE FROM customers WHERE customer_id = ?`, [customer_id]);
      const client = shopifyRestClient(store_domain, shopifyAccessToken);
  
      await client.delete({
        path: `customers/${customer_id}`,
      });
  
      await global.connection.query('COMMIT');
  
      return res.status(200).json({
        message: 'Customer and their addresses deleted successfully',
      });
    } catch (error) {
      await global.connection.query('ROLLBACK');
  
      console.error('Error deleting customer:', error?.response?.body || error.message);
      return res.status(500).json({
        message: 'Error deleting customer',
        error: error.message || error?.response?.body,
      });
    }
  }
module.exports.deleteCustomer = deleteCustomer;
module.exports.getAllCustomers = getAllCustomers;
module.exports.updateCustomer = updateCustomer;
module.exports.createCustomer = createCustomer;


