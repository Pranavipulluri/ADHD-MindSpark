#!/usr/bin/env node

// setup.js - Root project setup script
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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

function runCommand(command, cwd, description) {
  try {
    log.info(description);
    execSync(command, { 
      stdio: 'inherit', 
      cwd: cwd || process.cwd()
    });
    log.success('✓ Done');
  } catch (error) {
    log.error(`Failed: ${description}`);
    throw error;
  }
}

async function setupProject() {
  log.title('🚀 MindSpark Full Stack Setup');
  
  const rootDir = __dirname;
  const backendDir = path.join(rootDir, 'backend');
  const frontendDir = path.join(rootDir, 'frontend');

  try {
    // Check if directories exist
    if (!fs.existsSync(backendDir)) {
      log.error('Backend directory not found!');
      process.exit(1);
    }
    
    if (!fs.existsSync(frontendDir)) {
      log.error('Frontend directory not found!');
      process.exit(1);
    }

    log.title('📦 Setting up Backend');
    
    // Install backend dependencies
    runCommand('npm install', backendDir, 'Installing backend dependencies...');
    
    // Create backend .env file if it doesn't exist
    const backendEnvPath = path.join(backendDir, '.env');
    const backendEnvExamplePath = path.join(backendDir, '.env.example');
    
    if (!fs.existsSync(backendEnvPath) && fs.existsSync(backendEnvExamplePath)) {
      fs.copyFileSync(backendEnvExamplePath, backendEnvPath);
      log.success('Created backend .env file');
      log.warning('Please update backend/.env with your database credentials');
    }

    log.title('🎨 Setting up Frontend');
    
    // Install frontend dependencies
    runCommand('npm install', frontendDir, 'Installing frontend dependencies...');
    
    // Create frontend .env file if it doesn't exist
    const frontendEnvPath = path.join(frontendDir, '.env');
    const frontendEnvExamplePath = path.join(frontendDir, '.env.example');
    
    if (!fs.existsSync(frontendEnvPath) && fs.existsSync(frontendEnvExamplePath)) {
      fs.copyFileSync(frontendEnvExamplePath, frontendEnvPath);
      log.success('Created frontend .env file');
    }

    log.title('🎉 Setup Complete!');
    
    console.log(`${colors.green}Your MindSpark application is ready!${colors.reset}\n`);
    
    console.log(`${colors.bright}Next steps:${colors.reset}`);
    console.log(`\n${colors.cyan}Database Setup:${colors.reset}`);
    console.log(`1. Make sure PostgreSQL is running`);
    console.log(`2. Update backend/.env with your database credentials`);
    console.log(`3. Create database: ${colors.yellow}createdb mindspark_db${colors.reset}`);
    console.log(`4. Run migrations: ${colors.yellow}cd backend && npm run migrate${colors.reset}`);
    console.log(`5. Seed database: ${colors.yellow}cd backend && npm run seed${colors.reset}`);
    
    console.log(`\n${colors.cyan}Development:${colors.reset}`);
    console.log(`1. Start backend: ${colors.yellow}cd backend && npm run dev${colors.reset}`);
    console.log(`2. Start frontend: ${colors.yellow}cd frontend && npm run dev${colors.reset}`);
    console.log(`3. Open http://localhost:5173 in your browser`);
    
    console.log(`\n${colors.cyan}Docker (Alternative):${colors.reset}`);
    console.log(`1. Update backend/docker-compose.yml with your passwords`);
    console.log(`2. Run: ${colors.yellow}cd backend && npm run docker:up${colors.reset}`);
    console.log(`3. Start frontend: ${colors.yellow}cd frontend && npm run dev${colors.reset}`);
    
    console.log(`\n${colors.cyan}Testing:${colors.reset}`);
    console.log(`• Backend tests: ${colors.yellow}cd backend && npm test${colors.reset}`);
    console.log(`• Frontend lint: ${colors.yellow}cd frontend && npm run lint${colors.reset}`);
    
    console.log(`\n${colors.magenta}Happy coding! 🚀${colors.reset}`);

  } catch (error) {
    log.error('Setup failed:');
    console.error(error.message);
    process.exit(1);
  }
}

// Run setup if this script is executed directly
if (require.main === module) {
  setupProject();
}

module.exports = { setupProject };
