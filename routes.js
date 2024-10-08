const express = require('express');
const router = express.Router();
const { verifyJwt, token } = require('./middlewares/auth');
const { install, redirect } = require('./controllers/authController');


const { createCustomer, updateCustomer, deleteCustomer, getAllCustomers } = require('./controllers/customerController');
const { createAddress, updateAddress, deleteAddress, getAllAddresses } = require('./controllers/addressController');
const { createProduct, updateProduct, deleteProduct, getAllProducts } = require('./controllers/productController');


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