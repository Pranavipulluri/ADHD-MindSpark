#!/usr/bin/env node

// scripts/setup-project.js
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bright}${colors.magenta}${msg}${colors.reset}\n`)
};

async function setupProject() {
  log.title('🚀 MindSpark Backend Project Setup');
  
  try {
    // Check if all files exist
    log.info('Verifying project structure...');
    
    const requiredFiles = [
      'package.json',
      'server.js',
      '.env.example',
      'config/index.js',
      'config/database.js',
      'middleware/auth.js',
      'middleware/validation.js',
      'middleware/errorHandler.js',
      'middleware/security.js',
      'middleware/healthCheck.js',
      'routes/auth.js',
      'routes/tasks.js',
      'routes/games.js',
      'services/emailService.js',
      'services/notificationService.js',
      'services/progressService.js',
      'utils/logger.js',
      'utils/validation.js',
      'utils/emailTemplates.js',
      'database/schema.sql',
      'scripts/migrate.js',
      'scripts/seed.js',
      'jest.config.js',
      'Dockerfile',
      'docker-compose.yml'
    ];

    const missingFiles = [];
    for (const file of requiredFiles) {
      const filePath = path.join(__dirname, '..', file);
      try {
        await fs.access(filePath);
      } catch {
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      log.warning(`Missing files: ${missingFiles.join(', ')}`);
    } else {
      log.success('All required files are present');
    }

    // Create .env file if it doesn't exist
    const envPath = path.join(__dirname, '..', '.env');
    try {
      await fs.access(envPath);
      log.info('.env file already exists');
    } catch {
      const envExamplePath = path.join(__dirname, '..', '.env.example');
      const envExample = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envExample);
      log.success('Created .env file from .env.example');
      log.warning('Please update the .env file with your actual configuration values');
    }

    // Install dependencies
    log.info('Installing dependencies...');
    try {
      execSync('npm install', { 
        stdio: 'inherit', 
        cwd: path.join(__dirname, '..') 
      });
      log.success('Dependencies installed successfully');
    } catch (error) {
      log.error('Failed to install dependencies');
      throw error;
    }

    // Run tests to verify setup
    log.info('Running tests to verify setup...');
    try {
      execSync('npm test -- --passWithNoTests', { 
        stdio: 'inherit', 
        cwd: path.join(__dirname, '..') 
      });
      log.success('Tests passed');
    } catch (error) {
      log.warning('Some tests failed, but setup can continue');
    }

    // Display final instructions
    log.title('🎉 Setup Complete!');
    
    console.log(`${colors.green}Your MindSpark backend is ready!${colors.reset}\n`);
    
    console.log(`${colors.bright}Next steps:${colors.reset}`);
    console.log(`1. Update your ${colors.cyan}.env${colors.reset} file with correct values`);
    console.log(`2. Start PostgreSQL server`);
    console.log(`3. Create database: ${colors.yellow}createdb mindspark_db${colors.reset}`);
    console.log(`4. Run migrations: ${colors.yellow}npm run migrate${colors.reset}`);
    console.log(`5. Seed database: ${colors.yellow}npm run seed${colors.reset}`);
    console.log(`6. Start development server: ${colors.yellow}npm run dev${colors.reset}\n`);
    
    console.log(`${colors.bright}Docker setup (alternative):${colors.reset}`);
    console.log(`1. Update ${colors.cyan}docker-compose.yml${colors.reset} with your passwords`);
    console.log(`2. Run: ${colors.yellow}docker-compose up -d${colors.reset}\n`);
    
    console.log(`${colors.magenta}Happy coding! 🚀${colors.reset}`);

  } catch (error) {
    log.error('Setup failed:');
    console.error(error);
    process.exit(1);
  }
}

if (require.main === module) {
  setupProject();
}

module.exports = { setupProject };
