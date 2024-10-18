const { shopifyRestClient } = require("../shopify");

const createGiftCard = async (req, res) => {
    console.log("Request Body:", req.body); 

    const { initial_value, currency, customer_id, expires_on } = req.body; 
    const store_domain = req.shop.shop;
    const shopifyAccessToken = req.shop.accessToken;

    try {
        const customerId = BigInt(customer_id).toString();

        const giftCardPayload = {
            gift_card: {
                initial_value: initial_value,
                currency: currency,
                customer_id: customerId, 
                expires_on: expires_on ? new Date(expires_on).toISOString() : null, 
            },
        };

        console.log("Gift Card Payload:", JSON.stringify(giftCardPayload, null, 2));

        const client = shopifyRestClient(store_domain, shopifyAccessToken);
        const response = await client.post({
            path: 'gift_cards',
            data: giftCardPayload,
        });

        const giftCard = response.body.gift_card;

        const insertGiftCardQuery = `
            INSERT INTO gift_cards (gift_card_id, customer_id, initial_value, currency, balance, expires_on)
            VALUES (?, ?, ?, ?, ?, ?)`;
        
        await global.connection.query(insertGiftCardQuery, [
            giftCard.id,
            customerId || null, // Use string
            giftCard.initial_value,
            giftCard.currency,
            giftCard.balance || giftCard.initial_value, 
            expires_on ? new Date(expires_on).toISOString().slice(0, 19).replace('T', ' ') : null, // Adjust format
        ]);

        res.status(200).json({
            message: "Gift card created successfully!",
            gift_card: giftCard,
        });
    } catch (error) {
        console.error("Error creating gift card:", error);

        if (error.response) {
            res.status(error.response.status).json({
                message: "Failed to create gift card in Shopify.",
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

module.exports.createGiftCard = createGiftCard;
