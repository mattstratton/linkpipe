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

| Key | Description | Requirements | Example |
|-----|-------------|--------------|---------|
| `linkpipe:dbPassword` | Database password | Min 8 characters, alphanumeric recommended | `my-secure-password` |
| `linkpipe:jwtSecret` | JWT signing secret | Min 32 characters, random string recommended | `my-jwt-secret-key-32-chars-minimum` |
| `linkpipe:sessionSecret` | Session encryption secret | Min 32 characters, random string recommended | `my-session-secret-key-32-chars-minimum` |

#### **Secret Requirements:**

**Database Password (`linkpipe:dbPassword`):**
- **Minimum length**: 8 characters
- **Recommended**: 12+ characters with mixed case, numbers, and symbols
- **Used for**: PostgreSQL database authentication
- **Security**: Stored encrypted in Pulumi state

**JWT Secret (`linkpipe:jwtSecret`):**
- **Minimum length**: 32 characters
- **Recommended**: 64+ character random string
- **Used for**: Signing JSON Web Tokens for API authentication
- **Security**: Critical for API security, must be kept secret

**Session Secret (`linkpipe:sessionSecret`):**
- **Minimum length**: 32 characters
- **Recommended**: 64+ character random string
- **Used for**: Encrypting session data and cookies
- **Security**: Critical for session security, must be kept secret

#### **Generating Secure Secrets:**

The deployment script can automatically generate secure secrets, or you can generate them manually:

```bash
# Generate database password (25 chars)
openssl rand -base64 32 | tr -d "=+/" | cut -c1-25

# Generate JWT secret (64 chars)
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64

# Generate session secret (64 chars)
openssl rand -base64 64 | tr -d "=+/" | cut -c1-64
```

#### **Secret Management Best Practices:**

**For Development:**
- Use the deployment script's auto-generation feature
- Secrets are stored in Pulumi state (local or cloud)
- Rotate secrets between environments

**For Production:**
- Generate secrets using a secure random generator
- Store secrets in a secure vault (AWS Secrets Manager, HashiCorp Vault)
- Rotate secrets regularly (every 90 days recommended)
- Use different secrets for each environment

**Security Considerations:**
- Never commit secrets to version control
- Use environment-specific secrets
- Monitor secret access and usage
- Implement secret rotation procedures

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

### 3. Database Setup

The database is automatically initialized with:
- All required tables (users, links, settings, domains, sessions)
- Default settings (domains, UTM parameters)
- Default domains (localhost:8001, short.example.com)

No manual migration steps required!

## 🌐 Custom Domain Setup

### Get Load Balancer Hostname

```bash
# View all outputs
pulumi stack output

# Get just the load balancer hostname
pulumi stack output loadBalancerDns

# Example output: linkpipe-alb-123456789.us-east-1.elb.amazonaws.com
```

### Configure Custom Domain

```bash
# Set your domain name
pulumi config set linkpipe:domainName your-domain.com

# Deploy the changes
pulumi up
```

### DNS Configuration

1. **Get the load balancer hostname** from the Pulumi output
2. **Create a CNAME record** in your DNS provider pointing to the load balancer
3. **Wait for DNS propagation** (usually 5-15 minutes)
4. **SSL certificate** will be automatically provisioned

**Example DNS Records:**
```
# For root domain
your-domain.com    CNAME   linkpipe-alb-123456789.us-east-1.elb.amazonaws.com

# For subdomain
link.your-domain.com    CNAME   linkpipe-alb-123456789.us-east-1.elb.amazonaws.com
```

**DNS Providers:**
- **Cloudflare**: Add CNAME record in DNS settings
- **Route 53**: Create CNAME record in hosted zone
- **GoDaddy**: Add CNAME record in DNS management
- **Namecheap**: Add CNAME record in domain list

### SSL Certificate

- **Automatic provisioning** via AWS Certificate Manager
- **HTTPS redirect** configured automatically
- **Certificate renewal** handled by AWS
- **Validation** via DNS (recommended) or email

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