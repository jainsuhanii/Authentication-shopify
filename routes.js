const express = require('express');
const router = express.Router();
const { verifyJwt, token } = require('./middlewares/auth');
const { install, redirect } = require('./controllers/authController');


const { createCustomer, updateCustomer, deleteCustomer, getAllCustomers } = require('./controllers/customerController');
const { createAddress, updateAddress, deleteAddress, getAllAddresses } = require('./controllers/addressController');
const { createProduct, updateProduct, deleteProduct, getAllProducts } = require('./controllers/productController');
const { createOrder, cancelOrder, getOrder } = require('./controllers/orderController');
const { refundOrder, calculateRefund } = require('./controllers/refundController');
const { createTransaction } = require('./controllers/transactionController');
const { createFulfillment } = require('./controllers/fulfillmentController');

const { createGiftCard } = require('./controllers/giftcardsController');
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

router.post('/order', verifyJwt, createOrder);
router.post('/order/:id', verifyJwt, cancelOrder);
router.get('/order/:id', verifyJwt, getOrder);


router.post('/transaction/:id', verifyJwt, createTransaction);
router.post('/fulfillment', verifyJwt, createFulfillment);
router.post('/refund',verifyJwt, refundOrder);
router.post('/calculate/refund', verifyJwt, calculateRefund);

router.post('/giftcards', verifyJwt, createGiftCard);
module.exports = router;