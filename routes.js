const express = require('express');
const router = express.Router();
const { verifyJwt } = require('./middlewares/auth');
const { token } = require('./controllers/createCustomer');
const { install } = require('./controllers/auth2.0');
const { redirect } = require('./controllers/auth2.0');

const { createCustomerAndAddress} = require('./controllers/createCustomer');
const { updateCustomerAndAddress } = require('./controllers/updateCustomer');
const { createProduct } = require('./controllers/createProduct');
const { updateProduct } = require('./controllers/updateProduct');


router.post('/api/token', token);

router.get('/install', install);
router.get('/api/auth/redirect/callback', redirect);

router.post('/customers',verifyJwt, createCustomerAndAddress );
router.put('/update/customer/:customer_id',verifyJwt, updateCustomerAndAddress);


router.post('/products',verifyJwt, createProduct);
router.put('/products/:productId', verifyJwt, updateProduct);

module.exports = router;