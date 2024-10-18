const Sequelize = require('sequelize');

module.exports = (sequelize) => {
    return sequelize.define("fulfillments", {
        id: {
            type: Sequelize.INTEGER, 
            autoIncrement: true,
            primaryKey: true,
        },
        // order_id: {
        //     type: Sequelize.BIGINT,
        //     references: {
        //         model: 'orders',
        //         key: 'order_id',
        //     },
        //     allowNull: true,
        //     onDelete: 'CASCADE',
        //     comment: "Foreign key mapping to the 'order_id' in the 'orders' table. Deletes related records when the referenced order is deleted."
        // },
        fulfillment_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
        },
        location_id: {
            type: Sequelize.BIGINT, 
            allowNull: true,
        },
        tracking_number: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        tracking_company: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        tracking_url: {
            type: Sequelize.TEXT,
            allowNull: true,
        },
        notify_customer: {
            type: Sequelize.BOOLEAN,
            allowNull: true,
            defaultValue: false,
        },
        createdAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
        updatedAt: {
            type: Sequelize.DATE,
            defaultValue: Sequelize.NOW,
        },
    }, {
        tableName: 'fulfillments',
        timestamps: true, 
    });
};
