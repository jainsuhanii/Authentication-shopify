const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    return sequelize.define("customer", {
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
        customer_id: {
            type: Sequelize.BIGINT,
            allowNull: false,
            unique: "customer_id"
      
        },
        first_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        last_name: {
            type: Sequelize.STRING,
            allowNull: false
        },
        email: {
            type: Sequelize.STRING,
            allowNull: false,
            validate: {
                isEmail: true
            }
        },
        phone: {
            type: Sequelize.STRING,
            allowNull: false
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
        tableName: 'customer',
        timestamps: true,
    });
    };