import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  
  // Insert default settings
  const settings = [
    {
      key: 'domains',
      value: ['localhost:8001', 'short.example.com'],
      description: 'Available domains for short links',
    },
    {
      key: 'utm_sources',
      value: ['linkpipe', 'email', 'social', 'direct', 'organic'],
      description: 'Available UTM sources',
    },
    {
      key: 'utm_mediums',
      value: ['shortlink', 'email', 'social', 'cpc', 'organic'],
      description: 'Available UTM mediums',
    },
    {
      key: 'utm_campaigns',
      value: ['welcome', 'newsletter', 'promotion', 'product-launch'],
      description: 'Available UTM campaigns',
    },
    {
      key: 'utm_contents',
      value: ['header', 'sidebar', 'footer', 'banner'],
      description: 'Available UTM contents',
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value, description: setting.description },
      create: setting,
    });
  }

  // Create default admin user
  const hashedPassword = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@linkpipe.local',
      password: hashedPassword,
      name: 'Admin User',
      provider: 'basic',
    },
  });

  // Insert sample links
  const sampleLinks = [
    {
      slug: 'example',
      url: 'https://example.com',
      domain: 'localhost:8001',
      description: 'Example link for testing',
      tags: ['example', 'test'],
      utmSource: 'linkpipe',
      utmMedium: 'shortlink',
      utmCampaign: 'welcome',
    },
    {
      slug: 'github',
      url: 'https://github.com',
      domain: 'localhost:8001',
      description: 'GitHub - Where the world builds software',
      tags: ['development', 'code'],
      utmSource: 'linkpipe',
      utmMedium: 'shortlink',
      utmCampaign: 'development',
    },
  ];

  for (const link of sampleLinks) {
    await prisma.link.upsert({
      where: { slug: link.slug },
      update: {},
      create: link,
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log('👤 Default admin user: admin / admin123');
  console.log('🔗 Sample links created');
  console.log('⚙️  Default settings configured');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 