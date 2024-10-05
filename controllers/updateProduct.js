const axios = require("axios");

  const updateProduct = async (req, res) => {
    const { id, title, body_html, vendor, product_type, tags, status,variants=[],options=[],images=[] } = req.body;
    const store_domain = req.shop.shop;
    const productId = req.params.productId;
  
   
  
    try {
      const storeQuery = `SELECT * FROM store WHERE name = ?`;
      const [storeResult] = await global.connection.query(storeQuery, [store_domain]);
  
      if (storeResult.length === 0) {
        return res.status(404).json({ message: "Store not found." });
      }
  
      const store = storeResult[0];
      const shopifyAccessToken = store.accessToken;
  
      const productPayload = {
        product: {
          id: productId, 
          title,
          body_html,
          vendor,
          product_type,
          tags,
          status,
          variants: variants.length > 0 ? variants : undefined, 
        options: options.length > 0 ? options : undefined,
          images: images.length > 0 ? images : undefined,
        },
      };
  
      const shopifyResponse = await axios.put(
        `https://${store_domain}/admin/api/2024-01/products/${productId}.json`,
        productPayload,
        {
          headers: {
            "X-Shopify-Access-Token": shopifyAccessToken,
          },
        }
      );

    const updatedProduct = shopifyResponse.data.product;

    const updateProductQuery = `
      UPDATE products 
      SET title = ?, vendor = ?, product_type = ?, tags = ?, status = ?
      WHERE shopify_product_id = ?
    `;

    await global.connection.query(updateProductQuery, [
      updatedProduct.title,
      updatedProduct.vendor,
      updatedProduct.product_type,
      updatedProduct.tags,
      updatedProduct.status,
      updatedProduct.id,
    ]);

    const deleteVariantsQuery = `
      DELETE FROM product_variants 
      WHERE product_id = ?
    `;

    await global.connection.query(deleteVariantsQuery, [id]);

    const insertVariantQuery = `
      INSERT INTO product_variants (product_id, title, price, sku, inventory_quantity, option1, option2, option3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const variant of updatedProduct.variants) {
      await global.connection.query(insertVariantQuery, [
        id,
        variant.title,
        variant.price,
        variant.sku,
        variant.inventory_quantity,
        variant.option1 || null,
        variant.option2 || null,
        variant.option3 || null,
      ]);
    }

    console.log("Product updated successfully in the database.");
    
    res.status(200).json({
      message: "Product updated successfully!",
      product: updatedProduct,
    });
  } catch (error) {
    if (error.response) {
      console.error("Shopify API Error:", error.response.data.errors || error.response.data);
      return res.status(500).json({
        message: "Error updating product in Shopify.",
        error: error.response.data.errors || error.response.data,
      });
    } else {
      console.error("Error updating product:", error.message);
      res.status(500).json({ message: "Error updating product.", error: error.message || error.response.data });
    }
  }
};


module.exports.updateProduct = updateProduct;
