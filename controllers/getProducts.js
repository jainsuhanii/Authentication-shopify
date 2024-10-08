const { shopifyRestClient } = require('../shopify');

async function getAllProducts(req, res) {
  const store_domain = req.shop.shop;
  const shopifyAccessToken = req.shop.accessToken;

  try {
    const limit = parseInt(req.query.limit) || 5; 
    const pageInfo = req.query.page_info || null; 

    const client = shopifyRestClient(store_domain, shopifyAccessToken);

    const requestParams = {
      limit,
    };

    if (pageInfo) {
      requestParams.page_info = pageInfo;
    }

    const shopifyResponse = await client.get({
      path: 'products',
      query: requestParams,
    });

    const shopifyProducts = shopifyResponse.body.products || [];
    const nextPageInfo = shopifyResponse.body.page_info?.next || null;

    const products = shopifyProducts.map(product => ({
      product_id: product.id,
      shopify_product_id: product.id,
      store_id: store_domain,
      title: product.title,
      body_html: product.body_html,
      vendor: product.vendor,
      product_type: product.product_type,
      tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
      status: product.status,
      created_at: product.created_at,
      updated_at: product.updated_at,
      options: product.options || [],
      variants: product.variants || [],
      images: product.images || [],
    }));

    return res.status(200).json({
      message: 'Products fetched successfully',
      products,
      pagination: {
        currentPage: req.query.page || 1, 
        limit,
        totalProducts: shopifyResponse.body.count || products.length, 
        totalPages: Math.ceil((shopifyResponse.body.count || products.length) / limit), 
        nextPageInfo,
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return res.status(500).json({
      message: 'Error fetching products',
      error: error.message || error,
    });
  }
}

module.exports.getAllProducts = getAllProducts;
