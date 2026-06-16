# Deployment Guide

This guide details the steps to deploy the Student Attendance Portal to cloud platforms (AWS/Azure) and migrate the database to a production-grade relational database like MySQL or PostgreSQL.

---

## 1. Local Production Run

To run the application in a production-ready state locally:
1. Ensure Node.js (v18+) is installed.
2. Install production dependencies only:
   ```bash
   npm install --omit=dev
   ```
3. Set the environment variables in `.env`:
   ```env
   NODE_ENV=production
   PORT=80
   JWT_SECRET=your_high_entropy_production_secret_here
   DATABASE_URL=./server/config/attendance.db
   ```
4. Start the server:
   ```bash
   npm start
   ```

---

## 2. Database Migration (MySQL or PostgreSQL)

To migrate from the default local SQLite database to a centralized database:

### Step 1: Install Driver
Install the database adapter for Node.js:
- For PostgreSQL: `npm install pg`
- For MySQL: `npm install mysql2`

### Step 2: Update database adapter (`server/config/db.js`)
Replace the SQLite instance with a connection pool. For example, using PostgreSQL:
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // e.g., postgresql://dbuser:secret@localhost:5432/mydb
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});
module.exports = pool;
```

### Step 3: Run schemas
Export the table schemas from the SQLite database structure and execute them directly against your target PostgreSQL or MySQL server.

---

## 3. Deploying to AWS (Elastic Beanstalk / ECS)

### Method A: AWS Elastic Beanstalk (Recommended for fast setup)
1. **Prepare ZIP**: Create a ZIP archive of the project, excluding `node_modules` and the local `.db` file. Make sure to include `package.json`, `.env` (configured for AWS), `/server`, and `/public`.
2. **Launch Application**: Go to the Elastic Beanstalk console, click **Create Application**, choose **Node.js** as the platform.
3. **Configure Environment variables**: In the Elastic Beanstalk settings, set configurations under "Software":
   - `PORT` = `8080` (AWS routes public port 80/443 traffic here automatically)
   - `JWT_SECRET` = A strong, unique string
   - `DATABASE_URL` = Connection string targeting AWS RDS (PostgreSQL/MySQL)
4. **Deploy**: Upload the ZIP file and deploy.

### Method B: Amazon RDS Configuration
1. Spin up a PostgreSQL database instance in your VPC.
2. Allow incoming traffic from your Elastic Beanstalk Security Group to the RDS instance Security Group on port `5432` or `3306`.
3. Provide the connection details in the Beanstalk configuration.

---

## 4. Deploying to Azure (App Service)

### Steps to Deploy via Git / GitHub Actions:
1. **Create Azure App Service**:
   - Web App Name: `school-attendance-portal`
   - Publish: **Code**
   - Runtime Stack: **Node 18 LTS**
   - Operating System: **Linux**
2. **Database Integration**:
   - Provision an "Azure Database for PostgreSQL flexible server".
   - Configure Azure Firewall settings to allow Azure services to access the database server.
3. **Configure Settings**:
   - Go to App Service -> **Configuration** -> **Application settings** and add:
     - `PORT` = `8080`
     - `JWT_SECRET` = `<your_jwt_secret>`
     - `DATABASE_URL` = `<azure_postgres_conn_string>`
4. **Deployment**:
   - Set up Deployment Center using Local Git or link your GitHub repo.
   - Azure App Service automatically runs `npm install` and `npm start`.

---

## 5. Security & Scaling Best Practices

- **SSL/TLS Configuration**: Configure HTTPS via AWS ACM or Azure SSL Bindings. The Express router automatically forwards HTTPS headers when running behind proxies.
- **JWT Expired Tokens**: Set JWT expiration to a short period (e.g., `2h` or `1d`). Store JWT inside a secure `HttpOnly`, `SameSite=Strict` cookie or local storage with strict XSS measures.
- **Scale out**: Enable auto-scaling (e.g. AWS Auto Scaling group). Because session state is stateless (JWT), you can run multiple instances of the server behind an Application Load Balancer (ALB) without needing sticky sessions.
- **Audit Logs**: Regularly export and clear logs. For high-throughput setups, send logs to cloud systems (AWS CloudWatch or Azure Monitor) instead of storing them directly in the application database.
