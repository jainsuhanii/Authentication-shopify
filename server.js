// const Connection = require ('./database/db');
const express = require('express');
const app = express();
app.use(express.json());
const routes = require('./routes');
app.use(routes);
const db = require('./database/db');
db.sequelize.sync({ alter: true })
    .then(data => {
        console.info(`Connected sql server`);
    })
    .catch(error => console.error(`Database connection error -> `, error));

require('dotenv').config();
const crypto = require('crypto');
 const customer = require('./controllers/customerController');  
const port = 3000;


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

module.exports=app;
app.use(express.json());
