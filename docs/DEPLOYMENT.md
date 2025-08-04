# Deployment Guide

This guide covers deploying LinkPipe to various platforms and configurations.

## 🌍 Deployment Strategies

### Strategy 1: AWS Full Serverless (Recommended for Production)
- **Frontend**: S3 + CloudFront
- **API**: Lambda + API Gateway
- **Database**: DynamoDB
- **Cost**: ~$1-5/month
- **Scalability**: Excellent

### Strategy 2: Vercel + AWS Hybrid
- **Frontend**: Vercel
- **API**: Lambda + API Gateway
- **Database**: DynamoDB
- **Cost**: ~$0-10/month
- **Scalability**: Excellent
- **Ease**: High

### Strategy 3: VPS/Docker
- **Frontend**: Nginx + Static Files
- **API**: Docker Container
- **Database**: Docker DynamoDB Local or AWS DynamoDB
- **Cost**: $5-20/month
- **Scalability**: Manual
- **Control**: High

## 🚀 AWS Full Serverless Deployment

### Prerequisites
- AWS CLI configured with appropriate permissions
- Node.js 18+
- Serverless Framework (optional)

### Step 1: Deploy DynamoDB Tables

Using AWS CDK:
```bash
cd backend/infrastructure
npm install
npx cdk deploy LinkPipeStack
```

Using CloudFormation:
```bash
cd backend/infrastructure
aws cloudformation deploy \
  --template-file cloudformation.yml \
  --stack-name linkpipe \
  --capabilities CAPABILITY_IAM
```

### Step 2: Deploy Lambda Functions

Using Serverless Framework:
```bash
cd backend
npm install
npm run build
serverless deploy --stage prod
```

Using AWS SAM:
```bash
cd backend
npm run build
sam build
sam deploy --guided
```

### Step 3: Deploy Frontend to S3 + CloudFront

1. **Build Frontend**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://your-linkpipe-frontend
   ```

3. **Upload Files**
   ```bash
   aws s3 sync dist/ s3://your-linkpipe-frontend --delete
   ```

4. **Create CloudFront Distribution**
   ```bash
   # Use the provided CloudFormation template
   aws cloudformation deploy \
     --template-file infrastructure/frontend-cloudfront.yml \
     --stack-name linkpipe-frontend \
     --parameter-overrides BucketName=your-linkpipe-frontend
   ```

### Step 4: Configure Custom Domain

1. **Route 53 Hosted Zone**
   ```bash
   aws route53 create-hosted-zone --name yourdomain.com --caller-reference $(date +%s)
   ```

2. **SSL Certificate**
   ```bash
   aws acm request-certificate \
     --domain-name yourdomain.com \
     --subject-alternative-names "*.yourdomain.com" \
     --validation-method DNS
   ```

3. **Update CloudFront Distribution**
   ```bash
   # Update the distribution with your domain and certificate
   ```

## 🔷 Vercel + AWS Hybrid Deployment

### Step 1: Deploy AWS Backend
Follow AWS deployment steps 1-2 above.

### Step 2: Deploy Frontend to Vercel

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Configure Environment**
   ```bash
   cd frontend
   cp .env.example .env.production
   # Update VITE_API_URL with your API Gateway URL
   ```

3. **Deploy**
   ```bash
   vercel --prod
   ```

4. **Environment Variables in Vercel**
   ```bash
   vercel env add VITE_API_URL production
   vercel env add VITE_REDIRECT_URL production
   ```

### Custom Domain on Vercel
```bash
vercel domains add yourdomain.com
vercel domains add go.yourdomain.com  # for redirects
```

## 🐳 Docker Production Deployment

### Step 1: Create Production Docker Compose

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'

services:
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - VITE_API_URL=https://api.yourdomain.com
      - VITE_REDIRECT_URL=https://go.yourdomain.com

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - NODE_ENV=production
      - AWS_REGION=us-east-1
      - DYNAMODB_TABLE_NAME=linkpipe-urls
    volumes:
      - ./backend/data:/app/data

  redirect-service:
    build:
      context: ./backend
      dockerfile: Dockerfile.redirect
    ports:
      - "8001:8001"
    environment:
      - NODE_ENV=production
    depends_on:
      - backend

  nginx:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
      - redirect-service
```

### Step 2: Create Production Dockerfiles

`frontend/Dockerfile`:
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`backend/Dockerfile`:
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 8000
CMD ["node", "dist/server.js"]
```

### Step 3: Deploy
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## 🔧 Infrastructure as Code

### AWS CDK (TypeScript)

`backend/infrastructure/cdk/stack.ts`:
```typescript
import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';

export class LinkPipeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Table
    const linksTable = new dynamodb.Table(this, 'LinksTable', {
      tableName: 'linkpipe-urls',
      partitionKey: { name: 'slug', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Lambda Function
    const apiLambda = new lambda.Function(this, 'ApiLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('dist/lambda'),
      environment: {
        DYNAMODB_TABLE_NAME: linksTable.tableName,
      },
    });

    linksTable.grantReadWriteData(apiLambda);

    // API Gateway
    const api = new apigateway.LambdaRestApi(this, 'LinkPipeApi', {
      handler: apiLambda,
      proxy: false,
    });

    const links = api.root.addResource('links');
    links.addMethod('GET');
    links.addMethod('POST');
    
    const link = links.addResource('{slug}');
    link.addMethod('GET');
    link.addMethod('PUT');
    link.addMethod('DELETE');
  }
}
```

### Terraform

`backend/infrastructure/terraform/main.tf`:
```hcl
provider "aws" {
  region = var.aws_region
}

resource "aws_dynamodb_table" "links" {
  name           = "linkpipe-urls"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "slug"

  attribute {
    name = "slug"
    type = "S"
  }

  tags = {
    Name = "LinkPipe URLs"
  }
}

resource "aws_lambda_function" "api" {
  filename         = "../dist/lambda.zip"
  function_name    = "linkpipe-api"
  role            = aws_iam_role.lambda_role.arn
  handler         = "index.handler"
  runtime         = "nodejs18.x"

  environment {
    variables = {
      DYNAMODB_TABLE_NAME = aws_dynamodb_table.links.name
    }
  }
}

resource "aws_api_gateway_rest_api" "api" {
  name        = "linkpipe-api"
  description = "LinkPipe API Gateway"
}
```

## 🌐 Custom Domain Setup

### AWS Route 53 + CloudFront

1. **Create Hosted Zone**
   ```bash
   aws route53 create-hosted-zone \
     --name yourdomain.com \
     --caller-reference $(date +%s)
   ```

2. **Request SSL Certificate**
   ```bash
   aws acm request-certificate \
     --domain-name yourdomain.com \
     --subject-alternative-names "*.yourdomain.com" \
     --validation-method DNS \
     --region us-east-1
   ```

3. **Create CloudFront Distribution**
   ```yaml
   # cloudformation template
   AliasConfiguration:
     Type: AWS::CloudFront::Distribution
     Properties:
       DistributionConfig:
         Aliases:
           - yourdomain.com
           - www.yourdomain.com
         ViewerCertificate:
           AcmCertificateArn: !Ref SSLCertificate
           SslSupportMethod: sni-only
   ```

### Cloudflare (Alternative)

1. **Add Domain to Cloudflare**
2. **Update Nameservers**
3. **Configure DNS Records**
   ```
   A     @           your-server-ip
   CNAME www         yourdomain.com
   CNAME go          yourdomain.com
   CNAME api         your-api-gateway-url
   ```

## 📊 Monitoring & Logging

### AWS CloudWatch

1. **Lambda Logs**
   ```bash
   aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/linkpipe"
   ```

2. **API Gateway Logs**
   ```bash
   aws logs describe-log-groups --log-group-name-prefix "API-Gateway-Execution-Logs"
   ```

### Custom Metrics
```typescript
// In Lambda function
import { CloudWatch } from 'aws-sdk';

const cloudwatch = new CloudWatch();

await cloudwatch.putMetricData({
  Namespace: 'LinkPipe',
  MetricData: [{
    MetricName: 'LinkCreated',
    Value: 1,
    Unit: 'Count'
  }]
}).promise();
```

## 🔒 Security Considerations

### API Security
1. **API Key Authentication**
2. **Rate Limiting**
3. **CORS Configuration**
4. **Input Validation**

### Infrastructure Security
1. **IAM Roles with Least Privilege**
2. **VPC Configuration (if needed)**
3. **SSL/TLS Certificates**
4. **Security Groups**

### Example IAM Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/linkpipe-*"
    }
  ]
}
```

## 🚀 CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:
```yaml
name: Deploy LinkPipe

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install dependencies
        run: |
          cd backend
          npm install
      - name: Build
        run: |
          cd backend
          npm run build
      - name: Deploy to AWS
        run: |
          cd backend
          serverless deploy --stage prod
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

  deploy-frontend:
    runs-on: ubuntu-latest
    needs: deploy-backend
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - name: Install and build
        run: |
          cd frontend
          npm install
          npm run build
      - name: Deploy to Vercel
        run: |
          cd frontend
          npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```

## 🔧 Troubleshooting Deployment Issues

### Common Problems

1. **Lambda Cold Starts**
   - Use Provisioned Concurrency
   - Optimize bundle size
   - Keep connections warm

2. **DynamoDB Throttling**
   - Increase provisioned capacity
   - Use exponential backoff
   - Optimize query patterns

3. **CORS Issues**
   - Configure API Gateway CORS
   - Set proper headers in Lambda
   - Check origin whitelist

4. **Domain Issues**
   - Verify DNS propagation
   - Check SSL certificate status
   - Validate domain ownership

### Debug Commands

```bash
# Check AWS resources
aws lambda list-functions --query 'Functions[?starts_with(FunctionName, `linkpipe`)]'
aws dynamodb list-tables
aws apigateway get-rest-apis

# Check logs
aws logs tail /aws/lambda/linkpipe-api --follow

# Test endpoints
curl -X POST https://your-api.execute-api.us-east-1.amazonaws.com/prod/links \
  -H "Content-Type: application/json" \
  -d '{"url": "https://example.com"}'
```

---

This deployment guide should help you get LinkPipe running in any environment. Choose the strategy that best fits your needs, budget, and technical requirements! 