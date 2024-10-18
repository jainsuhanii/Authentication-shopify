const Sequelize = require('sequelize');
module.exports = (sequelize) => {
    return sequelize.define("addresses", {
    id:{
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true
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
    address_id:{
        type: Sequelize.BIGINT,
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
    tableName: 'addresses',
    timestamps: true,
});
};

