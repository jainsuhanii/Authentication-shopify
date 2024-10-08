const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { shopifyRestClient } = require("../shopify")

router.use(bodyParser.json());

const customerRouter=require("./createCustomer");
router.use('/customers',customerRouter);

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


//////  
/////
const updateAddressInShopify = async (client, customer_id, address_id, addressData) => {
    const response = await client.put({
      path: `customers/${customer_id}/addresses/${address_id}.json`,
      data: { customer_address: addressData },
    });
    return response;
  };
  

  const updateAddress = async (req, res) => {
    const { customer_id, address_id } = req.params;
    const { id, accessToken, shop } = req.shop; 
    const { address } = req.body; 
  
    if (!address) {
      return res.status(400).json({ message: 'No address data provided for update.' });
    }
  
    let currentAddress;
    try {
      const [addressRows] = await global.connection.query(
        "SELECT * FROM addresses WHERE address_id = ? AND customer_id = ?",
        [address_id, customer_id]
      );
  
      if (addressRows.length === 0) {
        return res.status(404).json({ message: 'Address not found in the database.' });
      }
  
      currentAddress = addressRows[0]; 
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
    
      const addressUpdateQuery = `
        UPDATE addresses 
        SET line1 = ?, line2 = ?, city = ?, state = ?, zip = ?, country = ?
        WHERE address_id = ? AND customer_id = ?
      `;
      const addressUpdateValues = [
        addressData.address1,
        addressData.address2,
        addressData.city,
        addressData.province,
        addressData.zip,
        addressData.country,
        address_id,
        customer_id,
      ];
  
      await global.connection.query(addressUpdateQuery, addressUpdateValues);
  
      return res.status(200).json({ message: 'Address updated successfully', shopifyResponse });
    } catch (error) {
      console.error('Error updating address in Shopify:', error.message);
      return res.status(500).json({ message: 'Failed to update address in Shopify', error: error.message });
    }
  };

module.exports = router;
module.exports.updateCustomer = updateCustomer;
module.exports.updateAddress = updateAddress;
