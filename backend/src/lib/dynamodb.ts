import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  CreateTableCommand, 
  DescribeTableCommand, 
  ResourceNotFoundException 
} from '@aws-sdk/client-dynamodb';

export async function createTables(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'linkpipe-urls';

  try {
    console.log(`🔍 Checking if table ${tableName} exists...`);
    
    // Check if table already exists with timeout
    const describePromise = client.send(new DescribeTableCommand({ TableName: tableName }));
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('DynamoDB connection timeout')), 10000)
    );
    
    await Promise.race([describePromise, timeoutPromise]);
    console.log(`✅ Table ${tableName} already exists`);
    return;
    
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      // Table doesn't exist, create it
      console.log(`🔧 Creating table ${tableName}...`);
      
      try {
        const createPromise = client.send(new CreateTableCommand({
          TableName: tableName,
          KeySchema: [
            {
              AttributeName: 'slug',
              KeyType: 'HASH' // Partition key
            }
          ],
          AttributeDefinitions: [
            {
              AttributeName: 'slug',
              AttributeType: 'S'
            }
          ],
          BillingMode: 'PAY_PER_REQUEST' // On-demand billing
        }));
        
        const createTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Table creation timeout')), 15000)
        );
        
        await Promise.race([createPromise, createTimeoutPromise]);
        console.log(`✅ Table ${tableName} created successfully`);
        
      } catch (createError) {
        console.error(`❌ Failed to create table ${tableName}:`, createError);
        throw createError;
      }
      
    } else if (error.message === 'DynamoDB connection timeout') {
      console.warn(`⚠️ DynamoDB connection timeout. Continuing without table verification.`);
      console.warn(`⚠️ Make sure DynamoDB Local is running and accessible.`);
      // Don't throw - let the app continue and fail later if needed
      
    } else {
      console.error(`❌ Unexpected error checking table ${tableName}:`, error);
      throw error;
    }
  }
}

export function getTableName(): string {
  return process.env.DYNAMODB_TABLE_NAME || 'linkpipe-urls';
} 