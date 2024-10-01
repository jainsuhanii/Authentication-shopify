const mysql = require('mysql2/promise'); 
async function createConnection() {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'adminadmin',
      database: 'shopify',
    });
    console.log('Connected to MySQL');
    return connection;
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
    throw err;
  }
}

module.exports = createConnection; 
