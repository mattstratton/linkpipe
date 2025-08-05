import { PrismaClient } from '@prisma/client';

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
      value: ['newsletter', 'social', 'website', 'blog', 'email', 'direct', 'referral', 'organic', 'paid', 'advertising'],
      description: 'Predefined UTM source options',
    },
    {
      key: 'utm_mediums',
      value: ['email', 'social', 'cpc', 'banner', 'affiliate', 'referral', 'direct', 'organic', 'print', 'video', 'display'],
      description: 'Predefined UTM medium options',
    },
    {
      key: 'utm_campaigns',
      value: ['spring_sale', 'summer_promotion', 'black_friday', 'product_launch', 'webinar', 'newsletter_signup', 'holiday_campaign'],
      description: 'Predefined UTM campaign options',
    },
    {
      key: 'utm_contents',
      value: ['header_link', 'footer_link', 'sidebar_ad', 'main_cta', 'secondary_cta', 'hero_banner', 'text_link'],
      description: 'Predefined UTM content options',
    },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: {
        value: setting.value,
        description: setting.description,
      },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    });
  }

  // Insert sample links
  const sampleLinks = [
    {
      slug: 'example',
      url: 'https://example.com',
      description: 'Example link for testing',
      tags: ['test', 'example'],
      utmSource: 'newsletter',
      utmMedium: 'email',
      utmCampaign: 'welcome',
    },
    {
      slug: 'github',
      url: 'https://github.com',
      description: 'GitHub homepage',
      tags: ['code', 'development'],
      utmSource: 'social',
      utmMedium: 'organic',
      utmCampaign: 'sharing',
    },
  ];

  for (const link of sampleLinks) {
    await prisma.link.upsert({
      where: { slug: link.slug },
      update: {
        url: link.url,
        description: link.description,
        tags: link.tags,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
      },
      create: {
        slug: link.slug,
        url: link.url,
        description: link.description,
        tags: link.tags,
        utmSource: link.utmSource,
        utmMedium: link.utmMedium,
        utmCampaign: link.utmCampaign,
      },
    });
  }

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 