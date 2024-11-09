const { shopifyGraphQLClient } = require("../shopify");

const db = require('../database/db');
  
const createOrder = async (req, res) => {
    const {
        customer,
        currency,
        lineItems,
        transactions,
        billing_address,
        shipping_address,
        total_tax,
    } = req.body;
console.log(req.body);
    try {
        const { id, accessToken, name } = req.shop || {};
        const client = shopifyGraphQLClient(name, accessToken);

        const mutation = `
        mutation OrderCreate($order: OrderCreateOrderInput!) {
            orderCreate(order: $order) {
                userErrors {
                    field
                    message
                }
                order {
                    id
                    displayFinancialStatus
                    customer {
                        displayName
                        email
                    }
                    billingAddress {
                        firstName
                        lastName
                        address1
                        address2
                        city
                        zip
                    }
                    shippingAddress {
                        firstName
                        lastName
                        address1
                        address2
                        city
                        zip
                    }
                    totalTax
                }
            }
        }`;

        const variables = {
            order: {
                customerId: customer.id,
                currency: currency,
                lineItems: lineItems.map((item) => ({
                    variantId: item.variantId,
                    quantity: item.quantity,
                    taxLines: item.taxLines,
                })),
                transactions: transactions.map((transaction) => ({
                    kind: transaction.kind,
                    status: transaction.status,
                    amountSet: {
                        shopMoney: {
                            amount: transaction.amountSet.shopMoney.amount,
                            currencyCode: transaction.amountSet.shopMoney.currencyCode,
                        },
                    },
                })),
                billingAddress: {
                    address1: billing_address.address1,
                    city: billing_address.city,
                    zip: billing_address.zip,
                    firstName: billing_address.firstName || null,
                    lastName: billing_address.lastName || null,
                    province: billing_address.province || null, // optional
                    country: billing_address.country || null    // optional
                },
                shippingAddress: {
                    address1: shipping_address.address1,
                    city: shipping_address.city,
                    zip: shipping_address.zip,
                    firstName: shipping_address.firstName || null,
                    lastName: shipping_address.lastName || null,
                    province: shipping_address.province || null, // optional
                    country: shipping_address.country || null    // optional
                },
                totalTax: total_tax,
            },
        };
        console.log(JSON.stringify(variables, null, 2));
        const response = await client.query({
            data: {
                query: mutation,
                variables: variables,
            },
        });

        const { userErrors, order } = response.body.data.orderCreate;

        if (userErrors && userErrors.length > 0) {
            return res.status(400).json({ errors: userErrors });
        }

        res.status(201).json({
            message: "Order created successfully.",
            order: order,
        });
    } catch (error) {
        console.error(
            "Error creating order:",
            error.response?.data || error.message
        );
        res.status(500).json({
            message: "Error creating order.",
            error: error.response?.data || error.message,
        });
    }
};



const cancelOrder = async (req, res) => {
    const { id: order_id } = req.params;
    const store_domain = req.shop.shop;
    const shopifyAccessToken = req.shop.accessToken;

    try {
        const client = shopifyRestClient(store_domain, shopifyAccessToken);
        const response = await client.post({
            path: `orders/${order_id}/cancel.json`,
        });

        if (response.body.order) {
            const canceledOrder = response.body.order;

            // const updateOrderQuery = `
            //     UPDATE orders
            //     SET financial_status = ?, fulfilment_status = ?
            //     WHERE order_id = ?`;
            // await global.connection.query(updateOrderQuery, [
            //     canceledOrder.financial_status, 
            //     canceledOrder.fulfillment_status, 
            //     order_id, 
            // ]);
            await db.orders.destroy({
                where: { order_id: order_id },
            })
            res.status(200).json({
                message: "Order canceled successfully!",
                order: canceledOrder,
            });
        } else {
            res.status(400).json({
                message: "Failed to cancel order in Shopify.",
            });
        }
    } catch (error) {
        console.error("Error canceling order:", error);

        if (error.response) {
            res.status(error.response.status).json({
                message: "Failed to cancel order in Shopify.",
                error: error.response.body.errors || error.response.body,
            });
        } else {
            res.status(500).json({
                message: "An unexpected error occurred.",
                error: error.message,
            });
        }
    }
};


const getOrder = async (req, res) => {
    const { id: order_id } = req.params;
    const store_domain = req.shop.shop;
    const shopifyAccessToken = req.shop.accessToken;

    try {
        const order = await db.orders.findAll({
            where: { order_id: order_id }
        });

        const client = shopifyRestClient(store_domain, shopifyAccessToken);
        const response = await client.get({
            path: `orders/${order_id}`,
        });

        const shopifyOrder = response.body.order;

        const orderDetails = {
            ...order[0],
            shopify_order: shopifyOrder,
        };

        res.status(200).json({
            message: "Order retrieved successfully!",
            order: orderDetails,
        });
    } catch (error) {
        console.error("Error retrieving order:", error);

        if (error.response) {
            res.status(error.response.status).json({
                message: "Failed to retrieve order from Shopify.",
                error: error.response.body.errors || error.response.body,
            });
        } else {
            res.status(500).json({
                message: "An unexpected error occurred.",
                error: error.message,
            });
        }
    }
};


module.exports.createOrder=createOrder
module.exports.getOrder = getOrder;
module.exports.cancelOrder = cancelOrder;
// module.exports.createOrder = createOrder;
