const express = require('express');
const router = express.Router();
const axios = require('axios');
const bodyParser = require('body-parser');
const customerRouter=require("./createCustomer");
router.use('/customers',customerRouter);
router.use(bodyParser.json());

  const updateCustomerAndAddress = async (req, res) => {
    const { customer_id } = req.params;
    const { id, accessToken, shop } = req.shop;
    const { customer, address } = req.body; 
  
    console.log(id, accessToken, shop, customer_id);

    let currentCustomer;
    try {
        const [customerRows] = await global.connection.query(
            "SELECT * FROM customers WHERE customer_id = ? AND store_id = ?",
            [customer_id, id]
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
            const customerResponse = await axios.put(
                `https://${shop}/admin/api/2024-07/customers/${customer_id}.json`,
                customerData,
                { headers: { 'X-Shopify-Access-Token': accessToken } }
            );

            if (!customerResponse.data || !customerResponse.data.customer) {
                throw new Error('Failed to update customer in Shopify');
            }
            const customerUpdateQuery = `
                UPDATE customers 
                SET first_name = ?, last_name = ?, email = ?, phone = ? 
                WHERE customer_id = ? AND store_id = ?
            `;
            const customerUpdateValues = [
                customer.first_name || currentCustomer.first_name,
                customer.last_name || currentCustomer.last_name,
                customer.email || currentCustomer.email,
                customer.phone || currentCustomer.phone,
                customer_id,
                id,
            ];

            await global.connection.query(customerUpdateQuery, customerUpdateValues);
        } catch (error) {
            console.error('Error updating customer:', error.message);
            return res.status(500).json({ message: 'Failed to update customer in Shopify', error: error.message });
        }
    }

    if (address) {
        try {
            const addressQuery = `
                SELECT address_id FROM addresses 
                WHERE customer_id = ? 
            `;
            const [addressRows] = await global.connection.query(addressQuery, [customer_id]);

            if (addressRows.length === 0) {
                return res.status(404).json({ message: 'Address not found for the customer in the database.' });
            }

            const address_id = addressRows[0].address_id; 

            const addressData = {
                address: {
                    address1: address.line1,
                    address2: address.line2,
                    city: address.city,
                    province: address.state,
                    zip: address.zip,
                    country: address.country,
                },
            };

            const addressResponse = await axios.put(
                `https://${shop}/admin/api/2024-07/customers/${customer_id}/addresses/${address_id}.json`,
                addressData,
                { headers: { 'X-Shopify-Access-Token': accessToken } }
            );

            if (!addressResponse.data || !addressResponse.data.customer_address) {
                throw new Error('Failed to update address in Shopify');
            }

            const addressUpdateQuery = `
                UPDATE addresses 
                SET line1 = ?, line2 = ?, city = ?, state = ?, zip = ?, country = ?
                WHERE customer_id = ? 
            `;
            const addressUpdateValues = [
                address.line1,
                address.line2,
                address.city,
                address.state,
                address.zip,
                address.country,
                customer_id
            ];

            await global.connection.query(addressUpdateQuery, addressUpdateValues);
        } catch (error) {
            console.error('Error updating address:', error.message);
            return res.status(500).json({ message: 'Failed to update address in Shopify', error: error.message });
        }
    }
    res.status(200).json({
        message: 'Customer and/or address updated successfully',
        customer: customer || null,
        address: address || null,
    });
};

module.exports = router;
module.exports.updateCustomerAndAddress = updateCustomerAndAddress;

