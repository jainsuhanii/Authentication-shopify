const startApp = require ('./database/db');
const express = require('express');
const app = express();
app.use(express.json());
const routes = require('./routes');
app.use(routes);

require('dotenv').config();
const crypto = require('crypto');
 const router = require('./controllers/createCustomer');  
port = 3000;


app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});

module.exports=app;
app.use(express.json());
