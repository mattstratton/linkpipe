# LinkPipe Infrastructure

This directory contains the Pulumi infrastructure code for deploying LinkPipe to AWS.

## Prerequisites

- [Pulumi CLI](https://www.pulumi.com/docs/install/)
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- Docker image built and pushed to a registry (GitHub Container Registry or Docker Hub)

## Configuration

Create a `Pulumi.yaml` file in this directory with your configuration:

```yaml
name: linkpipe
runtime: nodejs
description: LinkPipe infrastructure
```

### Required Configuration

Set the following configuration values:

```bash
# Database password (minimum 8 characters)
pulumi config set dbPassword "your-secure-db-password"

# JWT secret (minimum 32 characters)
pulumi config set jwtSecret "your-jwt-secret-at-least-32-characters-long"

# Session secret (minimum 32 characters)
pulumi config set sessionSecret "your-session-secret-at-least-32-characters-long"
```

### Optional Configuration

```bash
# Docker image repository (default: mattstratton/linkpipe)
pulumi config set imageRepository "your-registry/linkpipe"

# Docker image tag (default: latest)
pulumi config set imageTag "v1.0.0"

# Primary domain for HTTPS (e.g., "linkpipe.example.com")
pulumi config set primaryDomain "your-domain.com"

# Additional domains for multi-domain support
pulumi config set --path additionalDomains '["link2.example.com", "link3.example.com"]'
```

## Multi-Domain HTTPS Setup

LinkPipe supports multiple domains pointing to the same service with automatic HTTPS. This works with any external DNS provider (GoDaddy, Namecheap, Cloudflare, etc.).

### How It Works

1. **Single Certificate**: One SSL certificate covers all configured domains
2. **DNS Validation**: Certificate validation via DNS records (no AWS DNS required)
3. **Two-Step Process**: Deploy with HTTP first, then enable HTTPS after certificate validation
4. **External DNS**: Works with any DNS provider

### Setup Process

#### 1. Deploy Infrastructure

```bash
# Deploy with your primary domain
pulumi config set primaryDomain "linkpipe.example.com"
pulumi up --yes
```

#### 2. Create DNS Records

After deployment, Pulumi will output the required DNS records. You'll need to create two types of records:

**A. Certificate Validation Records**
These are temporary TXT records for SSL certificate validation:

```
Domain: linkpipe.example.com
Record Type: TXT
Name: _acme-challenge.linkpipe.example.com
Value: [AWS-provided validation string]
TTL: 300
```

**B. Traffic Routing Records**
These are permanent CNAME records to route traffic to your service:

```
Domain: linkpipe.example.com
Record Type: CNAME
Name: linkpipe.example.com
Value: [ALB DNS name from outputs]
TTL: 300
```

#### 3. Wait for Validation

- **DNS Propagation**: 5-15 minutes (can take up to 24 hours)
- **Certificate Validation**: Automatic once DNS records are created
- **HTTPS Activation**: Automatic once certificate is validated

**Note**: The infrastructure will automatically enable HTTPS once the certificate is validated. No manual steps required.

### DNS Provider Instructions

#### GoDaddy
1. Go to DNS Management
2. Add CNAME record for your domain
3. Add TXT record for certificate validation
4. Wait for propagation (usually 5-15 minutes)

#### Namecheap
1. Go to Advanced DNS
2. Add CNAME record for your domain
3. Add TXT record for certificate validation
4. Wait for propagation

#### Cloudflare
1. Go to DNS settings
2. Add CNAME record for your domain
3. Add TXT record for certificate validation
4. Ensure SSL/TLS is set to "Full" or "Full (strict)"

#### Route 53 (if using AWS DNS)
1. Create hosted zone for your domain
2. Update nameservers at your domain registrar
3. Create CNAME and TXT records as specified

### Certificate Validation

The SSL certificate will be automatically validated once the DNS records are created and propagated. This typically takes 5-15 minutes but can take up to 24 hours.

To check certificate status:
```bash
pulumi stack output certificateArn
aws acm describe-certificate --certificate-arn [certificate-arn]
```

### Troubleshooting

#### Certificate Validation Fails
- Verify DNS records are created correctly
- Check TTL values (use 300 seconds for faster propagation)
- Wait for DNS propagation (can take up to 24 hours)
- Verify domain ownership

#### HTTPS Not Working
- Check that certificate is validated
- Verify HTTPS listener is created
- Check security group allows port 443
- Verify DNS CNAME points to correct ALB

#### Domain Not Resolving
- Verify CNAME record is created
- Check DNS propagation
- Verify domain registrar settings
- Test with `nslookup` or `dig`

## Database Setup

The database is automatically initialized by the application during startup. No manual migration steps are required.

## Secret Requirements

| Secret | Minimum Length | Description | Generation Command |
|--------|---------------|-------------|-------------------|
| `dbPassword` | 8 characters | PostgreSQL database password | `openssl rand -base64 12` |
| `jwtSecret` | 32 characters | JWT token signing secret | `openssl rand -base64 32` |
| `sessionSecret` | 32 characters | Express session secret | `openssl rand -base64 32` |

### Secret Management Best Practices

1. **Use Strong Secrets**: Generate random secrets using `openssl rand -base64`
2. **Rotate Regularly**: Update secrets periodically
3. **Secure Storage**: Use Pulumi's secret management
4. **Environment Separation**: Use different secrets for dev/staging/prod

## Deployment

```bash
# Deploy to AWS
pulumi up --yes

# View outputs
pulumi stack output

# Destroy infrastructure (if needed)
pulumi destroy --yes
```

## Outputs

After deployment, you'll get the following outputs:

- `applicationUrl`: The HTTPS URL for your application
- `loadBalancerDns`: The ALB DNS name for CNAME records
- `databaseEndpoint`: RDS database endpoint
- `certificateArn`: SSL certificate ARN
- `supportedDomains`: List of all configured domains

## Architecture

The infrastructure creates:

- **VPC**: Isolated network with public and private subnets
- **RDS**: PostgreSQL database in private subnet
- **ECS Fargate**: Containerized application
- **ALB**: Load balancer with HTTPS support
- **ACM**: SSL certificate for HTTPS
- **CloudWatch**: Logging and monitoring
- **Auto Scaling**: Automatic scaling based on CPU usage

## Security

- Database is in private subnet
- Application uses HTTPS only
- Security groups restrict access
- Secrets are encrypted
- HSTS headers enabled
- CSP headers configured

## Monitoring

- CloudWatch logs for application
- ALB access logs
- RDS monitoring
- Auto scaling metrics

## Cost Optimization

- Use t3.micro for RDS (free tier eligible)
- Single ECS task for development
- Auto scaling prevents over-provisioning
- CloudWatch logs retention set to 7 days

## Custom Domain Setup

For custom domains with external DNS providers:

1. **Deploy with domain**: Set `primaryDomain` in config
2. **Create DNS records**: Follow the output instructions
3. **Wait for validation**: Certificate validation takes 5-15 minutes
4. **Test access**: Verify HTTPS works with your domain

The system supports multiple domains pointing to the same service, making it easy to add additional domains later. 