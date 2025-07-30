// middleware/healthCheck.js
const { Pool } = require('pg');
const config = require('../config');

// Health check endpoint
const healthCheck = async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.server.environment,
    version: process.env.npm_package_version || '1.0.0',
    node_version: process.version,
    memory: process.memoryUsage(),
    services: {}
  };

  try {
    // Check database connection
    const pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl
    });

    const start = Date.now();
    await pool.query('SELECT 1');
    const end = Date.now();
    
    health.services.database = {
      status: 'healthy',
      responseTime: `${end - start}ms`
    };
    
    await pool.end();

  } catch (error) {
    health.status = 'unhealthy';
    health.services.database = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Check file system (uploads directory)
  try {
    const fs = require('fs');
    const path = require('path');
    const uploadsDir = path.join(process.cwd(), 'uploads');
    
    fs.accessSync(uploadsDir, fs.constants.R_OK | fs.constants.W_OK);
    health.services.filesystem = {
      status: 'healthy',
      uploadsDir: uploadsDir
    };
  } catch (error) {
    health.status = 'unhealthy';
    health.services.filesystem = {
      status: 'unhealthy',
      error: error.message
    };
  }

  // Set response status based on overall health
  const statusCode = health.status === 'healthy' ? 200 : 503;
  
  res.status(statusCode).json(health);
};

// Readiness probe (for Kubernetes)
const readinessCheck = async (req, res) => {
  try {
    // Check if the application is ready to serve requests
    const pool = new Pool({
      connectionString: config.database.url,
      ssl: config.database.ssl
    });

    await pool.query('SELECT 1');
    await pool.end();

    res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};

// Liveness probe (for Kubernetes)
const livenessCheck = (req, res) => {
  // Simple check to verify the application is running
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

module.exports = {
  healthCheck,
  readinessCheck,
  livenessCheck
};
