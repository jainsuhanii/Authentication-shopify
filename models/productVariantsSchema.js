const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define("product_variants", {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    product_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'products',
        key: 'product_id'
      },
      onDelete: 'CASCADE',
      comment: "Foreign key mapping to the product's primary key 'id'."
    },
    variant_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      comment: "ID of the variant in Shopify.",
      unique: "variant_id",
    },
    title: {
      type: Sequelize.STRING,
      allowNull: true
    },
    price: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    },
    sku: {
      type: Sequelize.STRING,
      allowNull: true
    },
    inventory_quantity: {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    option1: {
      type: Sequelize.STRING,
      allowNull: true
    },
    option2: {
      type: Sequelize.STRING,
      allowNull: true
    },
    option3: {
      type: Sequelize.STRING,
      allowNull: true
    },
    createdAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    },
    updatedAt: {
      type: Sequelize.DATE,
      defaultValue: Sequelize.NOW
    }
  }, {
    tableName: 'product_variants',
    timestamps: true,
});
};