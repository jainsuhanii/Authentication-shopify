const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define("product_images", {
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
    image_id: {
        type: Sequelize.BIGINT,
        allowNull: false,
        unique:"image_id",
      },
    src: {
      type: Sequelize.STRING,
      allowNull: false,
      comment: "The URL of the product image."
    },
    alt: {
      type: Sequelize.STRING,
      allowNull: true,
      comment: "Alt text for the product image."
    },
    position: {
      type: Sequelize.INTEGER,
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
    tableName: 'product_images',
    timestamps: true,
});
};
