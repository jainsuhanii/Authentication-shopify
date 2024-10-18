const { shopifyRestClient } = require("../shopify");
const db = require("../database/db");

const createFulfillment = async (req, res) => {
    try {
        if (!req.body || typeof req.body !== 'object') {
            return res.status(400).json({ message: 'Invalid JSON input' });
        }

        const { order_id, fulfillment } = req.body;
        const store_domain = req.shop.shop;
        const shopifyAccessToken = req.shop.accessToken;

        const client = shopifyRestClient(store_domain, shopifyAccessToken);

        if (!fulfillment || !fulfillment.line_items_by_fulfillment_order) {
            return res.status(400).json({ message: 'Invalid fulfillment data' });
        }

        const fulfillmentPayload = {
            fulfillment: {
                order_id: fulfillment.order_id,
                message: fulfillment.message,
                notify_customer: fulfillment.notify_customer,
                // tracking_number: fulfillment.tracking_number,
                // tracking_url: fulfillment.tracking_url,
                // tracking_company: fulfillment.tracking_company,
                tracking_info :
                {
                number:"MS1562678",
                url:"https://www.my-shipping-company.com?tracking_number=MS1562678"
            },
                line_items_by_fulfillment_order: fulfillment.line_items_by_fulfillment_order.map(item => ({
                    fulfillment_order_id: item.fulfillment_order_id,
                    fulfillment_order_line_items: item.fulfillment_order_line_items.map(lineItem => {
                        if (!lineItem.id || typeof lineItem.quantity !== 'number') {
                            throw new Error('Invalid line item data');
                        }
                        return {
                            id: lineItem.id,
                            quantity: lineItem.quantity 
                        };
                    }),
                })),
            },
        };

        console.log('Fulfillment Payload:', JSON.stringify(fulfillmentPayload, null, 2));

        const fulfillmentResponse = await client.post({
            path: 'fulfillments',
            data: fulfillmentPayload,
        });

        console.log('Fulfillment Response:', fulfillmentResponse?.body);

        if (!fulfillmentResponse.body || !fulfillmentResponse.body.fulfillment) {
            return res.status(500).json({ message: 'Invalid response from Shopify' });
        }

        const fulfillmentId = fulfillmentResponse.body.fulfillment.id;

        const newFulfillment = await db.fulfillments.create({
            fulfillment_id: fulfillmentId,
            location_id: fulfillment.location_id,
            number: fulfillment.tracking_number,
            tracking_company: fulfillment.tracking_company,
            tracking_url: fulfillment.tracking_url,
            notify_customer: fulfillment.notify_customer,
        });

        res.status(200).json({
            message: 'Fulfillment created successfully in Shopify and saved to the database',
            fulfillment: newFulfillment,
        });
    } catch (error) {
        console.error('Error creating fulfillment:', error);
        res.status(500).json({
            message: 'Failed to create fulfillment',
            error: error.message,
        });
    }
};


  module.exports.createFulfillment = createFulfillment;