# Student Productivity & Attendance Analytics Platform

A production-ready full-stack web application for monitoring student attendance, productivity, engagement, and progress across educational institutions and training centers.

## 🎯 Overview

This platform provides real-time insights into student performance through comprehensive dashboards, analytics, and reporting. It supports two primary roles:

- **Admins**: Enterprise-level analytics, student management, and at-risk detection
- **Students**: Personal dashboards, attendance tracking, productivity scoring, and achievement badges

## 🚀 Tech Stack

### Frontend
- **Next.js 15** (App Router) - Modern React framework
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - Component library
- **Recharts** - Data visualization
- **React Calendar Heatmap** - Activity tracking visualization
- **Zustand** - State management
- **SWR** - Data fetching

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **TypeScript** - Type-safe backend

### Database
- **PostgreSQL** - Robust relational database
- **Prisma ORM** - Database access and migrations

### Authentication & Security
- **JWT** - Secure token-based authentication
- **bcryptjs** - Password hashing
- **Role-Based Access Control (RBAC)**

### Additional Tools
- **jsPDF** - PDF report generation
- **html2canvas** - Screenshot/PDF conversion
- **Axios** - HTTP client
- **date-fns** - Date manipulation

## 📋 Database Schema

### User
```prisma
- id (String, @id)
- email (String, @unique)
- name (String)
- password (String)
- role (Role: ADMIN | STUDENT)
- createdAt (DateTime)
- updatedAt (DateTime)
```

### Attendance
```prisma
- id (String, @id)
- studentId (String, @fk)
- date (DateTime)
- loginTime (DateTime?)
- logoutTime (DateTime?)
- duration (Int?, in minutes)
- status (AttendanceStatus: PRESENT | ABSENT | LATE | EXCUSED)
- createdAt (DateTime)
- updatedAt (DateTime)
```

### Activity
```prisma
- id (String, @id)
- studentId (String, @fk)
- activityType (ActivityType)
- description (String?)
- points (Int, default: 0)
- createdAt (DateTime)
```

Activity Types: LOGIN, LOGOUT, ATTENDANCE_MARKED, TASK_COMPLETED, ASSIGNMENT_SUBMITTED, MODULE_COMPLETED, CODE_SUBMITTED, DISCUSSION_PARTICIPATED

### Achievement
```prisma
- id (String, @id)
- studentId (String, @fk)
- title (String)
- description (String?)
- badge (String)
- earnedAt (DateTime)
- createdAt (DateTime)
```

### Report
```prisma
- id (String, @id)
- studentId (String, @fk)
- month (DateTime)
- productivityScore (Float)
- attendancePercent (Float)
- taskCompletionRate (Float)
- streakDays (Int)
- totalActivities (Int)
- achievementsCount (Int)
- summary (String?)
- recommendations (String?)
- generatedAt (DateTime)
- createdAt (DateTime)
```

### Notification
```prisma
- id (String, @id)
- userId (String, @fk)
- title (String)
- message (String)
- type (NotificationType)
- read (Boolean)
- createdAt (DateTime)
- updatedAt (DateTime)
```

## 📊 Productivity Score Calculation

The productivity score (0-100) is calculated using a weighted formula:

```
Total Score = (Attendance × 0.40) + (Daily Activity × 0.25) + 
              (Task Completion × 0.25) + (Consistency/Streak × 0.10)
```

**Score Levels:**
- 85+: Excellent
- 70-84: Good
- 50-69: Average
- 30-49: Below Average
- <30: Poor

## 🎓 Key Features

### Student Dashboard
- **KPI Cards**: Attendance percentage, productivity score, current streak, longest streak
- **GitHub-Style Activity Heatmap**: Yearly contribution visualization
- **Productivity Scoring**: Detailed breakdown of scoring components
- **Activity Timeline**: Recent activities sorted by timestamp
- **Attendance Analytics**: Charts for daily, weekly, monthly attendance
- **Learning Streak Tracking**: Automatic streak calculation
- **Achievement System**: Badges for milestones

### Achievement Badges
- 🌅 **Early Bird**: Logged in before 8:30 AM
- ⭐ **Perfect Attendance**: No absences for a month
- 🔥 **7 Day Streak**: 7 days of consistent activity
- 🚀 **30 Day Streak**: 30 days of consistent activity
- 📚 **Consistent Learner**: Active learning for 3 months
- 🏆 **Top Performer**: Highest productivity score

### Admin Dashboard
- **Enterprise KPIs**: 
  - Total Students
  - Present Today
  - Average Attendance
  - Average Productivity
  - Top Performer
  - At-Risk Students Count

- **Student Management**: Add, edit, delete, search students
- **At-Risk Detection**: Flag students with:
  - Attendance < 75% OR
  - Productivity Score < 50 OR
  - No login for 5+ days

- **Leaderboard**: Rank students by productivity score
- **PDF Reports**: Generate monthly reports with charts and insights
- **Notifications**: System for attendance and achievement alerts

### Analytics & Insights
- Real-time dashboard updates
- Attendance trend analysis
- Productivity distribution
- Engagement metrics
- At-risk student identification
- Performance recommendations

## 🔐 Authentication

### Login
- Email and password-based authentication
- JWT token generation (7-day expiration)
- Secure password hashing with bcryptjs

### Protected Routes
- All dashboard routes require valid JWT
- Role-based route protection
- Admin routes restricted to ADMIN role
- Student routes restricted to STUDENT role

### Demo Credentials
```
Admin:
- Email: admin@example.com
- Password: password123

Student:
- Email: student@example.com
- Password: password123
```

## 📁 Project Structure

```
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # Home page (redirects)
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx            # Student dashboard
│   │   │   ├── attendance/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── achievements/page.tsx
│   │   ├── admin/
│   │   │   ├── page.tsx            # Admin dashboard
│   │   │   ├── students/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   └── analytics/page.tsx
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/route.ts
│   │       │   └── signup/route.ts
│   │       ├── students/route.ts
│   │       ├── attendance/route.ts
│   │       ├── activities/route.ts
│   │       ├── achievements/route.ts
│   │       ├── reports/route.ts
│   │       └── analytics/route.ts
│   ├── components/
│   │   ├── ui/
│   │   │   └── Card.tsx            # Card, StatCard, ProgressBar, Badge
│   │   ├── dashboard/
│   │   │   └── DashboardLayout.tsx
│   │   └── admin/
│   ├── lib/
│   │   ├── auth.ts                 # JWT, hashing, tokens
│   │   ├── calculations.ts         # Score calculations
│   │   ├── middleware.ts           # Auth middleware
│   │   └── prisma.ts               # Prisma client
│   ├── types/
│   │   └── index.ts                # TypeScript types
│   ├── hooks/
│   │   └── (custom hooks)
│   └── styles/
│       └── globals.css
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.ts                     # Seed script (50 students)
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 12+
- npm or yarn

### 1. Clone and Install

```bash
cd student-productivity-analytics
npm install
```

### 2. Environment Configuration

Create `.env.local`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/student_analytics"
JWT_SECRET="your_jwt_secret_key_here_min_32_chars"
NEXT_PUBLIC_API_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database with 50 students
npm run seed
```

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📝 Available Scripts

```bash
# Development
npm run dev              # Start dev server on :3000

# Production
npm run build            # Build for production
npm start               # Start production server

# Database
npx prisma generate    # Generate Prisma client
npx prisma migrate dev # Create and run migrations
npx prisma studio     # Open Prisma Studio
npm run seed           # Seed database with demo data

# Development tools
npm run lint           # Run ESLint
npm run type-check     # Check TypeScript types
```

## 🎨 UI/UX Design

### Design Principles
- **Modern Microsoft/GitHub Dashboard Style**
- Clean card-based layouts
- Professional color scheme
- Dark mode support
- Responsive design (mobile-first)
- Smooth animations and transitions

### Color Scheme
- **Primary**: Blue (#3b82f6)
- **Secondary**: Purple (#8b5cf6)
- **Success**: Green (#10b981)
- **Warning**: Yellow (#f59e0b)
- **Danger**: Red (#ef4444)

### Typography
- Clean, modern sans-serif fonts
- Hierarchical font sizes
- High contrast for accessibility

## 📊 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration

### Students
- `GET /api/students` - Get all students (Admin)
- `POST /api/students` - Create student (Admin)

### Attendance
- `GET /api/attendance` - Get attendance records
- `POST /api/attendance` - Mark attendance

### Activities
- `GET /api/activities` - Get activities
- `POST /api/activities` - Create activity

### Achievements
- `GET /api/achievements` - Get achievements
- `POST /api/achievements` - Create achievement

### Analytics
- `GET /api/analytics` - Get student/admin analytics
- `GET /api/analytics?type=admin` - Admin dashboard stats

## 📈 Seed Data

The seed script generates:
- **1 Admin** user (admin@example.com)
- **50 Students** with realistic data:
  - 6 months of attendance records
  - 100+ activities per student
  - Multiple achievements
  - Varied productivity scores
  - Realistic patterns (weekends off, occasional absences, etc.)

## 🔄 Data Flow

1. **User Authentication**: Login → JWT Token → localStorage
2. **Dashboard**: Fetch analytics → Display KPIs → Update real-time
3. **Attendance**: Student marks attendance → Activity created → Score updated
4. **Reports**: Admin requests report → PDF generated → Downloaded

## 🚀 Deployment

### Vercel (Frontend)
```bash
npm run build
# Connect GitHub repo to Vercel for auto-deployment
```

### Database (Supabase)
1. Create PostgreSQL database on Supabase
2. Update DATABASE_URL in environment variables
3. Run migrations: `npx prisma migrate deploy`

### Environment Variables
Update these on your deployment platform:
- DATABASE_URL
- JWT_SECRET
- NEXT_PUBLIC_API_URL

## 🧪 Testing

The application includes demo credentials for testing:

**Admin Account:**
- Email: admin@example.com
- Password: password123

**Student Account:**
- Email: student@example.com (any student1-50@example.com)
- Password: password123

## 📚 Future Enhancements

- [ ] OpenAI/Gemini API integration for AI insights
- [ ] Email notifications
- [ ] Parent/Guardian portal
- [ ] Real-time WebSocket updates
- [ ] Advanced filtering and search
- [ ] Student progression tracking
- [ ] Automated alert system
- [ ] Mobile app (React Native)
- [ ] Integration with external APIs
- [ ] Advanced analytics dashboards

## 🤝 Contributing

1. Create a feature branch
2. Commit changes
3. Push to GitHub
4. Create a pull request

## 📄 License

MIT License - feel free to use this project

## 🔗 Links

- **Documentation**: See README sections above
- **Demo Credentials**: admin@example.com / student@example.com
- **Database**: PostgreSQL with Prisma ORM

## ⚠️ Important Notes

- Ensure PostgreSQL is running before starting the application
- Run seed script to populate demo data: `npm run seed`
- JWT_SECRET should be at least 32 characters in production
- Never commit .env.local to version control
- Database URL should use environment variables

## 📞 Support

For issues or questions:
1. Check the documentation above
2. Review API endpoint specifications
3. Check database schema in prisma/schema.prisma
4. Review component implementations

## 🎉 Success!

Your Student Productivity & Attendance Analytics Platform is now ready to deploy. The application includes:

✅ Production-ready code  
✅ Complete database schema  
✅ Authentication and RBAC  
✅ Admin and Student dashboards  
✅ Real-time analytics  
✅ Seed data for 50 students  
✅ Professional UI/UX  
✅ TypeScript throughout  
✅ API routes  
✅ Responsive design  

Happy coding! 🚀
