const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define("product_options", {
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
    option_id: {
      type: Sequelize.BIGINT,
      allowNull: false
    },
    name: {
        type: Sequelize.STRING,
        allowNull: true
      },
    position: {
      type: Sequelize.INTEGER,
      allowNull: true
    },
    values: {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: "JSON array of option values (like sizes or colors)."
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
    tableName: 'product_options',
    timestamps: true,
});
};
 