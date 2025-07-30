# Database Setup Instructions

## Quick Start with SQLite (No Installation Required)

If you want to get started quickly without installing PostgreSQL, you can use SQLite:

### 1. Update Backend Configuration

In `backend/.env`, change the database URL to:
```env
DATABASE_URL=sqlite:./database.sqlite
```

### 2. Install SQLite Dependencies
```cmd
cd backend
npm install sqlite3
```

### 3. Run Migrations
```cmd
cd backend
npm run migrate
npm run seed
```

## Production Setup with PostgreSQL

### Windows Installation:

1. **Download PostgreSQL**:
   - Visit: https://www.postgresql.org/download/windows/
   - Download the installer for Windows
   - Run installer as Administrator

2. **Installation Settings**:
   - Keep default installation directory
   - Select components: PostgreSQL Server, pgAdmin 4, Command Line Tools
   - Set port: 5432 (default)
   - Set password for postgres superuser (remember this!)
   - Keep default locale

3. **Add to PATH** (if not done automatically):
   - Add `C:\Program Files\PostgreSQL\15\bin` to your system PATH
   - Restart Command Prompt

4. **Create Database**:
   ```cmd
   # Open Command Prompt as Administrator
   createdb -U postgres mindspark_db
   # Enter password when prompted
   ```

5. **Update .env file**:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mindspark_db
   ```

### Docker Setup:

1. **Install Docker Desktop**:
   - Download from: https://www.docker.com/products/docker-desktop/
   - Install and start Docker Desktop

2. **Update docker-compose.yml password**:
   - Edit `backend/docker-compose.yml`
   - Change `POSTGRES_PASSWORD: your_password_here` to a secure password

3. **Start Database**:
   ```cmd
   cd backend
   docker-compose up -d db
   ```

4. **Update .env file**:
   ```env
   DATABASE_URL=postgresql://postgres:your_password@localhost:5432/mindspark_db
   ```

## Verification

Test your database connection:
```cmd
cd backend
npm run migrate
```

If successful, you'll see migration tables created.

## Next Steps

Once database is set up:
```cmd
# From project root
npm run dev
```

This will start both backend (port 3000) and frontend (port 5173).
