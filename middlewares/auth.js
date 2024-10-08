const jwt = require('jsonwebtoken');
const secretKey= "suhani123";

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
      console.log("jwt verified", decoded);
      const query = 'SELECT accessToken,id from store where name=?';
      let [result] = await global.connection.query(query, [shop]);
      if (!result?.length) throw new Error('No store found with the provided name');
  
      req.result = result[0];
      req.shop = { ...result[0], shop };
      next();
    } catch (err) {
      console.error('JWT verification error:', err.message);
      return res.status(403).json({ message: 'Invalid token', error: err.message });
    }
  }

  module.exports.verifyJwt = verifyJwt;
  module.exports.token = token;
