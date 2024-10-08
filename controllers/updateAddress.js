const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
const { shopifyRestClient } = require("../shopify")

router.use(bodyParser.json());

const customerRouter=require("./createCustomer");
router.use('/customers',customerRouter);

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
module.exports.updateAddress = updateAddress;