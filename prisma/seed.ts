import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = "pankajbepari7@gmail.com";
  // The User table uses firebaseUid, not password. We'll set a placeholder.
  const firebaseUid = "ADMIN_PLACEHOLDER_UID";

  // 1. Create/Update Admin User
  const user = await prisma.user.upsert({
    where: { email },
    update: {
      role: "ADMIN",
      name: "Pankaj Bepari",
    },
    create: {
      email,
      firebaseUid,
      name: "Pankaj Bepari",
      role: "ADMIN",
    },
  });

  console.log({ user });

  // 2. Create/Update Profile
  const existingProfile = await prisma.profile.findFirst();

  const profileData = {
    name: "Pankaj Bepari",
    email: "pankajbepari7@gmail.com",
    bio: "Full Stack Developer specializing in MERN stack and modern web technologies. Passionate about building scalable applications and solving complex problems.",
    designation: "Full Stack Developer",
    socialLinks: {
      github: "https://github.com/Pankaj72885",
      linkedin: "https://www.linkedin.com/in/pankajbepari/",
    },
    // location is not in schema, so omitting
  };

  if (existingProfile) {
    await prisma.profile.update({
      where: { id: existingProfile.id },
      data: profileData,
    });
  } else {
    await prisma.profile.create({
      data: profileData,
    });
  }

  // 3. Add Skills
  await prisma.skill.deleteMany();

  const skills = [
    { name: "JavaScript", category: "Frontend", proficiency: 90, order: 1 },
    { name: "TypeScript", category: "Frontend", proficiency: 85, order: 2 },
    { name: "React", category: "Frontend", proficiency: 90, order: 3 },
    { name: "Next.js", category: "Frontend", proficiency: 85, order: 4 },
    { name: "Node.js", category: "Backend", proficiency: 80, order: 5 },
    { name: "Express", category: "Backend", proficiency: 85, order: 6 },
    { name: "MongoDB", category: "Database", proficiency: 80, order: 7 },
    { name: "PostgreSQL", category: "Database", proficiency: 75, order: 8 },
    { name: "Tailwind CSS", category: "Frontend", proficiency: 95, order: 9 },
    { name: "Prisma", category: "Backend", proficiency: 80, order: 10 },
  ];

  for (const skill of skills) {
    await prisma.skill.create({
      data: skill,
    });
  }

  // 4. Add Projects
  await prisma.project.deleteMany();

  const projects = [
    {
      title: "FinEase",
      slug: "finease",
      description:
        "A comprehensive financial management dashboard for tracking expenses, income, and managing budgets.",
      technologies: ["React", "Node.js", "Express", "MongoDB", "Charts.js"],
      liveLink: "https://finease-front-end.vercel.app",
      repoLink: "https://github.com/Pankaj72885/finease-front-end",
      image:
        "https://images.unsplash.com/photo-1554224155-984bb07c278c?q=80&w=2072&auto=format&fit=crop",
      featured: true,
      order: 1,
    },
    {
      title: "eTuitionBd",
      slug: "etuitionbd",
      description:
        "An online tutoring platform connecting students with qualified tutors in Bangladesh.",
      technologies: ["Next.js", "TypeScript", "Prisma", "PostgreSQL"],
      liveLink: "https://etuitionbd-client.vercel.app",
      repoLink: "https://github.com/Pankaj72885/eTuitionBd-client",
      image:
        "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?q=80&w=2022&auto=format&fit=crop",
      featured: true,
      order: 2,
    },
    {
      title: "Vehicle Rental System API",
      slug: "vehicle-rental-api",
      description:
        "A robust backend API for managing vehicle rentals, bookings, and user authentication.",
      technologies: ["Node.js", "Express", "MongoDB", "JWT"],
      repoLink: "https://github.com/Pankaj72885/Vehicle-Rental-System-API",
      image:
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?q=80&w=2070&auto=format&fit=crop",
      featured: false,
      order: 3,
    },
    {
      title: "Game Hub",
      slug: "game-hub",
      description:
        "A video game discovery app similar to RAWG, featuring game search, filtering, and details.",
      technologies: ["React", "TypeScript", "Chakra UI", "RAWG API"],
      repoLink: "https://github.com/Pankaj72885/game-hub",
      image:
        "https://images.unsplash.com/photo-1552820728-8b83bb6b773f?q=80&w=2070&auto=format&fit=crop",
      featured: true,
      order: 4,
    },
    {
      title: "Care.xyz",
      slug: "care-xyz",
      description:
        "A healthcare platform for managing patient appointments and doctor schedules.",
      technologies: ["React", "Node.js", "Express", "MongoDB"],
      repoLink: "https://github.com/Pankaj72885/care.xyz",
      image:
        "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?q=80&w=2070&auto=format&fit=crop",
      featured: false,
      order: 5,
    },
  ];

  for (const project of projects) {
    await prisma.project.create({
      data: project,
    });
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
