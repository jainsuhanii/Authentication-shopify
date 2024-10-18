const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.json());
const db = require('../database/db');

const { shopifyRestClient } = require("../shopify");
const { Sequelize } = require('sequelize');


const createCustomer = async (req, res) => {
  try {
    console.log(req.shop.dataValues);
    const { id, accessToken, name } = req.shop|| {};
    console.log(id, accessToken, name);    
    if (!name || !accessToken) {
      return res.status(400).json({
        message: 'Store name or accessToken is missing in the request',
      });
    }
    if (!req.body.customer) {
      return res.status(400).json({
        message: 'Customer data is missing in the request body',
      });
    }

    const { first_name = '', last_name = '', email = '', phone = '' } = req.body.customer;
    console.log(id, accessToken, name);

    const customerData = {
      customer: {
        first_name,
        last_name,
        email,
        phone,
      },
    };

    const client = shopifyRestClient(name, accessToken);
    
    const customerResponse = await client.post({
      path: 'customers',
      data: customerData,
    });

    if (customerResponse?.body?.customer) {
      const shopifyCustomer = customerResponse.body.customer;

      const customer = {
        customer_id: shopifyCustomer.id,
        first_name: shopifyCustomer.first_name,
        last_name: shopifyCustomer.last_name,
        email: shopifyCustomer.email,
        phone: shopifyCustomer.phone,
        store_id: id,
        name: name,
      };
      console.log(customer);

      const query = await db.Customers.create(customer);
      return res.status(200).json({
        message: 'Customer created and saved to database successfully',
        customer,
        dbCustomer: query,
      });
    } else {
      return res.status(400).json({ message: 'Failed to create customer in Shopify' });
    }
  } catch (error) {
    console.error('Error:', error.message || error);
    return res.status(500).json({ message: 'An error occurred while creating the customer', error: error.message });
  }
};



const updateCustomer = async (req, res) => {
  const { id: customer_id } = req.params;
  const { id, accessToken, name } = req.shop|| {};
  const { customer } = req.body;

  console.log(id, accessToken, name, customer_id);

  const customerData = {
    customer: {
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
    },
  };
  console.log(customerData);

  try {
      const client = shopifyRestClient(name, accessToken);

      const customerResponse = await client.put({
          path: `customers/${customer_id}`, 
          data: customerData,
      });

      if (customerResponse?.body?.customer) {
          const shopifyCustomer = customerResponse.body.customer;

          const updatedCustomer = {
              first_name: shopifyCustomer.first_name,
              last_name: shopifyCustomer.last_name,
              email: shopifyCustomer.email,
              phone: shopifyCustomer.phone,
              store_id: id,
              name: name,
          };

          const query = await db.Customers.update(updatedCustomer, {
              where: { customer_id: customer_id },  
          });

          return res.status(200).json({
              message: 'Customer updated and saved to database successfully',
              customer: updatedCustomer,
              dbCustomer: query,
          });
      } else {
          return res.status(400).json({ message: 'Failed to update customer in Shopify' });
      }
  } catch (error) {
      console.error('Error updating customer in Shopify:', error.message || error);
      return res.status(500).json({ message: 'Failed to update customer in Shopify', error: error.message });
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

    const { rows: dbCustomers, count: totalCustomers } = await db.Customers.findAndCountAll({
      limit: limit,
      offset: offset,
    });

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

  const transaction = await db.sequelize.transaction(); 

  try {
    const customer = await db.Customers.findOne({
      where: { customer_id: customer_id },
      transaction, 
    });

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found in the database',
      });
    }

    const addresses = await db.Addresses.findAll({
      where: { customer_id: customer.id },
      transaction, 
    });

    if (addresses.length > 0) {
      await db.Addresses.destroy({
        where: { customer_id: customer.id },
        transaction, 
      });
    }

    await db.Customers.destroy({
      where: { customer_id: customer_id },
      transaction, 
    });

    const client = shopifyRestClient(store_domain, shopifyAccessToken);
    await client.delete({
      path: `customers/${customer_id}`,
    });

    await transaction.commit();

    return res.status(200).json({
      message: 'Customer and their addresses deleted successfully',
    });
  } catch (error) {
    await transaction.rollback();

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


