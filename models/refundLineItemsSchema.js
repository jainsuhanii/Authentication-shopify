const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    return sequelize.define("line_items", {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
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
        refund_line_item_id: {
            type: Sequelize.BIGINT,
            allowNull: false
        },
        line_item_id: {
            type: Sequelize.BIGINT,
            references:{
                model: 'line_items',
                key: 'line_item_id'
            },
            allowNull: false,
            onDelete: 'CASCADE',
            comment: "Foreign key mapping to the 'line_item_id' in the 'product_variants' table. Deletes related records when the referenced variant is deleted."

        },
        price: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false
        },
        quantity: {
            type: Sequelize.INTEGER,
            allowNull: false
        },
        discount: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true
        },
        subtotal: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false
        },
        tax: {
            type: Sequelize.DECIMAL(10, 2),
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
        tableName: 'refund_line_items',
        timestamps: true,
    });
};

