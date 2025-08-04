import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { 
  CreateTableCommand, 
  DescribeTableCommand, 
  ResourceNotFoundException 
} from '@aws-sdk/client-dynamodb';

export async function createTables(client: DynamoDBClient): Promise<void> {
  const tableName = process.env.DYNAMODB_TABLE_NAME || 'linkpipe-urls';

  try {
    // Check if table already exists
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    console.log(`✅ Table ${tableName} already exists`);
    return;
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      // Table doesn't exist, create it
      console.log(`🔧 Creating table ${tableName}...`);
      
      await client.send(new CreateTableCommand({
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
        BillingMode: 'PAY_PER_REQUEST', // On-demand billing
        Tags: [
          {
            Key: 'Project',
            Value: 'LinkPipe'
          },
          {
            Key: 'Environment',
            Value: process.env.NODE_ENV || 'development'
          }
        ]
      }));

      console.log(`✅ Table ${tableName} created successfully`);
    } else {
      console.error('❌ Error checking/creating table:', error);
      throw error;
    }
  }
}

export function getTableName(): string {
  return process.env.DYNAMODB_TABLE_NAME || 'linkpipe-urls';
} 