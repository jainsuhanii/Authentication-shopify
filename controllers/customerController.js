const express = require('express');
const router = express.Router();
const bodyParser = require('body-parser');
router.use(bodyParser.json());
const db = require('../database/db');
const { Op } = require('sequelize');

const { shopifyGraphQLClient } = require("../shopify");
const { Sequelize } = require('sequelize');

const createCustomer = async (req, res) => {
  try {
    const { id, accessToken, name } = req.shop || {};

    if (!name || !accessToken) {
      return res.status(400).json({
        message: 'Store name or accessToken is missing in the request',
      });
    }

    if (!req.body.customer) {
      return res.status(400).json({
        message: 'Customer data is missing in the request body',
      });
    }

    const { first_name = '', last_name = '', email = '', phone = '', addresses = [] } = req.body.customer;

    const customerCreateMutation = `
      mutation customerCreate($input: CustomerInput!) {
        customerCreate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
            phone
            addresses {
              id
              address1
              address2
              city
              province
              country
              zip
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
      input: {
        firstName: first_name,
        lastName: last_name,
        email: email,
        phone: phone,
        addresses: addresses.map((address) => ({
          address1: address.line1,
          address2: address.line2,
          city: address.city,
          province: address.state,
          country: address.country,
          zip: address.zip,
        })),
      },
    };

    const client = shopifyGraphQLClient(name, accessToken);
    const customerResponse = await client.query({
      data: {
        query: customerCreateMutation,
        variables,
      },
    });

    const data = customerResponse?.body?.data;

    // Check for user errors
    const userErrors = data?.customerCreate?.userErrors;
    if (userErrors && userErrors.length > 0) {
      return res.status(400).json({
        message: 'Shopify returned an error while creating the customer',
        errors: userErrors,
      });
    }

    // Proceed if the customer was created successfully
    if (data?.customerCreate?.customer) {
      const shopifyCustomer = data.customerCreate.customer;
      const customerId = shopifyCustomer.id.split('/').pop();

      const customer = {
        customer_id: customerId,
        first_name: shopifyCustomer.firstName,
        last_name: shopifyCustomer.lastName,
        email: shopifyCustomer.email,
        phone: shopifyCustomer.phone,
        store_id: id,
        name: name,
      };

      // Save customer to database
      const createdCustomer = await db.Customers.create(customer);

      // Handle addresses
      const createdAddresses = [];
      for (const shopifyAddress of shopifyCustomer.addresses) {
        const addressId = shopifyAddress.id.split('/').pop();
        const numericAddressId = parseInt(addressId, 10);

        const address = {
          address_id: numericAddressId,
          line1: shopifyAddress.address1,
          line2: shopifyAddress.address2,
          city: shopifyAddress.city,
          state: shopifyAddress.province,
          country: shopifyAddress.country,
          zip: shopifyAddress.zip,
          customer_id: customerId,
        };

        const createdAddress = await db.Addresses.create(address);
        createdAddresses.push(createdAddress);
      }

      return res.status(200).json({
        message: 'Customer and addresses created and saved to database successfully',
        customer,
        addresses: createdAddresses,
        dbCustomer: createdCustomer,
      });
    } else {
      return res.status(400).json({
        message: 'Failed to create customer on Shopify',
      });
    }
  } catch (error) {
    console.error('Error:', error.message || error);
    return res.status(500).json({
      message: 'An error occurred while creating the customer and address',
      error: error.message,
    });
  }
};


// const updateCustomer = async (req, res) => {
//   try {
//     const { id, accessToken, name } = req.shop || {};
//     const { id: customerId } = req.params;

//     if (!name || !accessToken) {
//       return res.status(400).json({
//         message: 'Store name or access token is missing in the request',
//       });
//     }

//     if (!customerId) {
//       return res.status(400).json({
//         message: 'Customer ID is missing in the request parameters',
//       });
//     }

//     const { first_name = '', last_name = '', email = '', phone = '', addresses = [] } = req.body.customer;

//     if (!Array.isArray(addresses)) {
//       return res.status(400).json({
//         message: 'Addresses should be provided as an array',
//       });
//     }

//     const customerUpdateMutation = `
//       mutation customerUpdate($input: CustomerInput!) {
//         customerUpdate(input: $input) {
//           customer {
//             id
//             firstName
//             lastName
//             email
//             phone
//             addresses {
//               id
//               address1
//               address2
//               city
//               province
//               country
//               zip
//             }
//           }
//           userErrors {
//             field
//             message
//           }
//         }
//       }
//     `;

//     const variables = {
//       input: {
//         id: `gid://shopify/Customer/${customerId}`,
//         firstName: first_name,
//         lastName: last_name,
//         email: email,
//         phone: phone,
//         addresses: addresses.map(address => ({
//           address1: address.line1 || '',
//           address2: address.line2 || '',
//           city: address.city || '',
//           province: address.state || '',
//           country: address.country || '',
//           zip: address.zip || '',
//         })),
//       },
//     };

//     console.log('variables:', variables.input);

//     const client = shopifyGraphQLClient(name, accessToken);

//     const customerResponse = await client.query({
//       data: {
//         query: customerUpdateMutation,
//         variables: variables,
//       },
//     });

//     const customerData = customerResponse?.body?.data;
//     console.log('customerData:', customerData.addresses);

//     if (customerData?.customerUpdate?.userErrors?.length > 0) {
//       const userErrors = customerData.customerUpdate.userErrors.map(error => ({
//         field: error.field.join('.'),
//         message: error.message,
//       }));
//       return res.status(400).json({
//         message: 'Failed to update customer in Shopify due to validation errors',
//         errors: userErrors,
//       });
//     }

//     const shopifyCustomer = customerData.customerUpdate.customer;

//     const updatedCustomer = {
//       customer_id: shopifyCustomer.id.split('/').pop(),
//       first_name: shopifyCustomer.firstName,
//       last_name: shopifyCustomer.lastName,
//       email: shopifyCustomer.email,
//       phone: shopifyCustomer.phone,
//       store_id: id,
//       name: name,
//     };
//     console.log(shopifyCustomer, "shopify customer");

//     for (const address of addresses) {
//       const addressInput = {
//         line1: address.line1 || '',
//         line2: address.line2 || '',
//         city: address.city || '',
//         state: address.state || '',
//         country: address.country || '',
//         zip: address.zip || '',
//         customer_id: updatedCustomer.customer_id,
//         address_id: address.address_id || null,  
//       };
      
//       if (address.address_id) {
//         console.log('Updating existing address:', addressInput);
//         await db.Addresses.update(addressInput, {
//           where: { address_id: address.address_id },
//         });
//       } else {
//         console.log('Creating new address:', addressInput);
//         await db.Addresses.create(addressInput);
//       }
//     }

//     return res.status(200).json({
//       message: 'Customer and address updated successfully',
//       customer: updatedCustomer,
//       addresses: addresses,
//     });
//   } catch (error) {
//     console.error('Error:', error.message || error);
//     return res.status(500).json({ message: 'An error occurred while updating the customer and address', error: error.message });
//   }
// };


const updateCustomer = async (req, res) => {
  try {
    const { id, accessToken, name } = req.shop || {};
    const { id: customerId } = req.params;

    if (!name || !accessToken) {
      return res.status(400).json({
        message: 'Store name or access token is missing in the request',
      });
    }

    if (!customerId) {
      return res.status(400).json({
        message: 'Customer ID is missing in the request parameters',
      });
    }

    const { first_name = '', last_name = '', email = '', phone = '', addresses = [] } = req.body.customer;

    if (!Array.isArray(addresses) || addresses.length !== 1) {
      return res.status(400).json({
        message: 'You should provide exactly one address to update',
      });
    }

    const updatedAddress = addresses[0]; 
    const addressIdToUpdate = updatedAddress.id; 

    const existingAddresses = await db.Addresses.findAll({
      where: {
        customer_id: customerId,
        id: { [Op.not]: addressIdToUpdate }, 
      },
    });

    console.log('existingAddresses:', existingAddresses);

    const addressInputsFromDB = existingAddresses.map((dbAddress) => ({
      address1: dbAddress.line1,
      address2: dbAddress.line2,
      city: dbAddress.city,
      province: dbAddress.state,
      country: dbAddress.country,
      zip: dbAddress.zip,
    }));
    
    console.log('addressInputsFromDB:', addressInputsFromDB);

    const addressInputForUpdate = {
      address1: updatedAddress.line1 || '',
      address2: updatedAddress.line2 || '',
      city: updatedAddress.city || '',
      province: updatedAddress.state || '',
      country: updatedAddress.country || '',
      zip: updatedAddress.zip || '',
    };

    console.log('addressInputForUpdate:', addressInputForUpdate);
    
    const allAddressInputs = [...addressInputsFromDB, addressInputForUpdate];

    const customerUpdateMutation = `
      mutation customerUpdate($input: CustomerInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
            phone
            addresses {
              id
              address1
              address2
              city
              province
              country
              zip
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
      input: {
        id: `gid://shopify/Customer/${customerId}`, 
        firstName: first_name,
        lastName: last_name,
        email: email,
        phone: phone,
        addresses: allAddressInputs,
      },
    };

    const client = shopifyGraphQLClient(name, accessToken);

    const customerResponse = await client.query({
      data: {
        query: customerUpdateMutation,
        variables,
      },
    });

    const customerData = customerResponse?.body?.data;

    if (customerData?.customerUpdate?.userErrors?.length > 0) {
      const userErrors = customerData.customerUpdate.userErrors.map(error => ({
        field: error.field.join('.'),
        message: error.message,
      }));
      return res.status(400).json({
        message: 'Failed to update customer in Shopify due to validation errors',
        errors: userErrors,
      });
    }

    const shopifyCustomer = customerData.customerUpdate.customer;

    const updatedCustomer = {
      customer_id: shopifyCustomer.id.split('/').pop(),
      first_name: shopifyCustomer.firstName,
      last_name: shopifyCustomer.lastName,
      email: shopifyCustomer.email,
      phone: shopifyCustomer.phone,
      store_id: id,
      name: name,
    };

    await db.Addresses.destroy({
      where: { customer_id: updatedCustomer.customer_id },
    });

    const shopifyAddresses = shopifyCustomer.addresses;
    for (const shopifyAddress of shopifyAddresses) {
      const addressId = parseInt(shopifyAddress.id.split('/').pop(), 10);
      
      const addressInput = {
        line1: shopifyAddress.address1,
        line2: shopifyAddress.address2,
        city: shopifyAddress.city,
        state: shopifyAddress.province,
        country: shopifyAddress.country,
        zip: shopifyAddress.zip,
        customer_id: updatedCustomer.customer_id,
        address_id: addressId,
      };

      await db.Addresses.create(addressInput);
    }

    return res.status(200).json({
      message: 'Customer and addresses updated successfully',
      customer: updatedCustomer,
    });

  } catch (error) {
    console.error('Error:', error.message || error);
    return res.status(500).json({ message: 'An error occurred while updating the customer and addresses', error: error.message });
  }
};









async function getAllCustomers(req, res) {
  const limit = parseInt(req.query.limit) || 5;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const { rows: dbCustomers, count: totalCustomers } = await db.Customers.findAndCountAll({
      limit: limit,
      offset: offset,
    });

    return res.status(200).json({
      message: 'Customers fetched successfully',
      dbCustomers,
      pagination: {
        currentPage: Math.floor(offset / limit) + 1,
        limit,
        totalCustomers,
        totalPages: Math.ceil(totalCustomers / limit),
        nextPageInfo: (offset + limit < totalCustomers) ? offset + limit : null,
      },
    });
  } catch (error) {
    console.error('Error fetching customers:', error.message);
    return res.status(500).json({
      message: 'Error fetching customers',
      error: error.message,
    });
  }
}



async function deleteCustomer(req, res) {
  const store_domain = req.shop.shop;
  const shopifyAccessToken = req.shop.accessToken;
  let { customer_id } = req.params;
  customer_id = customer_id.trim();

  const transaction = await db.sequelize.transaction();

  try {
    const customer = await db.Customers.findOne({
      where: { customer_id: customer_id },
      transaction,
    });

    if (!customer) {
      return res.status(404).json({
        message: 'Customer not found in the database',
      });
    }

    const addresses = await db.Addresses.findAll({
      where: { customer_id: customer.id },
      transaction,
    });

    if (addresses.length > 0) {
      await db.Addresses.destroy({
        where: { customer_id: customer.id },
        transaction,
      });
    }
    await db.Customers.destroy({
      where: { customer_id: customer_id },
      transaction,
    });

    const client = shopifyGraphQLClient(store_domain, shopifyAccessToken);

    const customerDeleteMutation = `
      mutation customerDelete($input: CustomerDeleteInput!) {
        customerDelete(input: $input) {
          deletedCustomerId
          userErrors {
            field
            message
          }
        }
      }
    `;

    const variables = {
      input: {
        id: `gid://shopify/Customer/${customer_id}`,
      },
    };

    const shopifyResponse = await client.query({
      data: {
        query: customerDeleteMutation,
        variables,
      },
    });

    const data = shopifyResponse.body.data;

    if (data.customerDelete.userErrors.length > 0) {
      return res.status(400).json({
        message: 'Failed to delete customer in Shopify',
        errors: data.customerDelete.userErrors,
      });
    }

    await transaction.commit();

    return res.status(200).json({
      message: 'Customer and their addresses deleted successfully',
    });
  } catch (error) {
    await transaction.rollback();

    console.error('Error deleting customer:', error?.response?.body || error.message);
    return res.status(500).json({
      message: 'Error deleting customer',
      error: error.message || error?.response?.body,
    });
  }
}



module.exports.deleteCustomer = deleteCustomer;
module.exports.getAllCustomers = getAllCustomers;
module.exports.updateCustomer = updateCustomer;
module.exports.createCustomer = createCustomer;


