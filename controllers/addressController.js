const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.json());

const { shopifyRestClient, shopifyGraphQLClient } = require("../shopify");
const { Addresses } = require('../database/db');

async function createAddress(req, res) {
  const store_domain = req.shop.shop;
  const shopifyAccessToken = req.shop.accessToken;
  const { id: customerId } = req.params; // Extract customerId from request parameters
  const { address } = req.body; // Extract address data from the request body

  const client = shopifyGraphQLClient(store_domain, shopifyAccessToken);

  // Define the GraphQL mutation
  const customerAddressCreateMutation = `
    mutation customerAddressCreate($input: MailingAddressInput!) {
      customerAddressCreate(input: $input) {
        customerAddress {
          id
          firstName
          lastName
          address1
          address2
          city
          province
          country
          zip
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      customerId: `gid://shopify/Customer/${customerId}`, // Format the customerId correctly
      ...address, // Spread the address fields into the input
    },
  };

  try {
    const shopifyResponse = await client.query({
      data: {
        query: customerAddressCreateMutation,
        variables,
      },
    });

    const data = shopifyResponse.body.data.customerAddressCreate;

    if (data.userErrors.length > 0) {
      return res.status(400).json({
        message: 'Failed to create customer address',
        errors: data.userErrors,
      });
    }

    return res.status(200).json({
      message: 'Customer address created successfully',
      address: data.customerAddress,
    });
  } catch (error) {
    console.error('Error creating customer address:', error?.response?.body || error.message);
    return res.status(500).json({
      message: 'Error creating customer address',
      error: error.message || error?.response?.body,
    });
  }
}




const updateAddress = async (req, res) => {
  const { customer_id, address_id } = req.params;
  const { id, accessToken, shop } = req.shop;
  const { address } = req.body;

  if (!address) {
    return res.status(400).json({ message: 'No address data provided for update.' });
  }

  const updateAddressInShopify = async (client, customer_id, address_id, addressData) => {
    const response = await client.put({
      path: `customers/${customer_id}/addresses/${address_id}.json`,
      data: { customer_address: addressData },
    });
    return response;
  };

  let currentAddress;
  try {
    currentAddress = await Addresses.findOne({
      where: { address_id: address_id, customer_id: customer_id }
    });

    if (!currentAddress) {
      return res.status(404).json({ message: 'Address not found in the database.' });
    }
  } catch (error) {
    console.error('Error fetching address data from DB:', error.message);
    return res.status(500).json({ message: 'Failed to fetch address data from DB', error: error.message });
  }

  const addressData = {
    address1: address.line1 || currentAddress.line1,
    address2: address.line2 || currentAddress.line2,
    city: address.city || currentAddress.city,
    province: address.state || currentAddress.state,
    zip: address.zip || currentAddress.zip,
    country: address.country || currentAddress.country,
  };

  try {
    const client = shopifyRestClient(shop, accessToken);
    const shopifyResponse = await updateAddressInShopify(client, customer_id, address_id, addressData);

    await currentAddress.update({
      line1: addressData.address1,
      line2: addressData.address2,
      city: addressData.city,
      state: addressData.province,
      zip: addressData.zip,
      country: addressData.country,
    });

    return res.status(200).json({ message: 'Address updated successfully', shopifyResponse });
  } catch (error) {
    console.error('Error updating address in Shopify:', error.message);
    return res.status(500).json({ message: 'Failed to update address in Shopify', error: error.message });
  }
};


async function getAllAddresses(req, res) {
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

    // Fetch customers from Shopify
    const shopifyResponse = await client.get({
      path: 'customers',
      query: requestParams,
    });

    const shopifyCustomers = shopifyResponse.body.customers || [];
    const nextPageInfo = shopifyResponse.body.page_info?.next || null;

    const shopifyAddresses = shopifyCustomers.flatMap(customer => customer.addresses || []);

    const dbCustomers = await Addresses.findAll({
      limit,
      offset,
    });

    const totalCustomers = await Addresses.count();

    return res.status(200).json({
      message: 'Customers and their addresses fetched successfully',
      shopifyAddresses,
      dbCustomers,
      pagination: {
        currentPage: Math.floor(offset / limit) + 1,
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

  
async function deleteAddress(req, res) {
  const store_domain = req.shop.shop;
  const shopifyAccessToken = req.shop.accessToken;
  const { customer_id, address_id } = req.params; 
  console.log(store_domain, shopifyAccessToken);

  try {
    const address = await Addresses.findOne({
      where: {
        address_id: address_id,
        customer_id: customer_id
      }
    });

    if (!address) {
      return res.status(404).json({
        message: 'Address not found in the database',
      });
    }

    const client = shopifyGraphQLClient(store_domain, shopifyAccessToken);
    await client.delete({
      path: `customers/${customer_id}/addresses/${address_id}`,
    });

    await Addresses.destroy({
      where: {
        address_id: address_id
      }
    });

    return res.status(200).json({
      message: 'Address deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting address:', error?.response?.body || error.message);
    return res.status(500).json({
      message: 'Error deleting address',
      error: error.message || error?.response?.body,
    });
  }
}

module.exports.createAddress = createAddress;
module.exports.updateAddress = updateAddress;
module.exports.getAllAddresses = getAllAddresses;
module.exports.deleteAddress = deleteAddress;
