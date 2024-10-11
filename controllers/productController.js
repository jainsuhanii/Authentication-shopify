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
    const {id}=req.shop;
    const storeId = id;
    console.log("Store ID:", storeId);

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
      INSERT INTO products (shopify_product_id,store_id, title, vendor, product_type, tags, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const [insertProductResult] = await global.connection.query(insertProductQuery, [
      shopifyProduct.id,
      storeId,
      shopifyProduct.title,
      shopifyProduct.vendor,
      shopifyProduct.product_type,
      shopifyProduct.tags, 
      shopifyProduct.status,
    ]);

    // const productId = insertProductResult.insertId; 
    // console.log("Inserted Product ID:", productId); 
    // console.log("Inserting product with ID:", shopifyProduct.id);
    // console.log("Inserting store ID:", storeId);


    const insertVariantQuery = `
      INSERT INTO product_variants (product_id, shopify_variant_id, title, price, sku, inventory_quantity, option1, option2, option3)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    for (const variant of shopifyProduct.variants) {
      await global.connection.query(insertVariantQuery, [
        shopifyProduct.id,
        variant.id,
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
      INSERT INTO product_options (product_id, shopify_option_id,name, position, \`values\`)
      VALUES (?, ?, ?, ?, ?)
    `;

    for (const option of shopifyProduct.options) {
      const valuesJson = JSON.stringify(option.values);
      console.log("Values JSON:", valuesJson); 
      await global.connection.query(insertOptionQuery, [
        shopifyProduct.id, 
        option.id,
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
        shopifyProduct.id,
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
    try {
      // Pagination parameters
      const limit = parseInt(req.query.limit) || 5;  // Default limit
      const offset = parseInt(req.query.offset) || 0; // Default offset
  
      const sqlQuery = `
        SELECT 
          p.id AS product_id, p.shopify_product_id, p.store_id, p.title, p.body_html, p.vendor, p.product_type, p.tags, 
          p.status, p.created_at AS product_created_at, p.updated_at AS product_updated_at,
          
          po.id AS option_id, po.shopify_option_id, po.name AS option_name, po.position AS option_position, 
          po.values AS option_values, po.created_at AS option_created_at, po.updated_at AS option_updated_at,
          
          pv.id AS variant_id, pv.shopify_variant_id, pv.title AS variant_title, pv.price AS variant_price, 
          pv.sku AS variant_sku, pv.inventory_quantity, pv.option1, pv.option2, pv.option3, 
          pv.created_at AS variant_created_at, pv.updated_at AS variant_updated_at,
          
          pi.id AS image_id, pi.shopify_image_id, pi.src AS image_src, pi.alt AS image_alt, 
          pi.position AS image_position, pi.created_at AS image_created_at, pi.updated_at AS image_updated_at
          
        FROM products p
        LEFT JOIN product_options po ON p.shopify_product_id = po.product_id
        LEFT JOIN product_variants pv ON p.shopify_product_id = pv.product_id
        LEFT JOIN product_images pi ON p.shopify_product_id = pi.product_id
        ORDER BY p.id
        LIMIT ? OFFSET ?;
      `;
  
      // Fetch product data
      const [rows] = await global.connection.query(sqlQuery, [limit, offset]);
  
      // Fetch total product count for pagination
      const countQuery = `SELECT COUNT(*) as total FROM products;`;
      const [countResult] = await global.connection.query(countQuery);
      const totalProducts = countResult[0].total;
  
      // Format and reduce rows to a single array with grouped options, variants, and images
      const products = rows.reduce((acc, row) => {
        const { product_id, ...productData } = row;
  
        // Find or create a product in the accumulator
        let product = acc.find(p => p.product_id === product_id);
        if (!product) {
          product = {
            product_id,
            shopify_product_id: productData.shopify_product_id,
            store_id: productData.store_id,
            title: productData.title,
            body_html: productData.body_html,
            vendor: productData.vendor,
            product_type: productData.product_type,
            tags: productData.tags,
            status: productData.status,
            created_at: productData.product_created_at,
            updated_at: productData.product_updated_at,
            options: [],
            variants: [],
            images: [],
          };
          acc.push(product);
        }
  
        // Add options, variants, and images if they exist
        if (row.option_id != null) {
          product.options.push({
            option_id: row.option_id,
            shopify_option_id: row.shopify_option_id,
            name: row.option_name,
            position: row.option_position,
            values: row.option_values,
            created_at: row.option_created_at,
            updated_at: row.option_updated_at,
          });
        }
  
        if (row.variant_id != null) {
          product.variants.push({
            variant_id: row.variant_id,
            shopify_variant_id: row.shopify_variant_id,
            title: row.variant_title,
            price: row.variant_price,
            sku: row.variant_sku,
            inventory_quantity: row.inventory_quantity,
            option1: row.option1,
            option2: row.option2,
            option3: row.option3,
            created_at: row.variant_created_at,
            updated_at: row.variant_updated_at,
          });
        }
  
        if (row.image_id != null) {
          product.images.push({
            image_id: row.image_id,
            shopify_image_id: row.shopify_image_id,
            src: row.image_src,
            alt: row.image_alt,
            position: row.image_position,
            created_at: row.image_created_at,
            updated_at: row.image_updated_at,
          });
        }
  
        return acc;
      }, []);
  
      return res.status(200).json({
        message: 'Products fetched successfully',
        products,
        pagination: {
          currentPage: Math.floor(offset / limit) + 1,
          limit,
          totalProducts,
          totalPages: Math.ceil(totalProducts / limit),
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
