import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Neon-specific configuration for serverless environments (Node.js/Edge)
// This allows the driver to use WebSockets for connections if needed
if (typeof window === 'undefined') {
  neonConfig.webSocketConstructor = ws;
}

const globalForPg = global as unknown as { pgPool: Pool };

export const db = globalForPg.pgPool || new Pool({
  connectionString: process.env.DATABASE_URL,
  // Add SSL for Neon if not provided in the connection string
  ssl: true,
});

if (process.env.NODE_ENV !== 'production') globalForPg.pgPool = db;
