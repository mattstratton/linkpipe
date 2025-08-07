const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDomains() {
  try {
    console.log('🌱 Seeding domains...');

    // Check if domains already exist
    const existingDomains = await prisma.domain.findMany();
    if (existingDomains.length > 0) {
      console.log('✅ Domains already exist, skipping seed');
      return;
    }

    // Create initial domains
    const domains = [
      { name: 'localhost:8001', isDefault: true },
      { name: 'example.com', isDefault: false },
      { name: 'short.link', isDefault: false },
    ];

    for (const domain of domains) {
      await prisma.domain.create({
        data: domain,
      });
      console.log(`✅ Created domain: ${domain.name}${domain.isDefault ? ' (default)' : ''}`);
    }

    console.log('🎉 Domain seeding completed!');
  } catch (error) {
    console.error('❌ Error seeding domains:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed function
seedDomains()
  .then(() => {
    console.log('✅ Domain seeding completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Domain seeding failed:', error);
    process.exit(1);
  }); 