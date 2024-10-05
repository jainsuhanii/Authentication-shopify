const axios = require('axios');

const generateVariantsFromOptions = (options) => {
  const optionValues = options.map(option => option.values);
  const combinations = optionValues.reduce((acc, curr) => {
    const newCombinations = [];
    acc.forEach(a => {
      curr.forEach(b => {
        newCombinations.push([...a, b]);
      });
    });
    return newCombinations;
  }, [[]]);

  return combinations.map(combination => {
    const variant = {};
    combination.forEach((value, index) => {
      variant[`option${index + 1}`] = value; 
    });
    return variant;
  });
};

const createProduct = async (req, res) => {
  const {
    title,
    body_html,
    vendor,
    product_type,
    tags,
    variants = [], 
    images = [], 
    options = [], 
    status,
  } = req.body;

  console.log("Request body:", req.body); 
  const store_domain = req.shop.shop;

  if (!options.length) {
    return res.status(400).json({
      message: "At least one option is required.",
    });
  }

  const generatedVariants = variants.length ? variants : generateVariantsFromOptions(options);

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
        title,
        body_html,
        vendor,
        product_type,
        tags,
        options: options.map(option => ({
          name: option.name,
          position: option.position,
          values: option.values || [], 
        })),
        variants: generatedVariants.map((variant, index) => {
          const variantTitle = variant.title || `Variant ${index + 1}`;
          return {
            title: variantTitle, 
            price: variant.price,
            sku: variant.sku,
            inventory_quantity: variant.inventory_quantity,
            ...variant 
          };
        }),
        images: images.map((image) => ({
          src: image.src,
          alt: image.alt,
          position: image.position,
        })),
        status,
      },
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

    const insertProductQuery = `
      INSERT INTO products (shopify_product_id, title, vendor, product_type, tags, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    const [insertProductResult] = await global.connection.query(insertProductQuery, [
      shopifyProduct.id,
      shopifyProduct.title,
      shopifyProduct.vendor,
      shopifyProduct.product_type,
      shopifyProduct.tags, 
      shopifyProduct.status,
    ]);

    const productId = insertProductResult.insertId; 
    console.log("Inserted Product ID:", productId); 

    // Insert variants
    const insertVariantQuery = `
      INSERT INTO product_variants (product_id, title, price, sku, inventory_quantity, option1, option2, option3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const variant of shopifyProduct.variants) {
      await global.connection.query(insertVariantQuery, [
        productId,
        variant.title,
        variant.price,
        variant.sku,
        variant.inventory_quantity,
        variant.option1 || null,
        variant.option2 || null,
        variant.option3 || null,
      ]);
    }

    
    const insertOptionQuery = `
      INSERT INTO product_options (product_id, name, position, \`values\`)
      VALUES (?, ?, ?, ?)
    `;

    for (const option of shopifyProduct.options) {
      const valuesJson = JSON.stringify(option.values);
      console.log("Values JSON:", valuesJson); 
      await global.connection.query(insertOptionQuery, [
        productId, 
        option.name,
        option.position,
        valuesJson,
      ]);
    }

    const insertImageQuery = `
      INSERT INTO product_images (product_id, src, alt, position)
      VALUES (?, ?, ?, ?)
    `;

    for (const image of shopifyProduct.images) {
      await global.connection.query(insertImageQuery, [
        productId,
        image.src,
        image.alt,
        image.position,
      ]);
    }

    console.log("Product and related data inserted into the database successfully.");

    res.status(200).json({
      message: "Product created successfully!",
      product: shopifyProduct,
    });
  } catch (error) {
    if (error.response) {
      console.error("Shopify API Error:", error.response.data.errors || error.response.data);
      return res.status(500).json({
        message: "Error creating product in Shopify.",
        error: error.response.data.errors || error.response.data,
      });
    } else {
      console.error("Error creating product:", error.message);
      res.status(500).json({ message: "Error creating product.", error: error.message || error.response.data });
    }
  }
};

module.exports.createProduct = createProduct;
