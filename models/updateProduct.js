const axios = require('axios');

const updateProduct = async (req, res) => {
  const { title, body_html, vendor, product_type, tags, variants, images, status } = req.body;
  const productId = req.params.productId;  // Assuming productId is passed as a URL parameter
  console.log("Request body:", req.body);

  const store_domain = req.shop.shop;

  if (!title || !variants || variants.length === 0) {
    return res.status(400).json({
      message: "Product title and at least one variant are required.",
    });
  }

  try {
    // Fetch the store from your MySQL DB
    const storeQuery = `SELECT * FROM store WHERE name = ?`;
    const [storeResult] = await global.connection.query(storeQuery, [store_domain]);

    if (storeResult.length === 0) {
      return res.status(404).json({ message: "Store not found." });
    }

    const store = storeResult[0];
    const shopifyAccessToken = store.accessToken;
    console.log("Shopify Access Token:", shopifyAccessToken);

    // Shopify product update payload
    const productPayload = {
      product: {
        id: productId,
        title,
        body_html,
        vendor,
        product_type,
        tags,
        variants,
        images
      }
    };

    console.log("Product Payload:", JSON.stringify(productPayload, null, 2));

    // Send request to Shopify API to update the product
    const shopifyResponse = await axios.put(
      `https://${store_domain}/admin/api/2024-01/products/${productId}.json`,
      productPayload,
      {
        headers: {
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );

    const shopifyProduct = shopifyResponse.data.product;
    const shopifyProductId = shopifyProduct.id;

    const productUpdateQuery = `
      UPDATE products
      SET title = ?, body_html = ?, vendor = ?, product_type = ?, tags = ?, status = ?
      WHERE shopify_product_id = ? AND store_id = ?
    `;
    await global.connection.query(productUpdateQuery, [
      title,
      body_html || null,
      vendor || null,
      product_type || null,
      tags || null,
      status,
      shopifyProductId,
      store.id
    ]);

    // Delete existing variants and images in DB
    await global.connection.query(`DELETE FROM product_variants WHERE product_id = ?`, [shopifyProductId]);
    await global.connection.query(`DELETE FROM product_images WHERE product_id = ?`, [shopifyProductId]);

    // Insert updated variants into the database
    for (const variant of shopifyProduct.variants) {
      const variantInsertQuery = `
        INSERT INTO product_variants
        (shopify_variant_id, product_id, title, price, sku, inventory_quantity, option1, option2, option3)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await global.connection.query(variantInsertQuery, [
        variant.id,
        shopifyProductId,
        variant.title || null,
        variant.price,
        variant.sku || null,
        variant.inventory_quantity,
        variant.option1 || null,
        variant.option2 || null,
        variant.option3 || null
      ]);
    }

    // Insert updated images into the database
    for (const image of shopifyProduct.images) {
      const imageInsertQuery = `
        INSERT INTO product_images (shopify_image_id, product_id, src, alt, position)
        VALUES (?, ?, ?, ?, ?)
      `;
      await global.connection.query(imageInsertQuery, [
        image.id,
        shopifyProductId,
        image.src,
        image.alt || null,
        image.position
      ]);
    }

    res.status(200).json({
      message: "Product updated successfully!",
      product: {
        id: shopifyProductId,
        title,
        body_html,
        vendor,
        product_type,
        tags,
        variants: shopifyProduct.variants,
        images: shopifyProduct.images
      }
    });

  } catch (error) {
    if (error.response) {
      console.error("Shopify API Error:", error.response.data.errors || error.response.data);
      return res.status(500).json({
        message: "Error updating product in Shopify.",
        error: error.response.data.errors || error.response.data
      });
    } else {
      console.error("Error updating product:", error.message);
      res.status(500).json({ message: "Error updating product.", error: error.message });
    }
  }
};

module.exports.updateProduct = updateProduct;
