# Multi-Domain HTTPS Setup Guide

This guide explains how to configure LinkPipe to work with multiple domains using external DNS providers and automatic HTTPS.

## Overview

LinkPipe supports multiple domains pointing to the same service with:
- **Automatic HTTPS**: SSL certificates managed by AWS Certificate Manager
- **External DNS**: Works with any DNS provider (GoDaddy, Namecheap, Cloudflare, etc.)
- **Single Certificate**: One certificate covers all configured domains
- **Automatic Redirect**: HTTP traffic automatically redirects to HTTPS

## Prerequisites

1. **Domain Ownership**: You must own the domains you want to use
2. **DNS Access**: Ability to create DNS records in your domain provider
3. **AWS Account**: For SSL certificate management
4. **Pulumi Setup**: Infrastructure code deployed

## Setup Process

### Step 1: Deploy Infrastructure

Deploy the infrastructure with your domains:

```bash
cd infra
./deploy.sh dev latest mattstratton/linkpipe
```

When prompted:
1. **Primary Domain**: Enter your main domain (e.g., `linkpipe.example.com`)
2. **Additional Domains**: Enter any additional domains (e.g., `link2.example.com,link3.example.com`)

### Step 2: Create DNS Records

After deployment, Pulumi will output the required DNS records. You need to create two types of records:

#### A. Certificate Validation Records (Temporary)

These are TXT records for SSL certificate validation. They can be deleted after the certificate is validated.

**Example:**
```
Domain: linkpipe.example.com
Record Type: TXT
Name: _acme-challenge.linkpipe.example.com
Value: [AWS-provided validation string]
TTL: 300
```

#### B. Traffic Routing Records (Permanent)

These are CNAME records that route traffic to your service.

**Example:**
```
Domain: linkpipe.example.com
Record Type: CNAME
Name: linkpipe.example.com
Value: linkpipe-alb-123456789.us-east-1.elb.amazonaws.com
TTL: 300
```

### Step 3: Wait for Validation

- **DNS Propagation**: 5-15 minutes (can take up to 24 hours)
- **Certificate Validation**: Automatic once DNS records are created
- **HTTPS Activation**: Manual step after certificate validation

### Step 4: Enable HTTPS

After the certificate is validated, enable HTTPS:

```bash
cd infra
./add-https.sh
```

This script will:
1. Check certificate validation status
2. Create HTTPS listener (port 443)
3. Update HTTP listener to redirect to HTTPS
4. Provide the final HTTPS URL

**Note**: This is a post-deployment step because Pulumi cannot wait for certificate validation status. The certificate must be validated before HTTPS can be enabled.

## DNS Provider Instructions

### GoDaddy

1. **Access DNS Management**:
   - Log into GoDaddy
   - Go to "My Products" → "DNS"
   - Click "Manage" next to your domain

2. **Add TXT Record** (Certificate Validation):
   - Click "Add" → "TXT"
   - Name: `_acme-challenge.linkpipe.example.com`
   - Value: [AWS validation string]
   - TTL: 5 minutes

3. **Add CNAME Record** (Traffic Routing):
   - Click "Add" → "CNAME"
   - Name: `linkpipe.example.com`
   - Value: [ALB DNS name]
   - TTL: 5 minutes

### Namecheap

1. **Access Advanced DNS**:
   - Log into Namecheap
   - Go to "Domain List" → "Manage"
   - Click "Advanced DNS"

2. **Add TXT Record**:
   - Click "Add New Record"
   - Type: TXT Record
   - Host: `_acme-challenge.linkpipe.example.com`
   - Value: [AWS validation string]
   - TTL: Automatic

3. **Add CNAME Record**:
   - Click "Add New Record"
   - Type: CNAME Record
   - Host: `linkpipe.example.com`
   - Value: [ALB DNS name]
   - TTL: Automatic

### Cloudflare

1. **Access DNS Settings**:
   - Log into Cloudflare
   - Select your domain
   - Go to "DNS" tab

2. **Add TXT Record**:
   - Click "Add record"
   - Type: TXT
   - Name: `_acme-challenge.linkpipe.example.com`
   - Content: [AWS validation string]
   - TTL: Auto

3. **Add CNAME Record**:
   - Click "Add record"
   - Type: CNAME
   - Name: `linkpipe.example.com`
   - Target: [ALB DNS name]
   - TTL: Auto

4. **SSL/TLS Settings**:
   - Go to "SSL/TLS" tab
   - Set encryption mode to "Full" or "Full (strict)"

### Route 53 (AWS DNS)

1. **Create Hosted Zone**:
   - Go to Route 53 console
   - Create hosted zone for your domain
   - Update nameservers at your domain registrar

2. **Add Records**:
   - Create TXT record for certificate validation
   - Create CNAME record for traffic routing

## Adding Additional Domains

To add more domains after initial deployment:

### Step 1: Update Configuration

```bash
cd infra

# Add new domains to configuration
pulumi config set --path additionalDomains '["link2.example.com", "link3.example.com", "newdomain.example.com"]'

# Deploy changes
pulumi up --yes
```

### Step 2: Create DNS Records

Create the same DNS records for each new domain:
- TXT record for certificate validation
- CNAME record for traffic routing

### Step 3: Verify

Check that all domains work:
```bash
curl -I https://newdomain.example.com
```

## Troubleshooting

### Certificate Validation Fails

**Symptoms**: Certificate remains in "Pending validation" status

**Solutions**:
1. **Verify DNS Records**:
   ```bash
   # Check TXT record
   dig TXT _acme-challenge.linkpipe.example.com
   
   # Check CNAME record
   dig CNAME linkpipe.example.com
   ```

2. **Check TTL Values**: Use 300 seconds for faster propagation

3. **Wait for Propagation**: DNS changes can take up to 24 hours

4. **Verify Domain Ownership**: Ensure you own the domain

### HTTPS Not Working

**Symptoms**: Domain resolves but HTTPS doesn't work

**Solutions**:
1. **Check Certificate Status**:
   ```bash
   pulumi stack output certificateArn
   aws acm describe-certificate --certificate-arn [certificate-arn]
   ```

2. **Verify HTTPS Listener**:
   - Check that HTTPS listener (port 443) exists
   - Verify certificate is attached to listener

3. **Check Security Groups**:
   - Ensure port 443 is allowed in ALB security group

### Domain Not Resolving

**Symptoms**: Domain doesn't resolve to your service

**Solutions**:
1. **Verify CNAME Record**:
   ```bash
   dig CNAME linkpipe.example.com
   ```

2. **Check DNS Propagation**:
   - Use online DNS checkers
   - Test from different locations

3. **Verify Domain Registrar**:
   - Ensure nameservers are correct
   - Check domain status

### Browser Security Warnings

**Symptoms**: Browser shows security warnings

**Solutions**:
1. **Check Certificate Chain**: Ensure full certificate chain is provided
2. **Verify Domain Match**: Certificate domain must match accessed domain
3. **Clear Browser Cache**: Clear SSL state and cache

## Monitoring and Maintenance

### Certificate Renewal

AWS Certificate Manager automatically renews certificates before expiration. No manual intervention required.

### Domain Health Checks

Monitor domain health:
```bash
# Check certificate status
aws acm list-certificates --query 'CertificateSummaryList[?DomainName==`linkpipe.example.com`]'

# Check ALB health
aws elbv2 describe-target-health --target-group-arn [target-group-arn]
```

### Logs and Monitoring

- **CloudWatch Logs**: Application logs
- **ALB Access Logs**: HTTP/HTTPS request logs
- **Certificate Events**: ACM certificate status changes

## Best Practices

### DNS Management

1. **Use Low TTL**: Use 300 seconds for faster updates
2. **Monitor Propagation**: Use DNS checkers to verify changes
3. **Document Changes**: Keep records of DNS changes
4. **Test Regularly**: Periodically test all domains

### Security

1. **Strong Passwords**: Use strong secrets for database and JWT
2. **Regular Updates**: Keep infrastructure and application updated
3. **Monitor Access**: Monitor for unauthorized access
4. **Backup Strategy**: Regular backups of database and configuration

### Performance

1. **CDN Consideration**: Use CloudFront for global distribution
2. **Caching**: Implement appropriate caching headers
3. **Monitoring**: Monitor response times and error rates
4. **Scaling**: Use auto-scaling for traffic spikes

## Common Issues and Solutions

### Issue: Certificate Validation Timeout

**Cause**: DNS records not created or not propagated

**Solution**:
1. Verify DNS records are created correctly
2. Wait for DNS propagation
3. Check domain ownership

### Issue: Mixed Content Warnings

**Cause**: Application serving HTTP content over HTTPS

**Solution**:
1. Ensure all resources use HTTPS
2. Update application to use relative URLs
3. Configure CSP headers properly

### Issue: SSL Handshake Failures

**Cause**: Certificate not properly configured

**Solution**:
1. Verify certificate is attached to HTTPS listener
2. Check certificate domain matches accessed domain
3. Ensure certificate is validated

## Support

If you encounter issues:

1. **Check Logs**: Review CloudWatch logs for errors
2. **Verify Configuration**: Double-check DNS records and configuration
3. **Test Incrementally**: Test each component separately
4. **Document Issues**: Keep detailed notes of problems and solutions

## Resources

- [AWS Certificate Manager Documentation](https://docs.aws.amazon.com/acm/)
- [Application Load Balancer Documentation](https://docs.aws.amazon.com/elasticloadbalancing/)
- [DNS Best Practices](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/dns-best-practices.html)
- [SSL/TLS Configuration](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html) 