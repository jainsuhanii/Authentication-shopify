const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    return sequelize.define("orders", {
    id:{
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    order_id:{
        type: Sequelize.BIGINT,
        allowNull: false,
        unique: "order_id"
    },
    price:{
        type: Sequelize.STRING,
        allowNull: false
    },
    discount:{
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
    },
    tax:{
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
    },
    fulfillment_status:{
        type: Sequelize.ENUM('fulfilled', 'unfulfilled'),
        allowNull: true
    },
    financial_status:{
        type: Sequelize.ENUM('paid', 'pending', 'refunded'),
        allowNull: false
    },
    subtotal:{
        type: Sequelize.FLOAT,
        allowNull: false
    },
    customer_id: {
        type: Sequelize.BIGINT,
        references: {
          model: 'customers',  
          key: 'customer_id' 
        },
        allowNull: false,
        onDelete: 'CASCADE',  
        comment: "Foreign key mapping to the 'customer_id' in the 'customers' table. Deletes related records when the referenced customer is deleted."
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
    tableName: 'orders',
    timestamps: true,
});
};

