// const express = require('express');
// const router = express.Router();

// async function verifyJwt(req, res, next) {
//     const token = req.headers.authorization;
//     if (!token) {
//       return res.status(401).json({ message: 'JWT token is required' });
//     }
//     try {
//       const decoded = jwt.verify(token, secretKey);
//       const shop = decoded.shop;
//       console.log("jwt verified", decoded);
//       console.log('Database connection established');
  
//       const query = `SELECT accessToken,id from store where name='${shop}'`;
//       let [result] = await connection.query(query);
//       if (!result?.length) throw new Error('No store found with the provided name');
  
//       result = result[0];
//       req.shop = { ...result,shop };
//       next();
//     } catch (err) {
//       console.error('JWT verification error:', err.message);
//       return res.status(403).json({ message: 'Invalid token', error: err.message });
//     }
//   }
//   module.exports = {
//     verifyJwt,
//     router
//   };