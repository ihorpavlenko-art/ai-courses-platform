import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../app/generated/prisma/client";
import path from "node:path";

const dbPath = path.resolve(__dirname, "dev.db");
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
const prisma = new PrismaClient({ adapter });

const courses = [
  {
    externalId: "google-ai-essentials",
    title: "Google AI Essentials",
    provider: "google",
    description: "Learn the fundamentals of artificial intelligence from Google. This course covers machine learning basics, neural networks, and practical AI applications in everyday work.",
    url: "https://grow.google/certificates/ai-essentials/",
    duration: "10 hours",
    difficultyLevel: "beginner",
    topics: JSON.stringify(["ai_literacy", "tool_proficiency"]),
    thumbnailUrl: "https://placehold.co/400x225/4285F4/white?text=Google+AI",
    isFree: true,
  },
  {
    externalId: "deeplearning-prompt-engineering",
    title: "ChatGPT Prompt Engineering for Developers",
    provider: "deeplearning_ai",
    description: "Learn prompt engineering best practices for application development. Discover how to use LLM APIs for summarizing, inferring, transforming, and expanding text.",
    url: "https://www.deeplearning.ai/short-courses/chatgpt-prompt-engineering-for-developers/",
    duration: "1 hour",
    difficultyLevel: "intermediate",
    topics: JSON.stringify(["prompt_engineering", "tool_proficiency"]),
    thumbnailUrl: "https://placehold.co/400x225/FF6F00/white?text=Prompt+Eng",
    isFree: true,
  },
  {
    externalId: "coursera-ml-specialization",
    title: "Machine Learning Specialization",
    provider: "coursera",
    description: "Andrew Ng's comprehensive machine learning course covering supervised learning, unsupervised learning, and best practices used in Silicon Valley.",
    url: "https://www.coursera.org/specializations/machine-learning-introduction",
    duration: "33 hours",
    difficultyLevel: "intermediate",
    topics: JSON.stringify(["ai_literacy", "domain_application"]),
    thumbnailUrl: "https://placehold.co/400x225/0056D2/white?text=ML+Course",
    isFree: true,
  },
  {
    externalId: "edx-ai-ethics",
    title: "Ethics of AI",
    provider: "edx",
    description: "Explore the ethical implications of artificial intelligence. Learn about bias, fairness, transparency, and responsible AI development practices.",
    url: "https://www.edx.org/learn/artificial-intelligence/ethics-of-ai",
    duration: "8 hours",
    difficultyLevel: "beginner",
    topics: JSON.stringify(["ethics", "ai_literacy"]),
    thumbnailUrl: "https://placehold.co/400x225/02262B/white?text=AI+Ethics",
    isFree: true,
  },
  {
    externalId: "microsoft-ai-fundamentals",
    title: "Azure AI Fundamentals",
    provider: "microsoft",
    description: "Get started with AI on Microsoft Azure. Learn about machine learning, computer vision, natural language processing, and conversational AI services.",
    url: "https://learn.microsoft.com/en-us/training/paths/get-started-with-artificial-intelligence-on-azure/",
    duration: "12 hours",
    difficultyLevel: "beginner",
    topics: JSON.stringify(["ai_literacy", "tool_proficiency", "domain_application"]),
    thumbnailUrl: "https://placehold.co/400x225/00A4EF/white?text=Azure+AI",
    isFree: true,
  },
  {
    externalId: "deeplearning-langchain",
    title: "LangChain for LLM Application Development",
    provider: "deeplearning_ai",
    description: "Learn to use LangChain to build applications powered by large language models. Cover chains, agents, memory, and evaluation techniques.",
    url: "https://www.deeplearning.ai/short-courses/langchain-for-llm-application-development/",
    duration: "2 hours",
    difficultyLevel: "advanced",
    topics: JSON.stringify(["tool_proficiency", "prompt_engineering", "domain_application"]),
    thumbnailUrl: "https://placehold.co/400x225/1A1A2E/white?text=LangChain",
    isFree: true,
  },
  {
    externalId: "coursera-generative-ai",
    title: "Generative AI for Everyone",
    provider: "coursera",
    description: "Understand what generative AI is, how it works, and how to use it in your daily life and work. Taught by Andrew Ng.",
    url: "https://www.coursera.org/learn/generative-ai-for-everyone",
    duration: "5 hours",
    difficultyLevel: "beginner",
    topics: JSON.stringify(["ai_literacy", "prompt_engineering"]),
    thumbnailUrl: "https://placehold.co/400x225/0056D2/white?text=GenAI",
    isFree: true,
  },
  {
    externalId: "google-responsible-ai",
    title: "Responsible AI: Applying AI Principles",
    provider: "google",
    description: "Learn how to put Google's AI principles into practice. Understand fairness, interpretability, privacy, and security in AI systems.",
    url: "https://cloud.google.com/responsible-ai",
    duration: "4 hours",
    difficultyLevel: "intermediate",
    topics: JSON.stringify(["ethics", "domain_application"]),
    thumbnailUrl: "https://placehold.co/400x225/34A853/white?text=Responsible+AI",
    isFree: true,
  },
  {
    externalId: "edx-deep-learning",
    title: "Deep Learning Fundamentals",
    provider: "edx",
    description: "Master the foundations of deep learning. Learn about neural network architectures, training techniques, and applications in computer vision and NLP.",
    url: "https://www.edx.org/learn/deep-learning",
    duration: "20 hours",
    difficultyLevel: "advanced",
    topics: JSON.stringify(["ai_literacy", "domain_application"]),
    thumbnailUrl: "https://placehold.co/400x225/02262B/white?text=Deep+Learning",
    isFree: true,
  },
  {
    externalId: "microsoft-copilot",
    title: "Get Started with Microsoft Copilot",
    provider: "microsoft",
    description: "Learn how to leverage Microsoft Copilot across Office 365 applications. Boost productivity with AI-powered assistance in Word, Excel, PowerPoint, and Teams.",
    url: "https://learn.microsoft.com/en-us/copilot/",
    duration: "3 hours",
    difficultyLevel: "beginner",
    topics: JSON.stringify(["tool_proficiency", "prompt_engineering"]),
    thumbnailUrl: "https://placehold.co/400x225/00A4EF/white?text=Copilot",
    isFree: true,
  },
];

const sections = [
  { title: "Introduction to AI", orderIndex: 0 },
  { title: "Core Concepts", orderIndex: 1 },
  { title: "Hands-on Practice", orderIndex: 2 },
  { title: "Advanced Topics", orderIndex: 3 },
  { title: "Final Assessment", orderIndex: 4 },
];

async function main() {
  console.log("Seeding database...");

  for (const courseData of courses) {
    const course = await prisma.course.upsert({
      where: {
        provider_externalId: {
          provider: courseData.provider,
          externalId: courseData.externalId,
        },
      },
      update: { ...courseData, lastVerified: new Date() },
      create: { ...courseData, lastVerified: new Date() },
    });

    // Add sections for each course
    const existingSections = await prisma.courseSection.findMany({
      where: { courseId: course.id },
    });

    if (existingSections.length === 0) {
      for (const section of sections) {
        await prisma.courseSection.create({
          data: {
            courseId: course.id,
            title: `${section.title} - ${courseData.title}`,
            orderIndex: section.orderIndex,
          },
        });
      }
    }

    console.log(`  ✓ ${courseData.title}`);
  }

  console.log(`\nSeeded ${courses.length} courses with sections.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
