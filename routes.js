// main file
const express = require('express');
const router = express();
const addressRoutes = require('./addressRoutes');
const customerRouter=require("../models/customer");
const { verifyJwt } = require('./models/customer');

router.use('/address',verifyJwt, addressRoutes);
router.use('/customers',verifyJwt, customerRouter);
router.use('/customers/:id',verifyJwt, customerRouter);
router.use('/customers/:id/addresses',verifyJwt, addressRoutes);

module.exports = router;