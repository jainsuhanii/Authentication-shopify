const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    return sequelize.define("transaction", {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        order_id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'order_id', 
            },
            comment: "Foreign key mapping to the primary key 'id' in the 'orders' table.",
            onDelete: 'CASCADE'
        },        
        transaction_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            unique:"transaction_id",
        },
        amount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false
        },
        currency: {
            type: Sequelize.STRING,
            allowNull: true
        },
        kind: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        status: {
            type: Sequelize.STRING,
            allowNull: true
        },
        gateway: { 
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
        tableName: 'transactions',
        timestamps: true,
    });
    };

