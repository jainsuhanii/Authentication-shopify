const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    return sequelize.define("order_address", {
    id:{
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
    },
    type:{
        type:Sequelize.ENUM('shipping', 'billing'),
        allowNull: false,
    },
    name:{
        type: Sequelize.STRING,
        allowNull: false
    },
    line1:{
        type: Sequelize.STRING,
        allowNull: false
    },
    line2:{
        type: Sequelize.STRING,
        allowNull: false
    },
    city:{
        type: Sequelize.STRING,
        allowNull: false
    },
    state:{
        type: Sequelize.STRING,
        allowNull: false
    },
    country:{
        type: Sequelize.STRING,
        allowNull: false
    },
    zip:{
        type: Sequelize.STRING,
        allowNull: false
    },
    order_id: {
        type: Sequelize.BIGINT,
        references: {
          model: 'orders',  
          key: 'order_id' 
        },
        allowNull: false,
        onDelete: 'CASCADE',  
        comment: "Foreign key mapping to the 'order_id' in the 'orders' table. Deletes related records when the referenced order is deleted."
      },      
    address_id:{
        type: Sequelize.BIGINT,
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
    tableName: 'order_address',
    timestamps: true,
});
};

