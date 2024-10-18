const Sequelize = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('refunds', {
    id: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    refund_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      unique: "refund_id", 
    },
    order_id: {
      type: Sequelize.BIGINT,
      allowNull: false,
      references: {
        model: 'orders',
        key: 'order_id'
      },
      onDelete: 'CASCADE',
      comment: 'Foreign key referencing the orders(order_id) cascade deletes related records when the referenced order is deleted.'
    },
    refund_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
    },
    currency: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    refund_note: {
      type: Sequelize.STRING,
      allowNull: true,
    },
    shipping_refund_amount: {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
    },
    status: {
      type: Sequelize.STRING,
      allowNull: true,
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
    tableName: 'refunds',
    timestamps: true,
  });
};
