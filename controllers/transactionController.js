const { shopifyRestClient } = require("../shopify");
const db = require("../database/db");

const createTransaction = async (req, res) => {
    console.log("Create Transaction");
    const { id: order_id } = req.params;
    const { amount, currency, kind } = req.body;
    console.log(req.body);
    if (!amount || !currency || !kind) {
        return res.status(400).json({
            message: "Amount, currency, and kind are required.",
        });
    }

    const store_domain = req.shop.shop;
    const shopifyAccessToken = req.shop.accessToken;

    try {
        const order = await db.orders.findOne({ where: { order_id } });

        console.log("Order from DB:", order);

        if (!order) {
            return res.status(400).json({
                message: "Order not found.",
            });
        }

        const transactionPayload = {
            transaction: {
                amount,
                kind,
                currency,
            },
        };

        console.log("Transaction Payload:", transactionPayload);

        const client = shopifyRestClient(store_domain, shopifyAccessToken);
        
        const transactionResponse = await client.post({
            path: `orders/${order_id}/transactions`,
            data: transactionPayload,
        });

        const transaction = transactionResponse.body.transaction;
        console.log("Created Transaction:", transaction);

        const newTransaction = await transaction.create({
            order_id,
            transaction_id: transaction.id,
            amount: transaction.amount,
            currency: transaction.currency,
            kind: transaction.kind,
            status: transaction.status || "success",
        });

        res.status(200).json({
            message: "Transaction created successfully!",
            transaction: newTransaction,
        });
    } catch (error) {
        console.error("Error creating transaction:", error);

        if (error.response) {
            res.status(400).json({
                message: "Failed to create transaction in Shopify.",
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

module.exports.createTransaction = createTransaction;
