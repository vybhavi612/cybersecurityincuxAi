<!-- Student Productivity & Attendance Analytics Platform - Project Setup -->

# Student Productivity & Attendance Analytics Platform

A production-ready full-stack web application for monitoring student attendance, productivity, engagement, and progress.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Recharts
- **Backend**: Next.js API Routes with TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT with Role-Based Access Control
- **Deployment**: Vercel-ready

## Setup Instructions

1. Install dependencies: `npm install`
2. Set up PostgreSQL database and update `.env.local`
3. Generate Prisma client: `npx prisma generate`
4. Run migrations: `npx prisma migrate dev`
5. Seed database: `npm run seed`
6. Start development server: `npm run dev`

## Project Features

- **Admin Dashboard**: Enterprise analytics, student management, at-risk detection
- **Student Dashboard**: KPIs, activity heatmap, productivity tracking, achievements
- **Authentication**: JWT-based with protected routes
- **Notifications**: System for attendance and achievement alerts
- **PDF Reports**: Generate monthly student reports
- **Leaderboard**: Student ranking by productivity
- **Seed Data**: 50 students with 6 months of realistic data

## Environment Variables

Create `.env.local`:
```
DATABASE_URL=postgresql://user:password@localhost:5432/student_analytics
JWT_SECRET=your_jwt_secret_key_here
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## Database Setup

PostgreSQL required. Connection string in `.env.local` as `DATABASE_URL`.

## Project Status

- [x] Requirements clarified
- [ ] Project scaffolded
- [ ] Database configured
- [ ] Authentication implemented
- [ ] Dashboards built
- [ ] Testing complete
- [ ] Documentation finalized
