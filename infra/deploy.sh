#!/bin/bash

# LinkPipe Infrastructure Deployment Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
STACK_NAME=${1:-dev}
IMAGE_TAG=${2:-latest}
IMAGE_REPO=${3:-mattstratton/linkpipe}

echo -e "${BLUE}🚀 LinkPipe Infrastructure Deployment${NC}"
echo -e "${BLUE}Stack: ${STACK_NAME}${NC}"
echo -e "${BLUE}Image: ${IMAGE_REPO}:${IMAGE_TAG}${NC}"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v pulumi &> /dev/null; then
    echo -e "${RED}❌ Pulumi CLI not found. Please install from https://pulumi.com/docs/get-started/install/${NC}"
    exit 1
fi

if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI not found. Please install and configure AWS CLI${NC}"
    exit 1
fi

if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Please run 'aws configure'${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Prerequisites check passed${NC}"

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Select or create stack
echo -e "${YELLOW}🏗️  Setting up Pulumi stack...${NC}"
if ! pulumi stack select $STACK_NAME 2>/dev/null; then
    echo -e "${YELLOW}Creating new stack: ${STACK_NAME}${NC}"
    pulumi stack init $STACK_NAME
fi

# Configure stack
echo -e "${YELLOW}⚙️  Configuring stack...${NC}"

# Set basic configuration
pulumi config set aws:region us-east-1
pulumi config set linkpipe:imageRepository $IMAGE_REPO
pulumi config set linkpipe:imageTag $IMAGE_TAG

# Check if secrets are already set
if ! pulumi config get linkpipe:dbPassword &>/dev/null; then
    echo -e "${YELLOW}🔐 Setting up secrets...${NC}"
    echo -e "${BLUE}Please enter the following secrets:${NC}"
    
    read -s -p "Database Password: " DB_PASSWORD
    echo
    read -s -p "JWT Secret: " JWT_SECRET
    echo
    read -s -p "Session Secret: " SESSION_SECRET
    echo
    
    pulumi config set --secret linkpipe:dbPassword "$DB_PASSWORD"
    pulumi config set --secret linkpipe:jwtSecret "$JWT_SECRET"
    pulumi config set --secret linkpipe:sessionSecret "$SESSION_SECRET"
    
    echo -e "${GREEN}✅ Secrets configured${NC}"
else
    echo -e "${GREEN}✅ Secrets already configured${NC}"
fi

# Optional domain configuration
read -p "Do you want to configure a custom domain? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "Enter domain name: " DOMAIN_NAME
    pulumi config set linkpipe:domainName $DOMAIN_NAME
    echo -e "${GREEN}✅ Domain configured: ${DOMAIN_NAME}${NC}"
fi

# Preview deployment
echo -e "${YELLOW}👀 Previewing deployment...${NC}"
pulumi preview

# Confirm deployment
echo ""
read -p "Do you want to proceed with deployment? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

# Deploy
echo -e "${YELLOW}🚀 Deploying infrastructure...${NC}"
pulumi up --yes

# Show outputs
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo -e "${BLUE}📊 Deployment Outputs:${NC}"
pulumi stack output

echo ""
echo -e "${GREEN}🎉 LinkPipe is now deployed!${NC}"
echo -e "${BLUE}Application URL: $(pulumi stack output applicationUrl)${NC}"
echo -e "${BLUE}Database Endpoint: $(pulumi stack output databaseEndpoint)${NC}"
echo ""
echo -e "${YELLOW}📝 Next steps:${NC}"
echo "1. Run database migrations: npx prisma migrate deploy"
echo "2. Configure DNS if using custom domain"
echo "3. Set up monitoring and alerts"
echo ""
echo -e "${BLUE}🔍 Useful commands:${NC}"
echo "pulumi logs -f                    # View application logs"
echo "pulumi stack output               # View all outputs"
echo "pulumi destroy                    # Destroy infrastructure" 