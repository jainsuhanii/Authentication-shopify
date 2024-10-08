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
module.exports = router;
module.exports.updateCustomer = updateCustomer;
