const { shopifyRestClient } = require("../shopify")
const { Sequelize } = require('sequelize');
  const { shopifyGraphQLClient } = require("../shopify");
const db = require("../database/db");
const { generateVariants } = require("../helper/generateVariantsHelper");
const { initializeShopifyClient } = require ('../helper/clientHelper');

const createProduct = async (req, res) => {
  try {
    const client = initializeShopifyClient(req.shop, res);
    const {id}= req.shop;
    const storeId = id;
  if (!client) return;

    const {
      title,
      body_html,
      vendor,
      product_type,
      tags = " ",
      images = [],
      options = [],
      variantsInput = []
    } = req.body;

    const uniqueTags = [...new Set(tags.split(","))].join(" ");

    const productVariables = {
      input: {
        title,
        descriptionHtml: body_html || "",
        vendor,
        productType: product_type || "",
        tags: uniqueTags,
        productOptions: options.map((option) => ({
          name: option.name,
          values: option.values.map((value) => ({ name: value })),
        })),
      },
      media: images.length > 0 ? images.map(image => ({
        originalSource: image.originalSource,
        alt: image.alt || "",
        mediaContentType: "IMAGE",
      })) : []
    };

    const productMutationQuery =
      `mutation createProduct($input: ProductInput!, $media: [CreateMediaInput!]) {
        productCreate(input: $input, media: $media) {
          product {
            id
            title
            descriptionHtml
            vendor
            productType
            tags
            options {
              id
              name
              position
              optionValues {
                id
                name
                hasVariants
              }
            }
            variants(first: 5) {
              nodes {
                id
                title
                selectedOptions {
                  name
                  value
                }
              }
            }
            media(first: 10) {
              nodes {
                id
                alt
                mediaContentType
                preview {
                  status
                }
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`;

      // const shopifyProductResponse = await callShopifyClient(client, productMutationQuery, productVariables);
      const shopifyProductResponse = await client.query({
      data: {
        query: productMutationQuery,
        variables: productVariables,
      },
    });

    const { product: shopifyProduct, userErrors } = shopifyProductResponse.body.data.productCreate;
    console.log(shopifyProduct);

    if (userErrors.length > 0) {
      console.error("User Errors:", userErrors);
      return res.status(400).json({
        message: "Shopify product creation failed.",
        errors: userErrors,
      });
    }

    const productId = shopifyProduct.id;
    const pid = shopifyProduct.id.split('/').pop();

    const createDynamicVariants = (options) => {
      const variantCombinations = generateVariants(options);

      return variantCombinations.map((combination, index) => ({
        optionValues: combination,
        price: "10.00",
      }));
    };

    const dynamicVariants = createDynamicVariants(options);

    const variantMutationQuery =
      `mutation productVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
        productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: REMOVE_STANDALONE_VARIANT) {
          productVariants {
            id
            title
            price
            sku
            selectedOptions {
              name
              value
              optionValue {
                id
                name
                hasVariants
              }
            }
          }
          userErrors {
            field
            message
          }
        }
      }`;
      const variantVariables = {
        productId,
        variants: dynamicVariants,
      };
  
    // const shopifyVariantResponse = await callShopifyClient(client, variantMutationQuery, variantVariables);
    const shopifyVariantResponse = await client.query({
      data: {
        query: variantMutationQuery,
        variables: {
          productId,
          variants: dynamicVariants,
        },
      },
    });

    const { productVariants, userErrors: variantUserErrors } = shopifyVariantResponse.body.data.productVariantsBulkCreate;

    if (variantUserErrors.length > 0) {
      return res.status(400).json({
        message: "Shopify variant creation failed.",
        errors: variantUserErrors,
      });
    }
    const combinedQuery = `
      query getProductMediaAndOptions($productId: ID!) {
        product(id: $productId) {
          title
          id
          media(first: 10) {
            edges {
              node {
                ...on MediaImage {
                  id
                  alt
                }
              }
            }
          }
          options {
            id
            name
            optionValues {
              id
              name
            }
          }
        }
      }`;

    const variables = { productId };
    const combinedResponse = await client.query({
      data: {
        query: combinedQuery,
        variables: variables,
      },
    });

    try {
      const { product: shopifyProduct } = shopifyProductResponse.body.data.productCreate;
      console.log("Shopify Product:", shopifyProduct);

      const dbProduct = await db.products.create({
        product_id: pid,
        store_id: storeId,
        title: shopifyProduct.title,
        vendor: shopifyProduct.vendor,
        body_html: shopifyProduct.descriptionHtml,
        tags: uniqueTags,
      });
      console.log("Product created");


      console.log(shopifyProduct.options);

      for (const option of shopifyProduct.options) {
        console.log('Option:', option);

        if (option.optionValues && Array.isArray(option.optionValues)) {
          for (const optionValue of option.optionValues) {
            await db.product_options.create({
              product_id: pid,
              option_id: option.id,
              value_id: optionValue.id,
              name: option.name,
              position: option.position,
              values: optionValue.name,
            });
          }
        } else {
          console.log(`Option values for ${option.name} are not iterable or missing.`, option);
        }
      }
      console.log("Options created");

      for (const variant of productVariants) {
        await db.product_variants.create({
          product_id: pid,
          variant_id: variant.id.split('/').pop(),
          title: variant.title,
          price: variant.price,
          sku: variant.sku,
          inventory_quantity: variant.inventory_quantity,
          option1: variant.selectedOptions[0] ? variant.selectedOptions[0].name : "",
          option2: variant.selectedOptions[1] ? variant.selectedOptions[1].name : "",
          option3: variant.selectedOptions[2] ? variant.selectedOptions[2].name : "",
        });
      }

      console.log(shopifyProduct.media.nodes);

      for (let i = 0; i < shopifyProduct.media.nodes.length; i++) {
        const media = shopifyProduct.media.nodes[i];
        const imageUrl = req.body.images[i]?.originalSource; 
      
        await db.product_images.create({
          product_id: pid,
          image_id: media.id,
          url: imageUrl,
          alt: media.alt,
        });
      }
    
      return res.status(201).json({
        message: "Product and variants created successfully!",
        product: {
          id: dbProduct.product_id,
          title: shopifyProduct.title,
          vendor: shopifyProduct.vendor,
          tags: uniqueTags,
        },
        variants: productVariants,
        media: shopifyProduct.media.nodes,
      });
    } catch (error) {
      console.error("Error creating product:", error);
      return res.status(500).json({
        message: "Error creating product.",
        error: error.message,
      });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({
      message: "Internal Server Error.",
      error: error.message,
    });
  }
};


const updateProduct = async (req, res) => {
  try {
  const { id, accessToken, name } = req.shop || {};

    if (!name || !accessToken) {
      return res.status(400).json({
        message: 'Store name or accessToken is missing in the request',
      });
    }
    const client = shopifyGraphQLClient(name, accessToken);
  const { productId } = req.params;
  const {
    title,
    vendor,
    product_type,
    body_html,
    tags,
    media,
    option,
    optionValuesToAdd,
    optionValuesToUpdate,
    optionValuesToDelete,
    mediaToDelete,
  } = req.body;

  if (!productId) {
    return res.status(400).json({ message: "'Product ID' is required." });
  }


    const dbProduct = await db.products.findOne({
      where: { product_id: productId },
    });
    console.log("productid", dbProduct.product_id)
    if (!dbProduct) {
      return res.status(404).json({ message: "Product not found in database." });
    }

    const productInput = { id: `gid://shopify/Product/${productId}` };
    const mutationFields = [];

    if (body_html) {
      productInput.descriptionHtml = body_html;
      mutationFields.push("descriptionHtml");
    }
    if (title) {
      productInput.title = title;
      mutationFields.push("title");
    }
    if (vendor) {
      productInput.vendor = vendor;
      mutationFields.push("vendor");
    }
    if (product_type) {
      productInput.productType = product_type;
      mutationFields.push("productType");
    }
    if (tags) {
      productInput.tags = tags;
      mutationFields.push("tags");
    }

    const mediaInput = media && media.length > 0 ? media : null;

    const updateMutation = `
      mutation UpdateProductWithNewMedia($input: ProductInput!${mediaInput ? ", $media: [CreateMediaInput!]!" : ""
      }) {
        productUpdate(input: $input${mediaInput ? ", media: $media" : ""}) {
          product {
            id
            ${mutationFields.join("\n")}
            ${mediaInput
        ? "media(first: 10) { nodes { alt mediaContentType preview { status } } }"
        : ""
      }
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: productInput,
      media: mediaInput || undefined,
    };

    const shopifyProductResponse = await client.query({
      data: { query: updateMutation, variables },
    });

    const { product, userErrors } =
      shopifyProductResponse.body.data.productUpdate;
    if (userErrors.length > 0) {
      return res.status(400).json({
        message: "Shopify product update failed.",
        errors: userErrors,
      });
    }

    if (mediaToDelete && mediaToDelete.length > 0) {
      const deleteMediaMutation = `
        mutation productDeleteMedia($mediaIds: [ID!]!, $productId: ID!) {
          productDeleteMedia(mediaIds: $mediaIds, productId: $productId) {
            deletedMediaIds
            userErrors {
              field
              message
            }
          }
        }
      `;

      const deleteVariables = {
        mediaIds: mediaToDelete,
        productId: `gid://shopify/Product/${productId}`,
      };

      const deleteMediaResponse = await client.query({
        data: { query: deleteMediaMutation, variables: deleteVariables },
      });

      const deleteMediaErrors =
        deleteMediaResponse.body.data.productDeleteMedia.userErrors;
      if (deleteMediaErrors.length > 0) {
        return res.status(400).json({
          message: "Shopify media deletion failed.",
          errors: deleteMediaErrors,
        });
      }
    }

    if (
      option ||
      optionValuesToAdd ||
      optionValuesToUpdate ||
      optionValuesToDelete
    ) {
      const optionInput = {
        productId: `gid://shopify/Product/${productId}`,
        option: {
          id: option?.id
            ? option.id
            : undefined,
        },
        variantStrategy: "MANAGE",
      };

      const optionValuesToAddInput = optionValuesToAdd?.length
        ? optionValuesToAdd
        : null;
      const optionValuesToUpdateInput = optionValuesToUpdate?.length
        ? optionValuesToUpdate
        : null;
      const optionValuesToDeleteInput = optionValuesToDelete?.length
        ? optionValuesToDelete
        : null;

      const optionUpdateMutation = `
        mutation updateOption(
          $productId: ID!,
          $option: OptionUpdateInput!,
          ${optionValuesToAddInput
          ? "$optionValuesToAdd: [OptionValueCreateInput!],"
          : ""
        }
          ${optionValuesToUpdateInput
          ? "$optionValuesToUpdate: [OptionValueUpdateInput!],"
          : ""
        }
          ${optionValuesToDeleteInput ? "$optionValuesToDelete: [ID!]," : ""}
          $variantStrategy: ProductOptionUpdateVariantStrategy
        ) {
          productOptionUpdate(
            productId: $productId,
            option: $option,
            ${optionValuesToAddInput
          ? "optionValuesToAdd: $optionValuesToAdd,"
          : ""
        }
            ${optionValuesToUpdateInput
          ? "optionValuesToUpdate: $optionValuesToUpdate,"
          : ""
        }
            ${optionValuesToDeleteInput
          ? "optionValuesToDelete: $optionValuesToDelete,"
          : ""
        }
            variantStrategy: $variantStrategy
          ) {
            product {
              id
              options {
                id
                name
                values
                optionValues {
                  id
                  name
                  hasVariants
                }
              }
              variants(first: 5) {
                nodes {
                  id
                  title
                  price
                  sku
                  selectedOptions {
                    name
                    value
                  }
                }
              }
            }
            userErrors {
              field
              message
              code
            }
          }
        }
      `;

      const optionVariables = {
        productId: optionInput.productId,
        option: optionInput.option,
        optionValuesToAdd: optionValuesToAddInput || undefined,
        optionValuesToUpdate: optionValuesToUpdateInput || undefined,
        optionValuesToDelete: optionValuesToDeleteInput || undefined,
        variantStrategy: optionInput.variantStrategy,
      };

      const optionUpdateResponse = await client.query({
        data: { query: optionUpdateMutation, variables: optionVariables },
      });

      const optionUpdateErrors =
        optionUpdateResponse.body.data.productOptionUpdate.userErrors;

      const optionUpdateData =
        optionUpdateResponse.body.data.productOptionUpdate;

      if (optionUpdateErrors.length > 0) {
        return res.status(400).json({
          message: "Shopify option update failed.",
          errors: optionUpdateErrors,
        });
      }


      if (optionValuesToAdd) {
        for (const value of optionValuesToAdd) {
          const optionId = optionInput?.option?.id?.match(/(\d+)/)?.[0];
          console.log("option", optionUpdateResponse.body.data.productOptionUpdate);
          const option = optionUpdateData.product.options.find(
            (opt) => opt.id === `gid://shopify/ProductOption/${optionId}`
          );

          // Declare valueId in a way that allows it to be accessible throughout
          let valueId;

          if (option && option.optionValues.length > 0) {
            // Assign the last option value's id to valueId without redeclaring it
            valueId = option.optionValues[option.optionValues.length - 1].id;
            console.log(valueId);
          } else {
            console.log("No matching option or optionValues found.");
          }

          // Fetch the unique option name from the database
          const nameId = await db.product_options.findAll({
            where: {
              option_id: `gid://shopify/ProductOption/${optionId}`,
            },
          });

          const optionName = [...new Set(nameId.map(option => option.name))][0];
          console.log(optionName);

          // Insert or update product option data in the database
          await db.product_options.create({
            product_id: dbProduct.product_id,
            option_id: `gid://shopify/ProductOption/${optionId}`,
            value_id: valueId || null, // valueId is now accessible here
            name: optionName,
            position: optionInput.option.position,
            values: value.name,
          });

        }
      }

      if (optionValuesToDelete) {
        await db.product_options.destroy({
          where: {
            value_id: optionValuesToDelete[0]
          },
        });
      }
      if (optionValuesToUpdate) {
        for (const value of optionValuesToUpdate) {
          await db.product_options.update(
            { values: value.name },
            { where: { value_id: value.id } }
          );
        }
      }

      const updatedVariants = optionUpdateResponse.body.data.productOptionUpdate.product.variants.nodes;
      const done = await db.product_variants.destroy({
        where: { product_id: dbProduct.product_id },
      });
      console.log(done);
      const newVariants = updatedVariants.map(variant => ({
        shopify_variant_id: variant.id.match(/(\d+)/)[0],
        product_id: dbProduct.product_id,
        variant_id: variant.id,
        title: variant.title,
        price: variant.price,
        sku: variant.sku,
        option1: variant.selectedOptions[0]?.value || null,
        option2: variant.selectedOptions[1]?.value || null,
        option3: variant.selectedOptions[2]?.value || null,
      }));

      await db.product_variants.bulkCreate(newVariants);
    }


    res.status(200).json({
      message: "Product updated successfully!",
      product: {
        id: product.id,
        title: product.title,
        vendor: product.vendor,
        productType: product.productType,
        tags: product.tags,
        media: mediaInput ? product.media.nodes : undefined,
      },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    res.status(500).json({
      message: "Error updating product.",
      error: error.message,
    });
  }
}


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
          attributes: ['id', 'option_id', 'name', 'position', 'values', 'createdAt', 'updatedAt'],
        },
        {
          model: product_variants,
          attributes: ['id', 'variant_id', 'title', 'price', 'sku', 'inventory_quantity', 'option1', 'option2', 'option3', 'createdAt', 'updatedAt'],
        },
        {
          model: product_images,
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




// async function deleteProduct(req, res) {
//   try{
//   const { id, accessToken, name } = req.shop || {};

//     if (!name || !accessToken) {
//       return res.status(400).json({
//         message: 'Store name or accessToken is missing in the request',
//       });
//     }
//     const client = shopifyGraphQLClient(name, accessToken);
//   const { product_id } = req.params;
//   console.log('Product ID from request:', product_id);

//   try {
//     const product = await products.findOne({
//       where: { product_id: product_id },
//     });

//     if (!product) {
//       return res.status(404).json({
//         message: 'Product not found',
//       });
//     }
//     const transaction = await sequelize.transaction();

//     try {
//       await product_options.destroy({
//         where: { product_id: product.id },
//         transaction,
//       });
//       await product_variants.destroy({
//         where: { product_id: product.id },
//         transaction,
//       });
//       await product_images.destroy({
//         where: { product_id: product.id },
//         transaction,
//       });

//       await products.destroy({
//         where: { product_id: product_id },
//         transaction,
//       });

//       await client.delete({
//         path: `products/${product_id}`,
//       });

//       await transaction.commit();

//       return res.status(200).json({
//         message: 'Product deleted successfully',
//       });
//     } catch (error) {
//       await transaction.rollback();
//       console.error('Error deleting associated data or product:', error);
//       return res.status(500).json({
//         message: 'Error deleting product',
//         error: error.message || error,
//       });
//     }
//   }
//  } catch (error) {
//     console.error('Error finding product:', error);
//     return res.status(500).json({
//       message: 'Error deleting product',
//       error: error.message || error,
//     });
//   }
// }

// module.exports.deleteProduct = deleteProduct;
module.exports.getAllProducts = getAllProducts;
module.exports.updateProduct = updateProduct;
module.exports.createProduct = createProduct;
