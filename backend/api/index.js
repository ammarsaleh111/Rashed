import app from '../src/app.js';
import { connectDatabase } from '../src/config/db.js';

// Vercel loads this module once per warm serverless instance.
// Initializing the pool here avoids per-request reconnects.
await connectDatabase();

export default app;
