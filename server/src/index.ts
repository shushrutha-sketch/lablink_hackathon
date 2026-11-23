import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import { runMigrations } from './db/migrate.js';

const PORT = process.env.PORT || 5000;

// Ensure database schema is initialized
runMigrations();

app.listen(PORT, () => {
  console.log(`🚀 LabLink Server running on http://localhost:${PORT}`);
  console.log(`📋 API Health: http://localhost:${PORT}/api/health`);
  console.log(`🔑 Demo Personas: http://localhost:${PORT}/api/auth/demo-users`);
});
