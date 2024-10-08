const express = require('express');
const router = express.Router();
const { verifyJwt } = require('./middlewares/auth');
const { token } = require('./controllers/createCustomer');
const { install } = require('./controllers/auth2.0');
const { redirect } = require('./controllers/auth2.0');


const { createCustomer} = require('./controllers/createCustomer');
const { createAddress } = require ('./controllers/createAddress');
const { updateCustomer} = require('./controllers/updateCustomer');
const { updateAddress } = require('./controllers/updateAddress');
const { createProduct } = require('./controllers/createProduct');
const { updateProduct } = require('./controllers/updateProduct');
const { getAllCustomers } = require ('./controllers/getCustomer');
const { getAllAddresses } = require('./controllers/getAddresses');
const { getAllProducts } = require('./controllers/getProducts');
const { deleteProduct } = require('./controllers/deleteProduct');
const { deleteCustomer } = require('./controllers/deleteCustomer');
const { deleteAddress } = require('./controllers/deleteAddress');

router.post('/api/token', token);

router.get('/install', install);
router.get('/api/auth/redirect/callback', redirect);

router.post('/customers',verifyJwt, createCustomer );
router.post('/address/:id', verifyJwt, createAddress);

router.put('/update/customer/:id',verifyJwt, updateCustomer);
router.put('/update/:customer_id/:address_id', verifyJwt, updateAddress);


router.post('/products',verifyJwt, createProduct);
router.put('/products/:productId', verifyJwt, updateProduct);

router.get('/customers', verifyJwt, getAllCustomers);
router.get('/addresses', verifyJwt, getAllAddresses);
router.get('/products', verifyJwt, getAllProducts);

router.delete('/products/:product_id', verifyJwt, deleteProduct);
router.delete('/customers/:customer_id', verifyJwt, deleteCustomer);
router.delete('/customers/:customer_id/:address_id',verifyJwt, deleteAddress);


module.exports = router;