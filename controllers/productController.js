const { shopifyRestClient } = require("../shopify")
const { Sequelize } = require('sequelize');
const { products,product_variants, product_images, product_options, Stores, sequelize} = require('../database/db');
// const Stores=require('../models/storeSchema');

const generateVariantsFromOptions = (options) => {
  const optionValues = options.map(option => option.values);
  const price = options[0]?.price || 0;
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
    variant.price = price;
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

  const store_domain = req.shop.shop;

  const generatedVariants = variants.length ? variants : generateVariantsFromOptions(options);

  try {
    const foundStore = await Stores.findOne({ where: { name: store_domain } });

    if (!foundStore) {
      return res.status(404).json({ message: "Store not found." });
    }

    const shopifyAccessToken = foundStore.accessToken;
    const { id } = req.shop;
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
            ...variant,
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
    console.log("Product Payload:", productPayload.product.variants);

    const client = shopifyRestClient(store_domain, shopifyAccessToken);
    const response = await client.post({
      path: 'products',
      data: productPayload,
    });

    if (!response.body.product) {
      return res.status(500).json({
        message: "Unexpected response structure from Shopify.",
      });
    }

    const shopifyProduct = response.body.product;

    let product = await products.create({
      product_id: shopifyProduct.id,
      store_id: storeId,
      title: shopifyProduct.title,
      vendor: shopifyProduct.vendor,
      product_type: shopifyProduct.product_type,
      tags: shopifyProduct.tags,
      status: shopifyProduct.status,
    });

    
    

    const variantPromises = shopifyProduct.variants.map(variant => {
      console.log(product.id, "variant")
      return product_variants.create({
        product_id: product.product_id,
        variant_id: variant.id,
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
        inventory_quantity: variant.inventory_quantity,
        option1: variant.option1 || null,
        option2: variant.option2 || null,
        option3: variant.option3 || null,
      });
    });

    await Promise.all(variantPromises);

    const optionPromises = shopifyProduct.options.map(option => {
      const valuesJson = JSON.stringify(option.values);
      return product_options.create({
        product_id: product.product_id,
        option_id: option.id,
        name: option.name,
        position: option.position,
        values: valuesJson,
      });
    });

    await Promise.all(optionPromises);

    const imagePromises = shopifyProduct.images.map(image => {
      return product_images.create({
        image_id: image.id,
        product_id: product.product_id,
        src: image.src,
        alt: image.alt,
        position: image.position,
      });
    });

    await Promise.all(imagePromises);

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
  } = req.body;

  const store_domain = req.shop.shop;
  const productId = req.params.productId;

  const generatedVariants = variants.length ? variants : generateVariantsFromOptions(options);

  try {
    const store = await Stores.findOne({ where: { name: store_domain } });

    if (!store) {
      return res.status(404).json({ message: "Store not found." });
    }

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
            ...variant,
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

    const client = shopifyRestClient(store_domain, shopifyAccessToken);
    const productResponse = await client.put({
      path: `products/${productId}`,
      data: productPayload,
    });
    let shopifyProduct = productResponse?.body?.product;

    await products.update(
      {
        title: shopifyProduct.title,
        vendor: shopifyProduct.vendor,
        product_type: shopifyProduct.product_type,
        tags: shopifyProduct.tags,
        status: shopifyProduct.status,
      },
      {
        where: { product_id: shopifyProduct.id },
      }
    );

    const productIdFromDb = shopifyProduct.id;

    await product_variants.destroy({ where: { product_id: productIdFromDb } });

    const variantData = shopifyProduct.variants.map(variant => ({
      variant_id: variant.id,
      product_id: productIdFromDb,
      title: variant.title,
      price: variant.price,
      sku: variant.sku,
      inventory_quantity: variant.inventory_quantity,
      option1: variant.option1 || null,
      option2: variant.option2 || null,
      option3: variant.option3 || null,
    }));

    await product_variants.bulkCreate(variantData);

    await product_options.destroy({ where: { product_id: productIdFromDb } });

    const optionData = shopifyProduct.options.map(option => ({
      option_id: option.id,
      product_id: productIdFromDb,
      name: option.name,
      position: option.position,
      values: JSON.stringify(option.values), 
    }));

    await product_options.bulkCreate(optionData);

    await product_images.destroy({ where: { product_id: productIdFromDb } });

    const imageData = shopifyProduct.images.map(image => ({
      image_id: image.id,
      product_id: productIdFromDb,
      src: image.src,
      alt: image.alt,
      position: image.position,
    }));

    await product_images.bulkCreate(imageData);

    console.log("Product and related data updated successfully in the database.");

    res.status(200).json({
      message: "Product updated successfully!",
      product: shopifyProduct,
    });
  } catch (error) {
    console.log(error);
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
    const limit = parseInt(req.query.limit) || 5; 
    const offset = parseInt(req.query.offset) || 0; 

    const productsData = await products.findAll({
      limit,
      offset,
      include: [
        {
          model: product_options,
          // as: 'options',
          attributes: ['id', 'option_id', 'name', 'position', 'values', 'createdAt', 'updatedAt'],
        },
        {
          model: product_variants,
          // as: 'variants',
          attributes: ['id', 'variant_id', 'title', 'price', 'sku', 'inventory_quantity', 'option1', 'option2', 'option3', 'createdAt', 'updatedAt'],
        },
        {
          model: product_images,
          // as: 'images',
          attributes: ['id', 'image_id', 'src', 'alt', 'position', 'createdAt', 'updatedAt'],
        },
      ],
      order: [['id', 'DESC']],
    });
    console.log(productsData);
    const totalProducts = await products.count();

    return res.status(200).json({
      message: 'Products fetched successfully',
      products: productsData,  
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
      // Find the product using the product_id
      const product = await products.findOne({
          where: { product_id: product_id },
      });

      if (!product) {
          return res.status(404).json({
              message: 'Product not found',
          });
      }
      const transaction = await sequelize.transaction();

      try {
          await product_options.destroy({
              where: { product_id: product.id },
              transaction,
          });
          await product_variants.destroy({
              where: { product_id: product.id },
              transaction,
          });
          await product_images.destroy({
              where: { product_id: product.id },
              transaction,
          });

          await products.destroy({
              where: { product_id: product_id },
              transaction,
          });

          const client = shopifyRestClient(store_domain, shopifyAccessToken);
          await client.delete({
              path: `products/${product_id}`,
          });

          await transaction.commit();

          return res.status(200).json({
              message: 'Product deleted successfully',
          });
      } catch (error) {
          await transaction.rollback();
          console.error('Error deleting associated data or product:', error);
          return res.status(500).json({
              message: 'Error deleting product',
              error: error.message || error,
          });
      }
  } catch (error) {
      console.error('Error finding product:', error);
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
