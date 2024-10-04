const customerRouter=require("./customer");
const express = require('express');
const router = express.Router();
const axios = require('axios');

const createProduct = async (req, res) => {
  const { title, body_html, vendor, product_type, tags, variants, images, status } = req.body;
  
  console.log("Request body:", req.body);

  const store_domain = req.shop.shop;

  if (!title || !variants || variants.length === 0) {
    return res.status(400).json({
      message: "Product title and at least one variant are required.",
    });
  }

  try {
    const storeQuery = `SELECT * FROM store WHERE name = ?`;
    const [storeResult] = await global.connection.query(storeQuery, [store_domain]);

    if (storeResult.length === 0) {
      return res.status(404).json({ message: "Store not found." });
    }

    const store = storeResult[0];
    const shopifyAccessToken = store.accessToken;
    console.log("Shopify Access Token:", shopifyAccessToken);

    const productPayload = {
      product: {
        title,
        body_html,
        vendor,
        product_type,
        tags,
        variants: variants.map((variant) => ({
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          inventory_quantity: variant.inventory_quantity,
          option1: variant.option1,
          option2: variant.option2,
          option3: variant.option3,
        })),
        images: images.map((image) => ({
          src: image.src,
          alt: image.alt,
          position: image.position,
        })),
        status 
      }
    };

    console.log("Product Payload:", JSON.stringify(productPayload, null, 2));

    const shopifyResponse = await axios.post(
      `https://${store_domain}/admin/api/2024-01/products.json`,
      productPayload,
      {
        headers: {
          "X-Shopify-Access-Token": shopifyAccessToken,
        },
      }
    );

    const shopifyProduct = shopifyResponse.data.product;
    const shopifyProductId = shopifyProduct.id;

    const productInsertQuery = `
      INSERT INTO products
      (shopify_product_id, store_id, title, body_html, vendor, product_type, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [productResult] = await global.connection.query(productInsertQuery, [
      shopifyProductId,
      store.id,
      title,
      body_html || null,
      vendor || null,
      product_type || null,
      tags || null,
      status
    ]);
    
    const product_id = productResult.insertId;

    for (const variant of shopifyProduct.variants) {
      const variantInsertQuery = `
        INSERT INTO product_variants
        (shopify_variant_id, product_id, title, price, sku, inventory_quantity, option1, option2, option3)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      await global.connection.query(variantInsertQuery, [
        variant.id,
        product_id,
        variant.title || null,
        variant.price,
        variant.sku || null,
        variant.inventory_quantity,
        variant.option1 || null,
        variant.option2 || null,
        variant.option3 || null
      ]);
    }
  
    
    if (shopifyProduct.images && shopifyProduct.images.length > 0) {
      for (const image of shopifyProduct.images) {
        const imageInsertQuery = `
          INSERT INTO product_images (shopify_image_id, product_id, src, alt, position)
          VALUES (?, ?, ?, ?, ?)
        `;
        await global.connection.query(imageInsertQuery, [
          image.id,
          product_id,
          image.src,
          image.alt || null,
          image.position
        ]);
      }
    } else {
      console.log("No images found in Shopify product response.");
    }

    res.status(200).json({
      message: "Product created successfully!",
      product: {
        id: product_id,
        shopify_product_id: shopifyProductId,
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
        message: "Error creating product in Shopify.",
        error: error.response.data.errors || error.response.data
      });
    } else {
      console.error("Error creating product:", error.message);
      res.status(500).json({ message: "Error creating product.", error: error.message });
    }
  }
};



  module.exports.createProduct=createProduct;