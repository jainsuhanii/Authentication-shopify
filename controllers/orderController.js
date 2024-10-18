const { shopifyRestClient } = require("../shopify");
const db= require('../database/db');
const createOrder = async (req, res) => {

    const {
        customer_id,
        line_items = [],
        shipping_address = {},
        billing_address = {},
        financial_status,
        fulfillment_status,
        transactions = [],
    } = req.body;
    
    const store_domain = req.shop.shop;
    const shopifyAccessToken = req.shop.accessToken;

    try {
        let total_price = 0;
        const orderLineItems = [];

        for (const item of line_items) {
            const { product_id, variant_id, quantity } = item;

            const productVariant = await db.product_variants.findOne({
                where: { variant_id: variant_id },
                include: {
                    model: db.products,
                    as: 'product',
                    // where: { product_id: product_id },
                },
            });

            console.log(productVariant, item);

            if (!productVariant) {
                return res.status(400).json({
                    message: "Invalid product or variant ID.",
                });
            }

            const lineItemPrice = parseFloat(productVariant.price);
            const lineItemTotal = lineItemPrice * quantity;

            const lineItem = {
                variant_id: variant_id,
                quantity: quantity,
                price: lineItemPrice,
            };

            orderLineItems.push(lineItem);
            total_price += lineItemTotal;
        }

        const subtotal = total_price.toFixed(2);

        const orderPayload = {
            customer_id,
            financial_status,
            subtotal,
            fulfillment_status,
            shipping_address: {
                name: shipping_address.name,
                address1: shipping_address.line1,
                address2: shipping_address.line2,
                city: shipping_address.city,
                province: shipping_address.state,
                country: shipping_address.country,
                zip: shipping_address.zip,
            },
            billing_address: {
                name: billing_address.name,
                address1: billing_address.line1,
                address2: billing_address.line2,
                city: billing_address.city,
                province: billing_address.state,
                country: billing_address.country,
                zip: billing_address.zip,
            },
            line_items: orderLineItems,
        };

        console.log(orderPayload, "orderPayload")

        const client = shopifyRestClient(store_domain, shopifyAccessToken);
        const response = await client.post({
            path: 'orders',
            data: { order: orderPayload },
        });

        const shopifyOrder = response.body.order;

        const order = await db.orders.create({
            order_id: shopifyOrder.id,
            customer_id,
            price: total_price,
            discount: 0,
            tax: 0,
            fulfillment_status,
            financial_status,
            subtotal: total_price,
        });

        for (const item of shopifyOrder.line_items) {
            await db.line_items.create({
                order_id: shopifyOrder.id,
                line_item_id: item.id,
                price: item.price || item.price_set?.shop_money?.amount,
                quantity: item.quantity,
                variant_id: item.variant_id,
                discount: item.discount_allocations[0]?.amount || 0,
                subtotal: (item.price || item.price_set?.shop_money?.amount) * item.quantity,
                tax: item.tax_lines[0]?.price || 0,
            });
        }

        await db.order_addresses.create({
            order_id: shopifyOrder.id,
            type: 'shipping',
            name: shipping_address.name,
            line1: shipping_address.line1,
            line2: shipping_address.line2,
            city: shipping_address.city,
            state: shipping_address.state,
            country: shipping_address.country,
            zip: shipping_address.zip,
        });

        await db.order_addresses.create({
            order_id: shopifyOrder.id,
            type: 'billing',
            name: billing_address.name,
            line1: billing_address.line1,
            line2: billing_address.line2,
            city: billing_address.city,
            state: billing_address.state,
            country: billing_address.country,
            zip: billing_address.zip,
        });

        for (const trans of transactions) {
            const { amount, currency, kind, status = "success", source } = trans;

            if (!amount || !currency) {
                return res.status(400).json({
                    message: "Amount and currency are required for transactions.",
                });
            }

            const transactionPayload = {
                transaction: {
                    amount,
                    currency,
                    kind: kind || "sale",
                    status: status || "success",
                    source: source || "external",
                },
            };

            const transactionResponse = await client.post({
                path: `orders/${shopifyOrder.id}/transactions`,
                data: transactionPayload,
            });

            const shopifyTransaction = transactionResponse.body.transaction;

            await db.transactions.create({
                order_id: shopifyOrder.id,
                transaction_id: shopifyTransaction.id, 
                amount,
                currency,
                kind: kind || "sale",
                status,
            });
        }
        console.log(transactions, "transactions")

        res.status(200).json({
            message: "Order and transaction created successfully!",
            order: shopifyOrder,
        });
    } catch (error) {
        console.error("Error creating order or transaction:", error);

        if (error.response) {
            res.status(error.response.status).json({
                message: "Failed to create order in Shopify.",
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


const cancelOrder = async (req, res) => {
    const { id:order_id } = req.params; 
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
    const { id:order_id } = req.params; 
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




module.exports.getOrder = getOrder;
module.exports.cancelOrder = cancelOrder;
module.exports.createOrder = createOrder;
