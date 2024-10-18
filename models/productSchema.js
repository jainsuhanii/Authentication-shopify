const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    return sequelize.define("products", {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        store_id: {
            type: Sequelize.INTEGER(11),
              references: {
              model: 'stores',
                key: 'id'
            },
            allowNull: false,
              comment: "Foreign key mapping to the primary key 'id' in the 'stores' table, with cascading delete functionality.",
                onDelete: 'CASCADE'
          },
        product_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            unique:"product_id",
        },
        title: {
            type: Sequelize.STRING,
            allowNull: false
        },
        body_html: {
            type: Sequelize.STRING,
            allowNull: true
        },
        vendor: {
            type: Sequelize.STRING,
            allowNull: true,
        },
        product_type: {
            type: Sequelize.STRING,
            allowNull: true
        },
        tags: {
            type: Sequelize.TEXT,
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
        tableName: 'products',
        timestamps: true,
    });
    };
