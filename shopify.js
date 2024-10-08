
require('@shopify/shopify-api/adapters/node')
const { shopifyApi, Session, ApiVersion } = require("@shopify/shopify-api");
require('dotenv').config();

exports.shopifyRestClient = (shop, accessToken) => {
    const Shopify = shopifyApi({
        apiKey: process.env.CLIENT_ID,
        apiSecretKey: process.env.CLIENT_SECRET,
        scopes: process.env.SCOPES.split(','),
        hostName: process.env.HOST_NAME.replace(/^https?:\/\//, ''),
        apiVersion: ApiVersion.October24,
    });

    const session = new Session({
        id: Shopify.auth.nonce(),
        shop: shop,
        state: Shopify.auth.nonce(),
        isOnline: false,
        accessToken: accessToken,
    });
    const client = new Shopify.clients.Rest({ session: session });
    return client;
}


