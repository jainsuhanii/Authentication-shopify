const jwt = require('jsonwebtoken');
const db = require('../database/db');
const secretKey = "suhani123";

const token = async (req, res, next) => {
  const { shop } = req.body;
  const payload = {
    shop: shop
  };
  const token = jwt.sign(payload, secretKey, { expiresIn: '1h' })
  res.status(200).json({ token })
};

async function verifyJwt(req, res, next) {
  const token = req.headers.authorization;
  if (!token) {
    return res.status(401).json({ message: 'JWT token is required' });
  }
  try {
    const decoded = jwt.verify(token, secretKey);
    const shop = decoded.shop;
    let store = await db.Stores.findOne({ where: { name: shop } });
    if (store) {
      store = JSON.parse(JSON.stringify(store));
      req.result = store;
      req.shop = { ...store, shop };
      next();
    }
    // const query = `SELECT accessToken,id from store where name=${shop}`;
    // let [result] = await sequelize.query(query, [shop]);
    // if (!result?.length) throw new Error('No store found with the provided name');

    // req.result = result[0];
    // req.shop = { ...result[0], shop };
   
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(403).json({ message: 'Invalid token', error: err.message });
  }
}

module.exports.verifyJwt = verifyJwt;
module.exports.token = token;
