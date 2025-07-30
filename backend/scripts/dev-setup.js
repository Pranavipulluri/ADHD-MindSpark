#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for better console output
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

async function checkPrerequisites() {
  log.title('🔍 Checking Prerequisites');
  
  // Check Node.js version
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    
    if (majorVersion >= 16) {
      log.success(`Node.js ${nodeVersion} is installed`);
    } else {
      log.error(`Node.js version ${nodeVersion} is too old. Please upgrade to v16 or higher.`);
      process.exit(1);
    }
  } catch (error) {
    log.error('Node.js is not installed or not in PATH');
    process.exit(1);
  }

  // Check npm
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    log.success(`npm ${npmVersion} is installed`);
  } catch (error) {
    log.error('npm is not installed or not in PATH');
    process.exit(1);
  }

  // Check PostgreSQL
  try {
    const pgVersion = execSync('psql --version', { encoding: 'utf8' }).trim();
    log.success(`${pgVersion} is installed`);
  } catch (error) {
    log.warning('PostgreSQL is not installed or not in PATH. Please install PostgreSQL 13 or higher.');
  }
}

async function createEnvironmentFile() {
  log.title('📝 Setting up Environment Variables');
  
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  try {
    // Check if .env already exists
    await fs.access(envPath);
    log.warning('.env file already exists. Skipping creation.');
    return;
  } catch {
    // .env doesn't exist, create it
  }

  try {
    // Check if .env.example exists
    const envExample = await fs.readFile(envExamplePath, 'utf8');
    await fs.writeFile(envPath, envExample);
    log.success('Created .env file from .env.example');
    log.info('Please update the .env file with your actual configuration values.');
  } catch (error) {
    // Create a basic .env file
    const basicEnv = `# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mindspark_db
DB_USER=postgres
DB_PASSWORD=your_password_here
TEST_DB_NAME=mindspark_test_db

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3001
NODE_ENV=development

# Email Configuration (Optional for development)
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASSWORD=
EMAIL_FROM=

# File Upload Configuration
UPLOAD_MAX_SIZE=5242880
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,application/pdf

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:5173
`;
    
    await fs.writeFile(envPath, basicEnv);
    log.success('Created basic .env file');
    log.warning('Please update the database password and other configuration values in .env');
  }
}

async function installDependencies() {
  log.title('📦 Installing Dependencies');
  
  try {
    log.info('Installing production dependencies...');
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    log.success('Dependencies installed successfully');
  } catch (error) {
    log.error('Failed to install dependencies');
    log.error(error.message);
    process.exit(1);
  }
}

async function createDirectories() {
  log.title('📁 Creating Required Directories');
  
  const directories = [
    'logs',
    'uploads/documents',
    'uploads/avatars',
    'uploads/temp'
  ];

  const baseDir = path.join(__dirname, '..');
  
  for (const dir of directories) {
    const fullPath = path.join(baseDir, dir);
    try {
      await fs.mkdir(fullPath, { recursive: true });
      log.success(`Created directory: ${dir}`);
    } catch (error) {
      if (error.code !== 'EEXIST') {
        log.error(`Failed to create directory ${dir}: ${error.message}`);
      }
    }
  }
}

async function setupDatabase() {
  log.title('🗄️ Database Setup');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (query) => new Promise(resolve => readline.question(query, resolve));

  try {
    log.info('Would you like to run database migrations now?');
    log.warning('Make sure PostgreSQL is running and you have created the database.');
    
    const answer = await question('Run migrations now? (y/N): ');
    
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      try {
        log.info('Running database migrations...');
        execSync('npm run migrate', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
        log.success('Database migrations completed');

        const seedAnswer = await question('Would you like to seed the database with sample data? (y/N): ');
        if (seedAnswer.toLowerCase() === 'y' || seedAnswer.toLowerCase() === 'yes') {
          log.info('Seeding database...');
          execSync('npm run seed', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
          log.success('Database seeded with sample data');
        }
      } catch (error) {
        log.error('Database setup failed. You can run migrations later with: npm run migrate');
        log.info('Make sure your database is running and credentials in .env are correct.');
      }
    } else {
      log.info('Skipping database setup. Run "npm run migrate" when ready.');
    }
  } catch (error) {
    log.error('Database setup interrupted');
  } finally {
    readline.close();
  }
}

async function displayFinalInstructions() {
  log.title('🎉 Setup Complete!');
  
  console.log(`${colors.green}Your MindSpark backend development environment is ready!${colors.reset}\n`);
  
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  console.log(`1. Update your ${colors.cyan}.env${colors.reset} file with correct database credentials`);
  console.log(`2. Make sure PostgreSQL is running`);
  console.log(`3. Create the database: ${colors.yellow}createdb mindspark_db${colors.reset}`);
  console.log(`4. Run migrations: ${colors.yellow}npm run migrate${colors.reset}`);
  console.log(`5. Seed the database: ${colors.yellow}npm run seed${colors.reset}`);
  console.log(`6. Start the development server: ${colors.yellow}npm run dev${colors.reset}\n`);
  
  console.log(`${colors.bright}Available commands:${colors.reset}`);
  console.log(`${colors.cyan}npm run dev${colors.reset}      - Start development server with hot reload`);
  console.log(`${colors.cyan}npm start${colors.reset}        - Start production server`);
  console.log(`${colors.cyan}npm test${colors.reset}         - Run test suite`);
  console.log(`${colors.cyan}npm run migrate${colors.reset}  - Run database migrations`);
  console.log(`${colors.cyan}npm run seed${colors.reset}     - Seed database with sample data`);
  console.log(`${colors.cyan}npm run lint${colors.reset}     - Run ESLint`);
  console.log(`${colors.cyan}npm run format${colors.reset}   - Format code with Prettier\n`);
  
  console.log(`${colors.magenta}Happy coding! 🚀${colors.reset}`);
}

async function main() {
  try {
    console.log(`${colors.bright}${colors.magenta}MindSpark Backend Development Setup${colors.reset}`);
    console.log(`${colors.cyan}Setting up your development environment...${colors.reset}\n`);

    await checkPrerequisites();
    await createEnvironmentFile();
    await installDependencies();
    await createDirectories();
    await setupDatabase();
    await displayFinalInstructions();
    
  } catch (error) {
    log.error('Setup failed with error:');
    console.error(error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  main();
}

module.exports = { main };