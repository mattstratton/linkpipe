import { PrismaClient } from '@prisma/client';
import { ShortLink, UtmParams } from '@linkpipe/shared';

// Prisma client instance
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

export class PrismaDatabase {
  // User Management Methods
  async createUser(data: {
    email: string;
    username: string;
    name?: string;
    avatar?: string;
    provider?: string;
    providerId?: string;
    password?: string;
  }): Promise<any> {
    return prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        name: data.name,
        avatar: data.avatar,
        provider: data.provider || 'basic',
        providerId: data.providerId,
        password: data.password,
      },
    });
  }

  async getUserById(id: string): Promise<any> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  async getUserByEmail(email: string): Promise<any> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  async getUserByUsername(username: string): Promise<any> {
    return prisma.user.findUnique({
      where: { username },
    });
  }

  async getUserByProviderId(provider: string, providerId: string): Promise<any> {
    return prisma.user.findFirst({
      where: {
        provider,
        providerId,
      },
    });
  }

  async updateUser(id: string, data: any): Promise<any> {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await prisma.user.delete({
      where: { id },
    });
    return !!result;
  }

  async getAllUsers(): Promise<any[]> {
    return prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  // Session Management Methods
  async createSession(data: {
    userId: string;
    token: string;
    expiresAt: Date;
  }): Promise<any> {
    return prisma.session.create({
      data: {
        userId: data.userId,
        token: data.token,
        expiresAt: data.expiresAt,
      },
    });
  }

  async getSessionByToken(token: string): Promise<any> {
    return prisma.session.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async deleteSession(token: string): Promise<boolean> {
    const result = await prisma.session.delete({
      where: { token },
    });
    return !!result;
  }

  async deleteExpiredSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  // Existing Link Management Methods
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
    const link = await prisma.link.findUnique({
      where: { slug },
    });

    if (!link) return null;
    return this.prismaLinkToShortLink(link);
  }

  async getAllLinks(): Promise<ShortLink[]> {
    const links = await prisma.link.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return links.map(link => this.prismaLinkToShortLink(link));
  }

  async getLinksWithPagination(params: {
    page: number;
    limit: number;
    search: string;
    offset: number;
  }): Promise<{ links: ShortLink[]; total: number }> {
    const { page, limit, search, offset } = params;

    // Build search conditions
    const searchConditions = search ? {
      OR: [
        { slug: { contains: search, mode: 'insensitive' as any } },
        { url: { contains: search, mode: 'insensitive' as any } },
        { description: { contains: search, mode: 'insensitive' as any } },
        { tags: { hasSome: [search] } },
      ],
    } : {};

    // Get total count
    const total = await prisma.link.count({
      where: searchConditions,
    });

    // Get paginated results
    const links = await prisma.link.findMany({
      where: searchConditions,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    return {
      links: links.map(link => this.prismaLinkToShortLink(link)),
      total,
    };
  }

  async incrementClickCount(slug: string): Promise<void> {
    await prisma.link.update({
      where: { slug },
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
    isActive?: boolean;
    expiresAt?: string;
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
        isActive: data.isActive,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      },
    });

    return this.prismaLinkToShortLink(link);
  }

  async deleteLink(slug: string): Promise<boolean> {
    const result = await prisma.link.delete({
      where: { slug },
    });
    return !!result;
  }

  async slugExists(slug: string): Promise<boolean> {
    const link = await prisma.link.findUnique({
      where: { slug },
      select: { id: true },
    });
    return !!link;
  }

  // Settings Management Methods
  async getSetting(key: string): Promise<any> {
    const setting = await prisma.setting.findUnique({
      where: { key },
    });
    return setting?.value;
  }

  async getAllSettings(): Promise<Record<string, any>> {
    const settings = await prisma.setting.findMany();
    const result: Record<string, any> = {};
    
    for (const setting of settings) {
      result[setting.key] = setting.value;
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

  // Domain Management Methods
  async getAllDomains(): Promise<any[]> {
    return prisma.domain.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async getDefaultDomain(): Promise<any | null> {
    return prisma.domain.findFirst({
      where: { isDefault: true },
    });
  }

  async createDomain(name: string, isDefault: boolean = false): Promise<any> {
    return prisma.domain.create({
      data: {
        name,
        isDefault,
      },
    });
  }

  async updateDomain(id: string, data: { name?: string; isDefault?: boolean }): Promise<any> {
    return prisma.domain.update({
      where: { id },
      data,
    });
  }

  async deleteDomain(id: string): Promise<boolean> {
    const result = await prisma.domain.delete({
      where: { id },
    });
    return !!result;
  }

  async setDefaultDomain(id: string): Promise<void> {
    // First, unset any existing default
    await this.unsetDefaultDomain();
    
    // Then set the new default
    await prisma.domain.update({
      where: { id },
      data: { isDefault: true },
    });
  }

  async unsetDefaultDomain(): Promise<void> {
    await prisma.domain.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  async close(): Promise<void> {
    await prisma.$disconnect();
  }

  private prismaLinkToShortLink(link: any): ShortLink {
    return {
      id: link.id,
      slug: link.slug,
      url: link.url,
      domain: link.domain,
      utm_params: link.utmSource || link.utmMedium || link.utmCampaign || link.utmTerm || link.utmContent ? {
        utm_source: link.utmSource || undefined,
        utm_medium: link.utmMedium || undefined,
        utm_campaign: link.utmCampaign || undefined,
        utm_term: link.utmTerm || undefined,
        utm_content: link.utmContent || undefined,
      } : undefined,
      description: link.description,
      tags: link.tags,
      isActive: link.isActive,
      clickCount: link.clickCount,
      expiresAt: link.expiresAt?.toISOString(),
      createdAt: link.createdAt.toISOString(),
      updatedAt: link.updatedAt?.toISOString(),
    };
  }
}

// Singleton instance
export const prismaDb = new PrismaDatabase(); 