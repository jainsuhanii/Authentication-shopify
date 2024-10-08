const { shopifyRestClient } = require('../shopify');

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
    const shopifyResponse = await client.get({
      path: 'customers',
      query: requestParams,
    });

    const shopifyCustomers = shopifyResponse.body.customers || [];
    const nextPageInfo = shopifyResponse.body.page_info?.next || null;

    const shopifyAddresses = shopifyCustomers.flatMap(customer => customer.addresses || []);

    const sqlQuery = `SELECT * FROM addresses LIMIT ? OFFSET ?`;
    const [dbCustomers] = await global.connection.query(sqlQuery, [limit, offset]);

    const countQuery = `SELECT COUNT(*) as total FROM addresses`;
    const [countResult] = await global.connection.query(countQuery);
    const totalCustomers = countResult[0].total;

    return res.status(200).json({
      message: 'Customers and their addresses fetched successfully',
     shopifyAddresses, 
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

module.exports.getAllAddresses = getAllAddresses;
