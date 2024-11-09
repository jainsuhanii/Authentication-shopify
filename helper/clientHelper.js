const { shopifyGraphQLClient } = require("../shopify");

exports.initializeShopifyClient = (shop, res) => {
    const { id, accessToken, name } = shop || {};

    if (!name || !accessToken) {
      return res.status(400).json({
        message: 'Store name or accessToken is missing in the request',
      });
    }

    return shopifyGraphQLClient(name, accessToken, id);
};
  
  exports.callShopifyClient = async (client, query, variables) => {
    try {
      const response = await client.query({
        data: {
          query,
          variables,
        },
      });
      return response.body.data;
    } catch (error) {
      console.error('Error calling Shopify client:', error);
      throw new Error('Error executing Shopify query/mutation');
    }
  };

