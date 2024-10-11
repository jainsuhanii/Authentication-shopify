const { shopifyRestClient } = require("../shopify");

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

    if (!shipping_address.name || !shipping_address.line1 || !shipping_address.city || !shipping_address.country || !shipping_address.zip) {
        return res.status(400).json({ message: "Incomplete shipping address" });
    }

    if (!billing_address.name || !billing_address.line1 || !billing_address.city || !billing_address.country || !billing_address.zip) {
        return res.status(400).json({ message: "Incomplete billing address" });
    }

    try {
        let total_price = 0;
        const orderLineItems = [];

        for (const item of line_items) {
            const { product_id, variant_id, quantity } = item;

            const [result] = await global.connection.query(
                `SELECT p.title, pv.price 
                 FROM products p
                 JOIN product_variants pv ON p.shopify_product_id = pv.product_id 
                 WHERE pv.shopify_variant_id = ?`,
                [variant_id]
            );

            if (!result.length) {
                return res.status(400).json({
                    message: "Invalid product or variant ID.",
                });
            }

            const lineItemPrice = parseFloat(result[0].price);
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
            order: {
                customer_id,
                line_items: orderLineItems,
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
                financial_status,
                subtotal: subtotal,
                fulfillment_status,
            },
        };

        const client = shopifyRestClient(store_domain, shopifyAccessToken);
        const response = await client.post({
            path: 'orders',
            data: orderPayload,
        });

        const shopifyOrder = response.body.order;

        const insertOrderQuery = `
            INSERT INTO orders (order_id, customer_id, price, discount, tax, fulfilment_status, financial_status, subtotal)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
        await global.connection.query(insertOrderQuery, [
            shopifyOrder.id,
            customer_id,
            total_price,
            0,
            0,
            fulfillment_status,
            financial_status,
            total_price,
        ]);

        for (const item of shopifyOrder.line_items) {
            try {
                const insertLineItemQuery = `
                    INSERT INTO line_items (order_id, line_item_id, price, quantity, variant_id, discount, subtotal, tax)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `;
                await global.connection.query(insertLineItemQuery, [
                    shopifyOrder.id,
                    item.id,
                    item.price || item.price_set?.shop_money?.amount,
                    item.quantity,
                    item.variant_id,
                    item.discount_allocations[0]?.amount || 0,
                    item.price * item.quantity,
                    item.tax_lines[0]?.price || 0,
                ]);
            } catch (err) {
                console.error(`Error inserting line item: ${item.id} for order: ${shopifyOrder.id}`, err);
            }
        }

        const insertOrderAddressQuery = `
        INSERT INTO order_address (order_id, type, name, line1, line2, city, state, country, zip)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
        await global.connection.query(insertOrderAddressQuery, [
            shopifyOrder.id,
            'shipping',
            shipping_address.name, 
            shipping_address.line1, 
            shipping_address.line2,
            shipping_address.city,
            shipping_address.state,
            shipping_address.country,
            shipping_address.zip
        ]);
    
        await global.connection.query(insertOrderAddressQuery, [
            shopifyOrder.id,
            'billing',
            billing_address.name,
            billing_address.line1, 
            billing_address.line2,
            billing_address.city,
            billing_address.state,
            billing_address.country,
            billing_address.zip
        ]);

        for (const trans of transactions) {
            const { amount, currency, kind, status = "success",source } = trans;

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

            await client.post({
                path: `orders/${shopifyOrder.id}/transactions`,
                data: transactionPayload,
            });

            const transactionInsertQuery = `
                INSERT INTO transactions (order_id, transaction_id, amount, currency, kind, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            await global.connection.query(transactionInsertQuery, [
                shopifyOrder.id,
                shopifyOrder.id, 
                amount,
                currency,
                kind || "sale",
                status,
            ]);
        }

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
        } else if (error.code === 'ER_BAD_NULL_ERROR' || error.code === 'ER_NO_REFERENCED_ROW_2') {
            res.status(400).json({
                message: "Database error: invalid input.",
                error: error.message,
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

            const updateOrderQuery = `
                UPDATE orders
                SET financial_status = ?, fulfilment_status = ?
                WHERE order_id = ?`;
            await global.connection.query(updateOrderQuery, [
                canceledOrder.financial_status, 
                canceledOrder.fulfillment_status, 
                order_id, 
            ]);

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
        const [order] = await global.connection.query(
            `SELECT * FROM orders WHERE order_id = ?`,
            [order_id]
        );

        if (!order.length) {
            return res.status(404).json({
                message: "Order not found.",
            });
        }

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
