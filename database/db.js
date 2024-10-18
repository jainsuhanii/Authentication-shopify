
// async function startApp() {
//   try {
//     global.connection = await mysql.createConnection({
//       host: 'localhost',
//       user: 'root',
//       password: 'adminadmin',
//       database: 'shopify1',
//     });
//     console.log('Database connection established');
//   } catch (err) {
//     console.error('Error connecting to MySQL:', err);
//     process.exit(1);
//   }
// }

// startApp();


const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('shopify1', 'root', 'adminadmin', {
  host: 'localhost',
  dialect: 'mysql',
  logging: false
});

// async function Connection() {
//   try {
//     await sequelize.authenticate();
//     console.log('Connection has been established successfully.');
//   } catch (error) {
//     console.error('Unable to connect to the database:', error);
//   }
// }




const db = { sequelize: sequelize }


db.Stores = require('../models/storeSchema')(sequelize);
db.Customers = require('../models/customerSchema')(sequelize);
db.Addresses = require('../models/addressesSchema')(sequelize);
db.products = require('../models/productSchema')(sequelize);
db.product_options = require('../models/productOptionsSchema')(sequelize);
db.product_variants = require('../models/productVariantsSchema')(sequelize);
db.product_images = require('../models/productImagesSchema')(sequelize);
db.orders = require('../models/ordersSchema')(sequelize);
db.line_items = require('../models/lineItemsSchema')(sequelize);
db.order_addresses = require('../models/orderAddressSchema')(sequelize);
db.transactions = require('../models/transactionsSchema')(sequelize);
db.refunds = require('../models/refundSchema')(sequelize);
db.fulfillments = require('../models/fulfillmentsSchema')(sequelize);

db.products.hasMany(db.product_variants, { foreignKey: "product_id", sourceKey: "product_id" })
db.product_variants.belongsTo(db.products, { foreignKey: "product_id", sourceKey: "product_id" })

db.products.hasMany(db.product_options, { foreignKey: "product_id", sourceKey: "product_id" })
db.product_variants.belongsTo(db.products, { foreignKey: "product_id", sourceKey: "product_id" })

db.products.hasMany(db.product_images, { foreignKey: "product_id", sourceKey: "product_id" })
db.product_variants.belongsTo(db.products, { foreignKey: "product_id", sourceKey: "product_id" })

db.orders.hasMany(db.line_items, { foreignKey: "order_id", sourceKey: "order_id" })
db.line_items.belongsTo(db.orders, { foreignKey: "order_id", sourceKey: "order_id" })

db.orders.hasMany(db.transactions, { foreignKey: "order_id", sourceKey: "order_id" })
db.transactions.belongsTo(db.orders, { foreignKey: "order_id", sourceKey: "order_id" })



module.exports = db;
