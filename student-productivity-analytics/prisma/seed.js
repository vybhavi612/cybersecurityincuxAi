const { PrismaClient } = require("@prisma/client");
const bcryptjs = require("bcryptjs");

const prisma = new PrismaClient();

async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return bcryptjs.hash(password, salt);
}

async function main() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await prisma.notification.deleteMany();
  await prisma.report.deleteMany();
  await prisma.achievement.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminPassword = await hashPassword("password123");
  const admin = await prisma.user.create({
    data: {
      email: "admin@example.com",
      name: "Admin User",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Created admin:", admin.email);

  // Create 50 students
  const students = [];
  const studentPassword = await hashPassword("password123");

  for (let i = 1; i <= 50; i++) {
    const student = await prisma.user.create({
      data: {
        email: `student${i}@example.com`,
        name: `Student ${i}`,
        password: studentPassword,
        role: "STUDENT",
      },
    });
    students.push(student);
  }
  console.log(`✅ Created ${students.length} students`);

  // Generate 6 months of data for each student
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  for (const student of students) {
    // Create attendance records
    for (let dayOffset = 0; dayOffset < 180; dayOffset++) {
      const date = new Date(sixMonthsAgo);
      date.setDate(date.getDate() + dayOffset);

      // Skip weekends (20% of the time)
      if (date.getDay() === 0 || date.getDay() === 6) {
        if (Math.random() > 0.2) continue;
      }

      // Simulate attendance with different statuses
      const random = Math.random();
      let status = "PRESENT";
      let loginTime = new Date(date);
      let logoutTime = new Date(date);
      let duration = 0;

      if (random > 0.85) {
        status = "ABSENT";
      } else if (random > 0.75) {
        status = "LATE";
        loginTime.setHours(9 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
      } else {
        status = "PRESENT";
        loginTime.setHours(8 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
        logoutTime.setHours(17 + Math.floor(Math.random() * 2), Math.floor(Math.random() * 60));
        duration = 540 + Math.floor(Math.random() * 120);
      }

      await prisma.attendance.create({
        data: {
          studentId: student.id,
          date,
          status: status,
          loginTime: status !== "ABSENT" ? loginTime : null,
          logoutTime: status !== "ABSENT" ? logoutTime : null,
          duration: status !== "ABSENT" ? duration : 0,
        },
      });
    }

    // Create activities
    for (let i = 0; i < 100; i++) {
      const daysAgo = Math.floor(Math.random() * 180);
      const date = new Date(sixMonthsAgo);
      date.setDate(date.getDate() + daysAgo);

      const activityTypes = [
        "LOGIN",
        "LOGOUT",
        "ATTENDANCE_MARKED",
        "TASK_COMPLETED",
        "ASSIGNMENT_SUBMITTED",
        "MODULE_COMPLETED",
        "CODE_SUBMITTED",
        "DISCUSSION_PARTICIPATED",
      ];

      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      let points = 5;

      if (activityType === "TASK_COMPLETED" || activityType === "CODE_SUBMITTED") {
        points = 15;
      } else if (activityType === "ASSIGNMENT_SUBMITTED" || activityType === "MODULE_COMPLETED") {
        points = 20;
      }

      await prisma.activity.create({
        data: {
          studentId: student.id,
          activityType: activityType,
          points,
          createdAt: date,
        },
      });
    }

    // Create achievements based on activity
    const achievements = [];

    if (Math.random() > 0.3) {
      achievements.push({
        title: "Early Bird",
        description: "Logged in before 8:30 AM",
        badge: "🌅",
      });
    }

    if (Math.random() > 0.2) {
      achievements.push({
        title: "Perfect Attendance",
        description: "No absences for a month",
        badge: "⭐",
      });
    }

    if (Math.random() > 0.4) {
      achievements.push({
        title: "7 Day Streak",
        description: "7 days of consistent activity",
        badge: "🔥",
      });
    }

    if (Math.random() > 0.5) {
      achievements.push({
        title: "Task Master",
        description: "Completed 20 tasks",
        badge: "✅",
      });
    }

    for (const achievement of achievements) {
      await prisma.achievement.create({
        data: {
          studentId: student.id,
          ...achievement,
          earnedAt: new Date(sixMonthsAgo.getTime() + Math.random() * 180 * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
