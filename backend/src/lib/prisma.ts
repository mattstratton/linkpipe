import { PrismaClient } from '@prisma/client';
import { ShortLink, UtmParams } from '@linkpipe/shared';

// Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export class PrismaDatabase {
  async createLink(data: {
    slug: string;
    url: string;
    domain?: string;
    utm_params?: UtmParams;
    description?: string;
    tags?: string[];
    expiresAt?: string;
  }): Promise<ShortLink> {
    const link = await prisma.link.create({
      data: {
        slug: data.slug,
        url: data.url,
        domain: data.domain || 'localhost:8001',
        utmSource: data.utm_params?.utm_source,
        utmMedium: data.utm_params?.utm_medium,
        utmCampaign: data.utm_params?.utm_campaign,
        utmTerm: data.utm_params?.utm_term,
        utmContent: data.utm_params?.utm_content,
        description: data.description,
        tags: data.tags || [],
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    return this.prismaLinkToShortLink(link);
  }

  async getLinkBySlug(slug: string): Promise<ShortLink | null> {
    const link = await prisma.link.findFirst({
      where: {
        slug,
        isActive: true,
      },
    });

    if (!link) {
      return null;
    }

    // Check if link is expired
    if (link.expiresAt && link.expiresAt < new Date()) {
      return null;
    }

    return this.prismaLinkToShortLink(link);
  }

  async getAllLinks(): Promise<ShortLink[]> {
    const links = await prisma.link.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return links.map(link => this.prismaLinkToShortLink(link));
  }

  async incrementClickCount(slug: string): Promise<void> {
    await prisma.link.updateMany({
      where: {
        slug,
        isActive: true,
      },
      data: {
        clickCount: {
          increment: 1,
        },
      },
    });
  }

  async updateLink(slug: string, data: {
    url?: string;
    domain?: string;
    utm_params?: UtmParams;
    description?: string;
    tags?: string[];
    expiresAt?: string;
    isActive?: boolean;
  }): Promise<ShortLink | null> {
    const link = await prisma.link.update({
      where: { slug },
      data: {
        url: data.url,
        domain: data.domain,
        utmSource: data.utm_params?.utm_source,
        utmMedium: data.utm_params?.utm_medium,
        utmCampaign: data.utm_params?.utm_campaign,
        utmTerm: data.utm_params?.utm_term,
        utmContent: data.utm_params?.utm_content,
        description: data.description,
        tags: data.tags,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: data.isActive,
      },
    });

    return this.prismaLinkToShortLink(link);
  }

  async deleteLink(slug: string): Promise<boolean> {
    const result = await prisma.link.updateMany({
      where: { slug },
      data: { isActive: false },
    });

    return result.count > 0;
  }

  async slugExists(slug: string): Promise<boolean> {
    const link = await prisma.link.findUnique({
      where: { slug },
      select: { id: true },
    });

    return !!link;
  }

  async getSetting(key: string): Promise<any> {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });

    return setting?.value || null;
  }

  async getAllSettings(): Promise<Record<string, any>> {
    const settings = await prisma.setting.findMany({
      orderBy: { key: 'asc' },
    });

    const result: Record<string, any> = {};
    for (const setting of settings) {
      result[setting.key] = {
        value: setting.value,
        description: setting.description,
      };
    }

    return result;
  }

  async updateSetting(key: string, value: any, description?: string): Promise<void> {
    await prisma.setting.upsert({
      where: { key },
      update: {
        value,
        description,
      },
      create: {
        key,
        value,
        description,
      },
    });
  }

  async close(): Promise<void> {
    await prisma.$disconnect();
  }

  private prismaLinkToShortLink(link: any): ShortLink {
    const utm_params: UtmParams = {};
    if (link.utmSource) utm_params.utm_source = link.utmSource;
    if (link.utmMedium) utm_params.utm_medium = link.utmMedium;
    if (link.utmCampaign) utm_params.utm_campaign = link.utmCampaign;
    if (link.utmTerm) utm_params.utm_term = link.utmTerm;
    if (link.utmContent) utm_params.utm_content = link.utmContent;

    return {
      slug: link.slug,
      url: link.url,
      domain: link.domain,
      utm_params: Object.keys(utm_params).length > 0 ? utm_params : undefined,
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt?.toISOString(),
      tags: link.tags,
      expiresAt: link.expiresAt?.toISOString(),
      description: link.description,
      isActive: link.isActive,
      clickCount: link.clickCount,
    };
  }
}

// Singleton instance
export const prismaDb = new PrismaDatabase(); 