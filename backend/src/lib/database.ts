import { Pool, PoolClient } from 'pg';
import { ShortLink, UtmParams } from '@linkpipe/shared';

export class Database {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      // Connection pool settings
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    // Test connection on startup
    this.testConnection();
  }

  private async testConnection(): Promise<void> {
    const maxRetries = 10;
    const retryDelay = 2000; // 2 seconds
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Testing PostgreSQL connection (attempt ${attempt}/${maxRetries})...`);
        const client = await this.pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        client.release();
        console.log('✅ PostgreSQL connection successful');
        console.log(`🕒 Database time: ${result.rows[0].current_time}`);
        return;
      } catch (error) {
        console.warn(`⚠️ PostgreSQL connection attempt ${attempt} failed:`, (error as Error).message);
        
        if (attempt === maxRetries) {
          console.error('❌ PostgreSQL connection failed after all retries');
          throw error;
        }
        
        console.log(`⏳ Retrying in ${retryDelay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  async createLink(data: {
    slug: string;
    url: string;
    domain?: string;
    utm_params?: UtmParams;
    description?: string;
    tags?: string[];
    expiresAt?: string;
  }): Promise<ShortLink> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO links (
          slug, url, domain, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          description, tags, expires_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *
      `;
      
      const values = [
        data.slug,
        data.url,
        data.domain || 'localhost:8001',
        data.utm_params?.utm_source || null,
        data.utm_params?.utm_medium || null,
        data.utm_params?.utm_campaign || null,
        data.utm_params?.utm_term || null,
        data.utm_params?.utm_content || null,
        data.description || null,
        data.tags || null,
        data.expiresAt ? new Date(data.expiresAt) : null,
      ];

      const result = await client.query(query, values);
      return this.rowToShortLink(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async getLinkBySlug(slug: string): Promise<ShortLink | null> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT * FROM links WHERE slug = $1 AND is_active = true';
      const result = await client.query(query, [slug]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const link = this.rowToShortLink(result.rows[0]);
      
      // Check if link is expired
      if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
        return null;
      }

      return link;
    } finally {
      client.release();
    }
  }

  async getAllLinks(): Promise<ShortLink[]> {
    const client = await this.pool.connect();
    try {
      const query = `
        SELECT * FROM links 
        WHERE is_active = true 
        ORDER BY created_at DESC
      `;
      const result = await client.query(query);
      return result.rows.map(row => this.rowToShortLink(row));
    } finally {
      client.release();
    }
  }

  async incrementClickCount(slug: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = 'UPDATE links SET click_count = click_count + 1 WHERE slug = $1 AND is_active = true';
      await client.query(query, [slug]);
    } finally {
      client.release();
    }
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
    const client = await this.pool.connect();
    try {
      const fields: string[] = [];
      const values: any[] = [];
      let paramCount = 1;

      if (data.url !== undefined) {
        fields.push(`url = $${paramCount++}`);
        values.push(data.url);
      }
      if (data.domain !== undefined) {
        fields.push(`domain = $${paramCount++}`);
        values.push(data.domain);
      }
      if (data.utm_params !== undefined) {
        fields.push(`utm_source = $${paramCount++}`);
        fields.push(`utm_medium = $${paramCount++}`);
        fields.push(`utm_campaign = $${paramCount++}`);
        fields.push(`utm_term = $${paramCount++}`);
        fields.push(`utm_content = $${paramCount++}`);
        values.push(
          data.utm_params.utm_source || null,
          data.utm_params.utm_medium || null,
          data.utm_params.utm_campaign || null,
          data.utm_params.utm_term || null,
          data.utm_params.utm_content || null
        );
      }
      if (data.description !== undefined) {
        fields.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      if (data.tags !== undefined) {
        fields.push(`tags = $${paramCount++}`);
        values.push(data.tags);
      }
      if (data.expiresAt !== undefined) {
        fields.push(`expires_at = $${paramCount++}`);
        values.push(data.expiresAt ? new Date(data.expiresAt) : null);
      }
      if (data.isActive !== undefined) {
        fields.push(`is_active = $${paramCount++}`);
        values.push(data.isActive);
      }

      if (fields.length === 0) {
        // No fields to update, return current link
        return await this.getLinkBySlug(slug);
      }

      const query = `
        UPDATE links 
        SET ${fields.join(', ')}
        WHERE slug = $${paramCount}
        RETURNING *
      `;
      values.push(slug);

      const result = await client.query(query, values);
      
      if (result.rows.length === 0) {
        return null;
      }

      return this.rowToShortLink(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteLink(slug: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = 'UPDATE links SET is_active = false WHERE slug = $1';
      const result = await client.query(query, [slug]);
      return (result.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  }

  async slugExists(slug: string): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT 1 FROM links WHERE slug = $1 LIMIT 1';
      const result = await client.query(query, [slug]);
      return result.rows.length > 0;
    } finally {
      client.release();
    }
  }

  private rowToShortLink(row: any): ShortLink {
    const utm_params: UtmParams = {};
    if (row.utm_source) utm_params.utm_source = row.utm_source;
    if (row.utm_medium) utm_params.utm_medium = row.utm_medium;
    if (row.utm_campaign) utm_params.utm_campaign = row.utm_campaign;
    if (row.utm_term) utm_params.utm_term = row.utm_term;
    if (row.utm_content) utm_params.utm_content = row.utm_content;

    return {
      id: row.id,
      slug: row.slug,
      url: row.url,
      domain: row.domain,
      utm_params: Object.keys(utm_params).length > 0 ? utm_params : undefined,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at?.toISOString(),
      tags: row.tags,
      expiresAt: row.expires_at?.toISOString(),
      description: row.description,
      isActive: row.is_active,
      clickCount: row.click_count || 0,
    };
  }

  async getSetting(key: string): Promise<any> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT value FROM settings WHERE key = $1';
      const result = await client.query(query, [key]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return result.rows[0].value;
    } finally {
      client.release();
    }
  }

  async getAllSettings(): Promise<Record<string, any>> {
    const client = await this.pool.connect();
    try {
      const query = 'SELECT key, value, description FROM settings ORDER BY key';
      const result = await client.query(query);
      
      const settings: Record<string, any> = {};
      for (const row of result.rows) {
        settings[row.key] = {
          value: row.value,
          description: row.description
        };
      }
      
      return settings;
    } finally {
      client.release();
    }
  }

  async updateSetting(key: string, value: any, description?: string): Promise<void> {
    const client = await this.pool.connect();
    try {
      const query = `
        INSERT INTO settings (key, value, description)
        VALUES ($1, $2, $3)
        ON CONFLICT (key) 
        DO UPDATE SET 
          value = EXCLUDED.value,
          description = COALESCE(EXCLUDED.description, settings.description),
          updated_at = NOW()
      `;
      
      await client.query(query, [key, JSON.stringify(value), description]);
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Singleton instance
export const db = new Database();