#!/bin/bash

# LinkPipe HTTPS Setup Script (Hacky two-step approach)
# This script adds HTTPS support after certificate validation

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 LinkPipe HTTPS Setup (Two-Step Hack)${NC}"
echo ""

# Check if certificate is validated
echo -e "${YELLOW}📋 Checking certificate status...${NC}"

CERT_ARN=$(pulumi stack output certificateArn)
if [ -z "$CERT_ARN" ]; then
    echo -e "${RED}❌ No certificate found. Please deploy with a domain first.${NC}"
    exit 1
fi

echo -e "${BLUE}Certificate ARN: ${CERT_ARN}${NC}"

# Check certificate status
CERT_STATUS=$(aws acm describe-certificate --certificate-arn "$CERT_ARN" --query 'Certificate.Status' --output text)

if [ "$CERT_STATUS" != "ISSUED" ]; then
    echo -e "${YELLOW}⚠️  Certificate is not yet validated (Status: ${CERT_STATUS})${NC}"
    echo -e "${BLUE}Please ensure DNS records are created and wait for validation.${NC}"
    echo -e "${BLUE}You can check status with: aws acm describe-certificate --certificate-arn ${CERT_ARN}${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Certificate is validated!${NC}"

# Get ALB ARN
ALB_ARN=$(aws elbv2 describe-load-balancers --query 'LoadBalancers[?contains(LoadBalancerName, `linkpipe-alb`)].LoadBalancerArn' --output text)
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --query 'TargetGroups[?contains(TargetGroupName, `linkpipe-tg`)].TargetGroupArn' --output text)

if [ -z "$ALB_ARN" ]; then
    echo -e "${RED}❌ Load balancer not found${NC}"
    exit 1
fi

echo -e "${BLUE}Load Balancer ARN: ${ALB_ARN}${NC}"
echo -e "${BLUE}Target Group ARN: ${TARGET_GROUP_ARN}${NC}"

# Check if HTTPS listener already exists
EXISTING_HTTPS=$(aws elbv2 describe-listeners --load-balancer-arn "$ALB_ARN" --query 'Listeners[?Port==`443`].ListenerArn' --output text)

if [ -n "$EXISTING_HTTPS" ]; then
    echo -e "${GREEN}✅ HTTPS listener already exists: ${EXISTING_HTTPS}${NC}"
else
    # Create HTTPS listener
    echo -e "${YELLOW}🔐 Creating HTTPS listener...${NC}"

    HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
        --load-balancer-arn "$ALB_ARN" \
        --protocol HTTPS \
        --port 443 \
        --certificates CertificateArn="$CERT_ARN" \
        --ssl-policy ELBSecurityPolicy-TLS-1-2-2017-01 \
        --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN" \
        --query 'Listeners[0].ListenerArn' \
        --output text)

    echo -e "${GREEN}✅ HTTPS listener created: ${HTTPS_LISTENER_ARN}${NC}"
fi

# Update HTTP listener to redirect to HTTPS
echo -e "${YELLOW}🔄 Updating HTTP listener to redirect to HTTPS...${NC}"

HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners \
    --load-balancer-arn "$ALB_ARN" \
    --query 'Listeners[?Port==`80`].ListenerArn' \
    --output text)

aws elbv2 modify-listener \
    --listener-arn "$HTTP_LISTENER_ARN" \
    --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'

echo -e "${GREEN}✅ HTTP redirect configured${NC}"

# Get application URL
PRIMARY_DOMAIN=$(pulumi config get primaryDomain 2>/dev/null || echo "")
ALB_DNS=$(pulumi stack output loadBalancerDns)

if [ -n "$PRIMARY_DOMAIN" ]; then
    APP_URL="https://${PRIMARY_DOMAIN}"
else
    APP_URL="https://${ALB_DNS}"
fi

echo ""
echo -e "${GREEN}🎉 HTTPS setup complete!${NC}"
echo -e "${BLUE}Application URL: ${APP_URL}${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Test HTTPS access to your application"
echo "2. Verify HTTP to HTTPS redirect works"
echo "3. Check SSL certificate in browser"
echo ""
echo -e "${BLUE}🔍 Useful commands:${NC}"
echo "curl -I ${APP_URL}                    # Test HTTPS response"
echo "curl -I http://${PRIMARY_DOMAIN:-$ALB_DNS}  # Test HTTP redirect" 