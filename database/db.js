const mysql = require('mysql2/promise');

async function startApp() {
  try {
    global.connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: 'adminadmin',
      database: 'shopify',
    });
    console.log('Database connection established');
  } catch (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  }
}

startApp();

