import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as docker from "@pulumi/docker";

// Configuration
const config = new pulumi.Config();
const imageTag = config.get("imageTag") || "latest";
const imageRepository = config.get("imageRepository") || "mattstratton/linkpipe";
const primaryDomain = config.get("primaryDomain");
const additionalDomains = config.getObject<string[]>("additionalDomains") || [];
const dbPassword = config.requireSecret("dbPassword");
const jwtSecret = config.requireSecret("jwtSecret");
const sessionSecret = config.requireSecret("sessionSecret");

// VPC and Networking
const vpc = new awsx.ec2.Vpc("linkpipe-vpc", {
    numberOfAvailabilityZones: 2,
    tags: {
        Name: "linkpipe-vpc",
        Environment: "production"
    }
});

// Security Groups
const dbSecurityGroup = new aws.ec2.SecurityGroup("linkpipe-db-sg", {
    vpcId: vpc.vpcId,
    description: "Security group for LinkPipe RDS database",
    ingress: [{
        protocol: "tcp",
        fromPort: 5432,
        toPort: 5432,
        cidrBlocks: ["0.0.0.0/0"]
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"]
    }],
    tags: {
        Name: "linkpipe-db-sg"
    }
});

const appSecurityGroup = new aws.ec2.SecurityGroup("linkpipe-app-sg", {
    vpcId: vpc.vpcId,
    description: "Security group for LinkPipe application",
    ingress: [
        {
            protocol: "tcp",
            fromPort: 80,
            toPort: 80,
            cidrBlocks: ["0.0.0.0/0"]
        },
        {
            protocol: "tcp",
            fromPort: 443,
            toPort: 443,
            cidrBlocks: ["0.0.0.0/0"]
        },
        {
            protocol: "tcp",
            fromPort: 8000,
            toPort: 8000,
            cidrBlocks: ["0.0.0.0/0"]
        }
    ],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"]
    }],
    tags: {
        Name: "linkpipe-app-sg"
    }
});

// RDS Subnet Group
const dbSubnetGroup = new aws.rds.SubnetGroup("linkpipe-db-subnet-group", {
    subnetIds: vpc.privateSubnetIds,
    tags: {
        Name: "linkpipe-db-subnet-group"
    }
});

// RDS Database
const db = new aws.rds.Instance("linkpipe-db", {
    engine: "postgres",
    instanceClass: "db.t3.micro",
    allocatedStorage: 20,
    storageType: "gp2",
    dbName: "linkpipe",
    username: "linkpipe",
    password: dbPassword,
    skipFinalSnapshot: true,
    vpcSecurityGroupIds: [dbSecurityGroup.id],
    dbSubnetGroupName: dbSubnetGroup.name,
    tags: {
        Name: "linkpipe-db"
    }
});

// Note: Database initialization will be handled by the application startup
// The application will create tables and seed data on first run

// ECS Task Execution Role
const taskExecutionRole = new aws.iam.Role("linkpipe-task-execution-role", {
    assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
        Service: "ecs-tasks.amazonaws.com"
    }),
    managedPolicyArns: [
        "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
    ]
});

// ECS Cluster
const cluster = new aws.ecs.Cluster("linkpipe-cluster", {
    settings: [{
        name: "containerInsights",
        value: "enabled"
    }],
    tags: {
        Name: "linkpipe-cluster"
    }
});

// ECS Task Definition
const taskDefinition = new aws.ecs.TaskDefinition("linkpipe-task", {
    family: "linkpipe",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    cpu: "256",
    memory: "512",
    executionRoleArn: taskExecutionRole.arn,
    containerDefinitions: pulumi.jsonStringify([{
        name: "linkpipe",
        image: `${imageRepository}:${imageTag}`,
        portMappings: [{
            containerPort: 8000,
            protocol: "tcp"
        }],
        environment: [
            { name: "NODE_ENV", value: "production" },
            { name: "SERVE_STATIC", value: "true" },
            { name: "POSTGRES_HOST", value: db.endpoint },
            { name: "POSTGRES_PORT", value: "5432" },
            { name: "POSTGRES_DB", value: "linkpipe" },
            { name: "POSTGRES_USER", value: "linkpipe" },
            { name: "POSTGRES_PASSWORD", value: dbPassword },
            { name: "JWT_SECRET", value: jwtSecret },
            { name: "SESSION_SECRET", value: sessionSecret }
        ],
        logConfiguration: {
            logDriver: "awslogs",
            options: {
                "awslogs-group": "/ecs/linkpipe",
                "awslogs-region": aws.config.region,
                "awslogs-stream-prefix": "ecs"
            }
        }
    }]),
    tags: {
        Name: "linkpipe-task"
    }
});

// CloudWatch Log Group
const logGroup = new aws.cloudwatch.LogGroup("linkpipe-logs", {
    name: "/ecs/linkpipe",
    retentionInDays: 7,
    tags: {
        Name: "linkpipe-logs"
    }
});

// Application Load Balancer
const alb = new aws.lb.LoadBalancer("linkpipe-alb", {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [appSecurityGroup.id],
    subnets: vpc.publicSubnetIds,
    enableDeletionProtection: false,
    tags: {
        Name: "linkpipe-alb"
    }
});

// ALB Target Group
const targetGroup = new aws.lb.TargetGroup("linkpipe-tg", {
    port: 8000,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpc.vpcId,
    healthCheck: {
        enabled: true,
        path: "/health",
        port: "8000",
        protocol: "HTTP",
        healthyThreshold: 2,
        unhealthyThreshold: 10,
        timeout: 30,
        interval: 60
    },
    tags: {
        Name: "linkpipe-tg"
    }
});

// SSL Certificate for Multi-Domain Support
let certificate: aws.acm.Certificate | undefined;

if (primaryDomain) {
    // Create certificate with primary domain and additional domains
    const allDomains = [primaryDomain, ...additionalDomains];
    certificate = new aws.acm.Certificate("linkpipe-cert", {
        domainName: primaryDomain,
        subjectAlternativeNames: additionalDomains.length > 0 ? additionalDomains : undefined,
        validationMethod: "DNS",
        tags: {
            Name: "linkpipe-multi-domain-cert"
        }
    });

    // Output certificate validation records
    certificate.domainValidationOptions.apply(validations => {
        console.log("\n🔐 SSL Certificate Validation Required:");
        console.log("Create the following DNS records for certificate validation:");
        validations.forEach((validation, index) => {
            const domain = allDomains[index];
            console.log(`\nDomain: ${domain}`);
            console.log(`Record Type: CNAME`);
            console.log(`Name: ${validation.resourceRecordName}`);
            console.log(`Value: ${validation.resourceRecordValue}`);
        });
    });
}

// HTTP Listener (Primary - forwards to application)
const httpListener = new aws.lb.Listener("linkpipe-http-listener", {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn
    }]
});

// Note: HTTPS listener will be added manually after certificate validation
// Run: cd infra && ./add-https.sh

// ECS Service
const service = new aws.ecs.Service("linkpipe-service", {
    cluster: cluster.arn,
    taskDefinition: taskDefinition.arn,
    desiredCount: 1,
    launchType: "FARGATE",
    networkConfiguration: {
        subnets: vpc.privateSubnetIds,
        securityGroups: [appSecurityGroup.id],
        assignPublicIp: false
    },
    loadBalancers: [{
        targetGroupArn: targetGroup.arn,
        containerName: "linkpipe",
        containerPort: 8000
    }],
    tags: {
        Name: "linkpipe-service"
    }
});

// Auto Scaling Group (optional - for high availability)
const scalingTarget = new aws.appautoscaling.Target("linkpipe-scaling-target", {
    maxCapacity: 3,
    minCapacity: 1,
    resourceId: pulumi.interpolate`service/${cluster.name}/${service.name}`,
    scalableDimension: "ecs:service:DesiredCount",
    serviceNamespace: "ecs"
});

const scalingPolicy = new aws.appautoscaling.Policy("linkpipe-scaling-policy", {
    policyType: "TargetTrackingScaling",
    resourceId: scalingTarget.resourceId,
    scalableDimension: scalingTarget.scalableDimension,
    serviceNamespace: scalingTarget.serviceNamespace,
    targetTrackingScalingPolicyConfiguration: {
        predefinedMetricSpecification: {
            predefinedMetricType: "ECSServiceAverageCPUUtilization"
        },
        targetValue: 70.0
    }
});

// Output DNS setup instructions
if (primaryDomain) {
    const allDomains = [primaryDomain, ...additionalDomains];
    console.log("\n🌐 Multi-Domain Setup Instructions:");
    console.log("=====================================");
    console.log(`Primary Domain: ${primaryDomain}`);
    if (additionalDomains.length > 0) {
        console.log(`Additional Domains: ${additionalDomains.join(", ")}`);
    }
    console.log(`\n📋 Required DNS Records:`);
    console.log(`\n1. Certificate Validation Records (see above)`);
    // Use apply to handle the Output properly
    alb.dnsName.apply(dnsName => {
        console.log(`\n2. Traffic Routing Records:`);
        allDomains.forEach(domain => {
            console.log(`   Domain: ${domain}`);
            console.log(`   Record Type: CNAME`);
            console.log(`   Name: ${domain}`);
            console.log(`   Value: ${dnsName}`);
            console.log(`   TTL: 300 (or your provider's default)`);
            console.log("");
        });
        console.log(`\n3. Optional: www subdomain records`);
        allDomains.forEach(domain => {
            console.log(`   Domain: www.${domain}`);
            console.log(`   Record Type: CNAME`);
            console.log(`   Name: www.${domain}`);
            console.log(`   Value: ${dnsName}`);
            console.log(`   TTL: 300 (or your provider's default)`);
            console.log("");
        });
    });
}

// Outputs
export const vpcId = vpc.vpcId;
export const clusterName = cluster.name;
export const serviceName = service.name;
export const loadBalancerDns = alb.dnsName;
export const databaseEndpoint = db.endpoint;
export const databasePort = db.port;
export const applicationUrl = pulumi.interpolate`http://${primaryDomain || alb.dnsName}`;
export const certificateArn = certificate?.arn;
export const supportedDomains = primaryDomain ? [primaryDomain, ...additionalDomains] : [alb.dnsName]; 