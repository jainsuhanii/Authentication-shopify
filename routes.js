const express = require('express');
const router = express.Router();
// const addressRoutes = require('./addressRoutes');
// const customerRouter=require("../models/customer");
const { verifyJwt } = require('./middlewares/auth');
const { createCustomer, updateCustomer } = require('./models/customer');
const { createAddress, updateAddress } = require('./models/address');
const { createProduct } = require('./models/createProduct');
const { updateProduct } = require('./models/updateProduct');

router.post('/address',verifyJwt, createAddress );
router.use('/customers',verifyJwt, createCustomer);
router.use('/customers/:id',verifyJwt, updateCustomer);
router.use('/customers/:id/addresses',verifyJwt, updateAddress);


router.post('/products',verifyJwt, createProduct);
router.put('/products/:productId', verifyJwt, updateProduct);

module.exports = router;