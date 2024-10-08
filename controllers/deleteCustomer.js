const { shopifyRestClient } = require('../shopify');

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
