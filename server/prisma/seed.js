const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.emotionMetric.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.chatSession.deleteMany();
  await prisma.journalEntry.deleteMany();
  await prisma.userGoal.deleteMany();
  await prisma.moodCheckIn.deleteMany();
  await prisma.userMemory.deleteMany();
  await prisma.user.deleteMany();

  console.log('Seeding demo user...');
  const passwordHash = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.create({
    data: {
      name: 'Demo User',
      email: 'test@mindwell.com',
      passwordHash,
      profession: 'Software Engineer',
      company: 'TechCorp',
      personality: 'analytical',
      primaryStressors: ['deadlines', 'imposter_syndrome'],
      goals: ['Meditate daily', 'Stop working by 7 PM'],
    }
  });

  console.log('Seeding user memory...');
  await prisma.userMemory.create({
    data: {
      userId: user.id,
      summary: 'Demo user works as a Software Engineer at TechCorp. They struggle with imposter syndrome and strict deadlines but are actively trying to improve their work-life balance.',
      topics: ['work-life balance', 'imposter syndrome', 'stress management'],
      keyFacts: ['Has a big launch coming up in two weeks', 'Likes mindfulness exercises'],
    }
  });

  console.log('Seeding goals...');
  await prisma.userGoal.createMany({
    data: [
      { userId: user.id, title: 'Complete onboarding', category: 'wellness', completed: true, completedAt: new Date() },
      { userId: user.id, title: 'Drink 2L water', category: 'wellness', completed: true, completedAt: new Date() },
      { userId: user.id, title: 'Do 4-7-8 breathing', category: 'mindfulness', completed: false },
      { userId: user.id, title: 'Log a journal entry', category: 'wellness', completed: false },
    ]
  });

  console.log('Seeding mood check-ins (last 7 days)...');
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    await prisma.moodCheckIn.create({
      data: {
        userId: user.id,
        moodIndex: Math.floor(Math.random() * 5),
        moodLabel: ['Great', 'Calm', 'Okay', 'Low', 'Stressed'][Math.floor(Math.random() * 5)],
        createdAt: d,
      }
    });
  }

  console.log('Seeding journal entries...');
  const journalMoods = ['calm', 'anxious', 'happy', 'overwhelmed', 'distressed'];
  for (let i = 4; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const mood = journalMoods[i];
    await prisma.journalEntry.create({
      data: {
        userId: user.id,
        text: `This is a generated journal entry reflecting a ${mood} state. Today had its ups and downs.`,
        mood: mood,
        tags: ['work', 'reflection', 'daily'],
        analysis: { sentiment: mood === 'happy' || mood === 'calm' ? 'positive' : 'negative', themes: ['work load'] },
        copingTip: mood === 'anxious' ? 'Try taking deep breaths.' : null,
        createdAt: d,
      }
    });
  }

  console.log('Seeding chat sessions and messages...');
  const moods = ['neutral', 'calm', 'anxious', 'happy', 'overwhelmed', 'distressed', 'crisis'];
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    
    const session = await prisma.chatSession.create({
      data: {
        userId: user.id,
        therapyMethod: 'warm',
        startTime: d,
        endTime: new Date(d.getTime() + 15 * 60000), // +15 mins
      }
    });

    // Create 3 user messages and 3 bot messages for each session
    for (let j = 0; j < 3; j++) {
      const msgTime = new Date(d.getTime() + j * 60000); // 1 min apart
      const mood = moods[(i + j) % moods.length];
      const isCrisis = mood === 'crisis';
      const wellnessScore = isCrisis ? 20 : (mood === 'happy' ? 90 : 50 + j * 10);
      const stressScore = isCrisis ? 90 : (mood === 'calm' ? 10 : 80 - j * 15);
      
      const userMsg = await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          sender: 'user',
          text: `Sample user message feeling ${mood}`,
          timestamp: msgTime,
          isMicroWin: j === 2 && mood === 'happy',
        }
      });

      await prisma.emotionMetric.create({
        data: {
          messageId: userMsg.id,
          currentMood: mood,
          crisisScore: isCrisis ? 85 : Math.floor(Math.random() * 20),
          wellnessScore: wellnessScore,
          stressScore: stressScore,
          stressLevel: stressScore > 70 ? 'high' : (stressScore > 40 ? 'medium' : 'low'),
          sentiment: mood === 'happy' ? 'positive' : (isCrisis ? 'negative' : 'neutral'),
          compound: mood === 'happy' ? 0.8 : -0.2,
        }
      });

      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          sender: 'bot',
          text: `Sample AI response addressing the ${mood} feeling. Keep going!`,
          timestamp: new Date(msgTime.getTime() + 2000), // 2 seconds later
        }
      });
    }
  }

  console.log('Database seeded successfully!');
  console.log('Login Email: test@mindwell.com');
  console.log('Login Password: password123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
