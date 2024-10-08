
const { shopifyRestClient } = require('../shopify');

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

const updateProduct = async (req, res) => {
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
  } = req.body.product;

  const store_domain = req.shop.shop;
  const productId = req.params.productId; 

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
        id: productId,
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
        images: images.map(image => ({
          src: image.src,
          alt: image.alt,
          position: image.position,
        })),
        status,
      },
    };

    const client = shopifyRestClient(store_domain,shopifyAccessToken);
    const productResponse = await client.put({
      path: `products/${productId}`,
      data: productPayload,
    })
    let shopifyProduct = productResponse?.body?.product;

    const updateProductQuery = `
      UPDATE products 
      SET title = ?, vendor = ?, product_type = ?, tags = ?, status = ?
      WHERE shopify_product_id = ?
    `;

    await global.connection.query(updateProductQuery, [
      shopifyProduct.title,
      shopifyProduct.vendor,
      shopifyProduct.product_type,
      shopifyProduct.tags,
      shopifyProduct.status,
      shopifyProduct.id,
    ]);

    const productIdFromDb = shopifyProduct.id;

    const deleteVariantsQuery = `
      DELETE FROM product_variants 
      WHERE product_id = ?
    `;

    await global.connection.query(deleteVariantsQuery, [productIdFromDb]);

    const insertVariantQuery = `
      INSERT INTO product_variants (product_id, title, price, sku, inventory_quantity, option1, option2, option3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const variant of shopifyProduct.variants) {
      await global.connection.query(insertVariantQuery, [
        productIdFromDb,
        variant.title,
        variant.price,
        variant.sku,
        variant.inventory_quantity,
        variant.option1 || null,
        variant.option2 || null,
        variant.option3 || null,
      ]);
    }

    const deleteOptionsQuery = `
      DELETE FROM product_options 
      WHERE product_id = ?
    `;

    await global.connection.query(deleteOptionsQuery, [productIdFromDb]);

    const insertOptionQuery = `
      INSERT INTO product_options (product_id, name, position, \`values\`)
      VALUES (?, ?, ?, ?)
    `;

    for (const option of shopifyProduct.options) {
      const valuesJson = JSON.stringify(option.values);
      await global.connection.query(insertOptionQuery, [
        productIdFromDb,
        option.name,
        option.position,
        valuesJson,
      ]);
    }

    const deleteImagesQuery = `
      DELETE FROM product_images 
      WHERE product_id = ?
    `;
    await global.connection.query(deleteImagesQuery, [productIdFromDb]);

    const insertImageQuery = `
      INSERT INTO product_images (product_id, src, alt, position)
      VALUES (?, ?, ?, ?)
    `;

    for (const image of shopifyProduct.images) {
      await global.connection.query(insertImageQuery, [
        productIdFromDb,
        image.src,
        image.alt,
        image.position,
      ]);
    }

    console.log("Product and related data updated successfully in the database.");

    res.status(200).json({
      message: "Product updated successfully!",
      product: shopifyProduct,
    });
  } catch (error) {
    console.log(error)
    if (error.response) {
      // console.error("Shopify API Error:", error.response.data.errors || error.response.data);
      // return res.status(500).json({
      //   message: "Error updating product in Shopify.",
      //   error: error.response.data.errors || error.response.data,
      // });
    } else {
      console.error("Error updating product:", error.message);
      res.status(500).json({ message: "Error updating product.", error: error.message || error.response.data });
    }
  }
};

module.exports.updateProduct = updateProduct;