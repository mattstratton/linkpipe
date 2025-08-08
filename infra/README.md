# LinkPipe Infrastructure with Pulumi

This directory contains the Infrastructure as Code (IaC) for deploying LinkPipe to AWS using Pulumi.

## 🏗️ Architecture

The infrastructure creates a production-ready deployment with:

- **ECS Fargate**: Containerized application with auto-scaling
- **RDS PostgreSQL**: Managed database with high availability
- **Application Load Balancer**: HTTP/HTTPS traffic distribution
- **VPC**: Isolated network with public/private subnets
- **Route 53**: DNS management (optional)
- **ACM**: SSL certificates (optional)
- **CloudWatch**: Logging and monitoring

## 📋 Prerequisites

1. **Pulumi CLI**: Install from [pulumi.com](https://pulumi.com/docs/get-started/install/)
2. **AWS CLI**: Configured with appropriate credentials
3. **Node.js**: Version 18 or higher
4. **Docker Image**: Pre-built and pushed to registry

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd infra
npm install
```

### 2. Configure Pulumi

```bash
# Login to Pulumi (if using Pulumi Cloud)
pulumi login

# Create a new stack
pulumi stack init dev

# Set configuration values
pulumi config set aws:region us-east-1
pulumi config set linkpipe:imageRepository mattstratton/linkpipe
pulumi config set linkpipe:imageTag latest

# Set secrets (replace with your actual values)
pulumi config set --secret linkpipe:dbPassword your-secure-db-password
pulumi config set --secret linkpipe:jwtSecret your-jwt-secret-key
pulumi config set --secret linkpipe:sessionSecret your-session-secret-key

# Optional: Set domain name for HTTPS
pulumi config set linkpipe:domainName your-domain.com
```

### 3. Deploy Infrastructure

```bash
# Preview changes
pulumi preview

# Deploy
pulumi up

# Get outputs
pulumi stack output
```

## 🔧 Configuration Options

### Required Configuration

| Key | Description | Example |
|-----|-------------|---------|
| `linkpipe:dbPassword` | Database password | `my-secure-password` |
| `linkpipe:jwtSecret` | JWT signing secret | `my-jwt-secret` |
| `linkpipe:sessionSecret` | Session encryption secret | `my-session-secret` |

### Optional Configuration

| Key | Description | Default |
|-----|-------------|---------|
| `linkpipe:imageRepository` | Docker image repository | `mattstratton/linkpipe` |
| `linkpipe:imageTag` | Docker image tag | `latest` |
| `linkpipe:domainName` | Custom domain for HTTPS | `undefined` |
| `aws:region` | AWS region | `us-east-1` |

## 📊 Resource Sizing

### Development (Default)
- **ECS**: 256 CPU units, 512 MB RAM
- **RDS**: db.t3.micro (1 vCPU, 1 GB RAM)
- **Storage**: 20 GB GP2

### Production (Recommended)
- **ECS**: 512 CPU units, 1 GB RAM
- **RDS**: db.t3.small (2 vCPU, 2 GB RAM)
- **Storage**: 100 GB GP2

To modify resource sizes, edit the values in `index.ts`.

## 🔄 Deployment Workflow

### 1. Build and Push Image

```bash
# Build the Docker image
cd ..
docker build -f backend/Dockerfile -t mattstratton/linkpipe:latest .

# Push to registry
docker push mattstratton/linkpipe:latest
```

### 2. Update Infrastructure

```bash
cd infra
pulumi config set linkpipe:imageTag latest
pulumi up
```

### 3. Database Migration

```bash
# Connect to the deployed database and run migrations
pulumi stack output databaseEndpoint
# Use the endpoint to run: npx prisma migrate deploy
```

## 🛠️ Management Commands

```bash
# View current stack
pulumi stack

# View resources
pulumi stack --show-urns

# View logs
pulumi logs -f

# Update specific resources
pulumi up --target aws:ecs/service:Service

# Destroy infrastructure
pulumi destroy

# Export/Import stack
pulumi stack export --file stack.json
pulumi stack import --file stack.json
```

## 🔍 Monitoring and Logs

### CloudWatch Logs
- **Log Group**: `/ecs/linkpipe`
- **Retention**: 7 days
- **View logs**: AWS Console → CloudWatch → Log Groups

### Application Metrics
- **ECS Service**: CPU/Memory utilization
- **RDS**: Database connections, storage
- **ALB**: Request count, response time

## 🔒 Security

### Network Security
- **VPC**: Isolated network with public/private subnets
- **Security Groups**: Restrictive access rules
- **RDS**: Only accessible from ECS tasks

### Secrets Management
- **Database Password**: Stored as Pulumi secret
- **JWT Secret**: Stored as Pulumi secret
- **Session Secret**: Stored as Pulumi secret

### SSL/TLS
- **ACM Certificate**: Automatic SSL certificate (if domain provided)
- **HTTPS**: Redirects HTTP to HTTPS

## 💰 Cost Estimation

### Monthly Costs (us-east-1)
- **ECS Fargate**: ~$15-30/month
- **RDS t3.micro**: ~$15/month
- **ALB**: ~$20/month
- **Data Transfer**: ~$5-10/month
- **Total**: ~$55-75/month

### Cost Optimization
- Use Spot instances for non-critical workloads
- Implement auto-scaling based on demand
- Monitor and optimize database queries
- Use CloudFront for static content caching

## 🚨 Troubleshooting

### Common Issues

1. **Image Pull Errors**
   ```bash
   # Check if image exists in registry
   docker pull mattstratton/linkpipe:latest
   ```

2. **Database Connection Issues**
   ```bash
   # Check security group rules
   aws ec2 describe-security-groups --group-ids sg-xxx
   ```

3. **ECS Service Not Starting**
   ```bash
   # Check task definition
   aws ecs describe-task-definition --task-definition linkpipe
   ```

### Debug Commands

```bash
# View ECS service events
aws ecs describe-services --cluster linkpipe-cluster --services linkpipe-service

# View task logs
aws logs tail /ecs/linkpipe --follow

# Check ALB health
aws elbv2 describe-target-health --target-group-arn arn:aws:elasticloadbalancing:...
```

## 📚 Additional Resources

- [Pulumi AWS Documentation](https://www.pulumi.com/docs/clouds/aws/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS Best Practices](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_BestPractices.html) 