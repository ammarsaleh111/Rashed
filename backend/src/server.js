import 'dotenv/config';

import app from './app.js';
import { connectDatabase } from './config/db.js';

const port = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(port, () => {
      console.log(`Rashed backend listening on port ${port}`);
    });
  } catch (error) {
    console.error('Failed to start the backend server.');
    console.error(error.message);
    process.exit(1);
  }
};

startServer();
