const { shopifyRestClient } = require('../shopify');

async function deleteAddress(req, res) {
  const store_domain = req.shop.shop;
  const shopifyAccessToken = req.shop.accessToken;
  const { customer_id, address_id } = req.params; 
  console.log(store_domain,shopifyAccessToken);

  try {
    const checkAddressQuery = `SELECT * FROM addresses WHERE address_id = ? AND customer_id = ?`;
    const [address] = await global.connection.query(checkAddressQuery, [address_id, customer_id]);

    if (address.length === 0) {
      return res.status(404).json({
        message: 'Address not found in the database',
      });
    }

    const client = shopifyRestClient(store_domain, shopifyAccessToken);

    await client.delete({
      path: `customers/${customer_id}/addresses/${address_id}`,
    });

    const deleteAddressQuery = `DELETE FROM addresses WHERE address_id = ?`;
    await global.connection.query(deleteAddressQuery, [address_id]);

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

module.exports.deleteAddress = deleteAddress;
