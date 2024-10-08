const { shopifyRestClient } = require('../shopify');

async function deleteProduct(req, res) {
    const store_domain = req.shop.shop;
  const shopifyAccessToken = req.shop.accessToken;
    const { product_id } = req.params; 
    console.log('Product ID from request:', product_id);

    try {
        const checkProductQuery = `SELECT * FROM products WHERE shopify_product_id = ?`;
        const [product] = await global.connection.query(checkProductQuery, [product_id]);

        if (product.length === 0) {
            return res.status(404).json({
                message: 'Product not found',
            });
        }

        await global.connection.query('START TRANSACTION');

        await global.connection.query(`DELETE FROM product_options WHERE product_id = ?`, [product[0].id]);
        await global.connection.query(`DELETE FROM product_variants WHERE product_id = ?`, [product[0].id]);
        await global.connection.query(`DELETE FROM product_images WHERE product_id = ?`, [product[0].id]);
        await global.connection.query(`DELETE FROM products WHERE shopify_product_id = ?`, [product_id]);

        const client = shopifyRestClient(store_domain, shopifyAccessToken);

        await client.delete({
            path: `products/${product_id}`,
        });

        await global.connection.query('COMMIT');

        return res.status(200).json({
            message: 'Product deleted successfully',
        });
    } catch (error) {
        await global.connection.query('ROLLBACK');
        console.error('Error deleting product:', error);

        return res.status(500).json({
            message: 'Error deleting product',
            error: error.message || error,
        });
    }
}

module.exports.deleteProduct = deleteProduct;
