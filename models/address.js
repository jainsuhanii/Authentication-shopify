const express = require('express');
const router = express.Router();
const axios = require('axios');
const createConnection = require('../db');
const {verifyJwt}=require("../models/customer");
const customerRouter=require("../models/customer");
router.use('/customers',customerRouter);

router.post('/address', verifyJwt, async (req, res) => {
    const {accessToken, shop } = req.shop;
    console.log(accessToken);
    const { line1, line2, city, state, zip, customer_id, country } = req.body.address;
    if (!customer_id) {
        return res.status(400).json({ message: 'Customer ID is required' });
    }
    if (!country) {
        return res.status(400).json({ message: 'Country is required' });
    }

    const addressData = {
        address: {
            address1: line1,
            address2: line2,
            city,
            province: state,
            zip,
            country,
        }
    };
    console.log('Address Data:', addressData);

    let response;
    try {
        response = await axios.post(
            `https://${shop}/admin/api/2024-07/customers/${customer_id}/addresses.json`,
            addressData,
            { headers: { 'X-Shopify-Access-Token': accessToken } }
        );
    } catch (error) {
        console.error('Error creating address in Shopify:', error.response?.data || error.message);
        return res.status(500).json({
            message: 'Failed to create address in Shopify',
            error: error.response?.data || error.message
        });
    }
    try {
        console.log('Shopify Response:', response.data);
        if (response.data && response.data.customer_address) {
            const shopifyAddress = response.data.customer_address; 
            console.log('Shopify Address:', shopifyAddress);

            const address = {
                line1: shopifyAddress.address1, 
                line2: shopifyAddress.address2,
                city: shopifyAddress.city,
                state: shopifyAddress.province,
                zip: shopifyAddress.zip,
                country: shopifyAddress.country,
                customer_id: shopifyAddress.customer_id || customer_id,
            };
            console.log('Address:', address);

            let connection;
            try {
                connection = await createConnection();  
                const query = `INSERT INTO addresses (line1, line2, city, state, zip, country, customer_id, address_id)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
                const values = [
                    address.line1,
                    address.line2,
                    address.city,
                    address.state,
                    address.zip,
                    address.country,
                    customer_id,
                    shopifyAddress.id 
                ];
                await connection.query(query, values);
                console.log('Address saved to database successfully.');
            } catch (dbError) {
                console.error('Error saving address to the database:', dbError);
                return res.status(500).json({ message: 'Failed to save address to database', error: dbError.message });
            } finally {
                if (connection) {
                    await connection.end(); 
                }
            }

            return res.status(200).json({ message: 'Address created and saved successfully', address });
        } else {
            console.error('No address returned in Shopify response');
            return res.status(400).json({
                message: 'Failed to create address in Shopify: No address returned',
                response: response.data 
            });
        }
    } catch (error) {
        console.error('Error processing Shopify response:', error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});

router.put('/address/:id', verifyJwt, async (req, res) => {
    const { id: address_id } = req.params;
    const { accessToken, shop } = req.shop;
    console.log(accessToken);
    // const result=req.result;
    const { line1, line2, city, state, zip, country, customer_id } = req.body.address;

    const addressData = {
        address: {
            address1: line1,
            address2: line2,
            city,
            province: state,
            zip,
            country,
        }
    };

    let response;
    try {
        response = await axios.put(
            `https://${shop}/admin/api/2024-07/customers/${customer_id}/addresses/${address_id}.json`,
            addressData,
            { headers: { 'X-Shopify-Access-Token': accessToken } }
        );
    } catch (error) {
        console.error('Error updating address in Shopify:', error.response?.data || error.message);
        return res.status(500).json({
            message: 'Failed to update address in Shopify',
            error: error.response?.data || error.message
        });
    }

    try {
        console.log('Shopify Response:', response.data);
        if (response.data && response.data.customer_address) {
            const shopifyAddress = response.data.customer_address;

            const address = {
                line1: shopifyAddress.address1,
                line2: shopifyAddress.address2,
                city: shopifyAddress.city,
                state: shopifyAddress.province,
                zip: shopifyAddress.zip,
                country: shopifyAddress.country,
                customer_id: shopifyAddress.customer_id || customer_id,
            };

            console.log('Address:', address);

            let connection;
            try {
                connection = await createConnection();

                const query = `
                    UPDATE addresses
                    SET line1 = ?, line2 = ?, city = ?, state = ?, zip = ?, country = ?
                    WHERE address_id = ?`;

                const values = [
                    address.line1,
                    address.line2,
                    address.city,
                    address.state,
                    address.zip,
                    address.country,
                    address_id
                ];

                await connection.query(query, values);
                console.log('Address updated in database successfully.');
                return res.status(200).json({
                    message: 'Address updated successfully',
                    address: address
                });

            } catch (dbError) {
                console.error('Error updating address in database:', dbError.message);
                return res.status(500).json({ message: 'Database update failed', error: dbError.message });
            } 
        } else {
            return res.status(500).json({ message: 'Invalid response from Shopify' });
        }

    } catch (error) {
        console.error('Error processing Shopify response:', error.message);
        return res.status(500).json({ message: 'Internal Server Error', error: error.message });
    }
});



module.exports = router;