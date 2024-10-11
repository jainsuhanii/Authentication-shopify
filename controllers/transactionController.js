// const { shopifyRestClient } = require("../shopify");

// const createTransaction = async (req, res) => {
//     const { id: order_id } = req.params;
//     const { amount, currency, kind } = req.body;

//     if (!amount || !currency || !kind) {
//         return res.status(400).json({
//             message: "Amount, currency, and kind are required.",
//         });
//     }

//     const store_domain = req.shop.shop;
//     const shopifyAccessToken = req.shop.accessToken;

//     try {
//         const [order] = await global.connection.query(
//             `SELECT * FROM orders WHERE order_id = ?`, 
//             [order_id]
//         );

//         console.log("Order from DB:", order);

//         if (!order.length) {
//             return res.status(400).json({
//                 message: "Order not found.",
//             });
//         }

       
//         const transactionPayload = {
//             transaction: {
//                 amount,
//                 kind,
//                 currency,
//             },
//         };

//         console.log("Transaction Payload:", transactionPayload);

//         const client = shopifyRestClient(store_domain, shopifyAccessToken);
        
//         const transactionResponse = await client.post({
//             path: `orders/${order_id}/transactions`,
//             data: transactionPayload,
//         });

//         const transaction = transactionResponse.body.transaction;
//         console.log("Created Transaction:", transaction);

//         const insertTransactionQuery = `
//             INSERT INTO transactions (order_id, transaction_id, amount, currency, kind, status)
//             VALUES (?, ?, ?, ?, ?, ?)
//         `;

//         await global.connection.query(insertTransactionQuery, [
//             order_id,
//             transaction.id,
//             transaction.amount,
//             transaction.currency,
//             transaction.kind,
//             transaction.status || "success", 
//         ]);

//         res.status(200).json({
//             message: "Transaction created successfully!",
//             transaction: transaction,
//         });
//     } catch (error) {
//         console.error("Error creating transaction:", error);

//         if (error.response) {
//             res.status(400).json({
//                 message: "Failed to create transaction in Shopify.",
//                 error: error.response.body.errors || error.response.body,
//             });
//         } else {
//             res.status(500).json({
//                 message: "An unexpected error occurred.",
//                 error: error.message,
//             });
//         }
//     }
// };

// module.exports.createTransaction = createTransaction;
