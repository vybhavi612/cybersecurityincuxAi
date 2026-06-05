# Quick Start Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

## Installation & Setup (5 minutes)

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup PostgreSQL Database

Ensure PostgreSQL is running. Create a database:
```sql
CREATE DATABASE student_analytics;
```

### 3. Configure Environment
Edit `.env.local` with your database credentials:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/student_analytics"
JWT_SECRET="generate_a_random_32_char_string_here"
NEXT_PUBLIC_API_URL="http://localhost:3000"
```

### 4. Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Create database schema
npx prisma migrate dev --name init

# Seed with 50 demo students
npm run seed
```

### 5. Start Development Server
```bash
npm run dev
```

Visit http://localhost:3000

## Demo Login Credentials

### Admin Account
- **Email**: admin@example.com
- **Password**: password123

### Student Accounts
- **Email**: student1@example.com through student50@example.com
- **Password**: password123

## Project Structure Overview

- `/src/app` - Next.js pages and API routes
- `/src/components` - React components
- `/src/lib` - Utilities (auth, calculations, middleware)
- `/prisma/schema.prisma` - Database schema
- `/prisma/seed.ts` - Demo data generation

## Key Features Implemented

✅ JWT Authentication with RBAC  
✅ Student Dashboard with KPIs and analytics  
✅ Admin Dashboard with enterprise stats  
✅ Attendance tracking and marking  
✅ Productivity score calculation (0-100)  
✅ Achievement badge system  
✅ At-risk student detection  
✅ Leaderboard  
✅ Activity heatmap  
✅ Seed data for 50 students (6 months of data)  
✅ Dark mode support  
✅ Responsive design  

## Available NPM Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm start               # Start production server
npm run lint            # Run linter
npm run type-check      # Check TypeScript types
npx prisma studio      # Open Prisma Studio (database UI)
npm run seed            # Reseed database
```

## API Routes

### Authentication
- POST /api/auth/login - Login
- POST /api/auth/signup - Register

### Data
- GET/POST /api/students - Student management
- GET/POST /api/attendance - Attendance records
- GET/POST /api/activities - Activities
- GET/POST /api/achievements - Achievements
- GET /api/analytics - Dashboard stats

## Troubleshooting

**PostgreSQL Connection Error**
- Ensure PostgreSQL service is running
- Check DATABASE_URL in .env.local
- Verify database exists: `psql -l`

**Prisma Migration Issues**
- Reset database: `npx prisma migrate reset`
- Re-seed: `npm run seed`

**Port 3000 Already in Use**
```bash
npm run dev -- -p 3001  # Use port 3001 instead
```

## Database Migrations

When schema changes:
```bash
npx prisma migrate dev --name description_of_change
```

## Next Steps

1. Customize color scheme in tailwind.config.js
2. Add more analytics views
3. Implement PDF report generation
4. Setup email notifications
5. Deploy to Vercel

See README.md for comprehensive documentation.
