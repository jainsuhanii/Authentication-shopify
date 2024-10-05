const express = require('express');
const router = express.Router();
const axios = require('axios');
const customerRouter=require("./customer");
router.use('/customers',customerRouter);

const createAddress= async (req, res) => {
    const {accessToken, shop } = req.shop;
    console.log(accessToken);
    const { line1, line2, city, state, zip, customer_id, country } = req.body.address;
    if (!customer_id) {
        return res.status(400).json({ message: 'Customer ID is required' });
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

            try {
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
                await global.connection.query(query, values);
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
};

const updateAddress = async (req, res) => {
    const { id: address_id } = req.params;
    const { accessToken, shop } = req.shop;
    const { line1, line2, city, state, zip, country, customer_id } = req.body.address;

    // Get the existing address
    let existingAddress;
try {
    const response = await axios.get(
        `https://${shop}/admin/api/2024-07/customers/${customer_id}/addresses/${address_id}.json`,
        { headers: { 'X-Shopify-Access-Token': accessToken } }
    );
    if (!response.data || !response.data.customer_address) {
        console.log('No address data in response:', response.data);
        return res.status(500).json({ message: 'No address data in Shopify response' });
    }
    existingAddress = response.data.customer_address;
} catch (error) {
    console.error('Error getting existing address from Shopify:', error.response?.data || error.message);
    return res.status(500).json({
        message: 'Failed to get existing address from Shopify',
        error: error.response?.data || error.message
    });
}

    // Update the specific parameter of the address
    existingAddress.city = city;
    existingAddress.province = state;
    existingAddress.address1 = line1;
    existingAddress.address2 = line2;
    existingAddress.zip = zip;
    existingAddress.country = country;

    // Send the entire updated address in the request body
    const addressData = {
        address: existingAddress
    };
    console.log('Address Data:', addressData);

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
            try {
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

                await global.connection.query(query, values);
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
};
module.exports = router;
module.exports.createAddress = createAddress;
module.exports.updateAddress = updateAddress;

