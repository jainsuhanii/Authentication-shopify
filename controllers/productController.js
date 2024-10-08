const { shopifyRestClient } = require("../shopify")

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

    const client = shopifyRestClient(store_domain, shopifyAccessToken);
    const response = await client.post({
      path: 'products',
      data: productPayload,
    });

    if ( !response.body.product) {
      return res.status(500).json({
        message: "Unexpected response structure from Shopify.",
      });
    }

    const shopifyProduct = response.body.product;

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
module.exports.getAllProducts = getAllProducts;
module.exports.updateProduct = updateProduct;
module.exports.createProduct = createProduct;
