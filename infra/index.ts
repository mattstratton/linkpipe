import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as docker from "@pulumi/docker";

// Configuration
const config = new pulumi.Config();
const imageTag = config.get("imageTag") || "latest";
const imageRepository = config.get("imageRepository") || "mattstratton/linkpipe";
const domainName = config.get("domainName");
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

// Database initialization Lambda function
const dbInitFunction = new aws.lambda.Function("linkpipe-db-init", {
    runtime: "nodejs18.x",
    handler: "index.handler",
    role: new aws.iam.Role("linkpipe-db-init-role", {
        assumeRolePolicy: aws.iam.assumeRolePolicyForPrincipal({
            Service: "lambda.amazonaws.com"
        }),
        managedPolicyArns: [
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
        ],
        inlinePolicies: [{
            name: "rds-access",
            policy: JSON.stringify({
                Version: "2012-10-17",
                Statement: [{
                    Effect: "Allow",
                    Action: [
                        "rds:DescribeDBInstances",
                        "rds:DescribeDBClusters"
                    ],
                    Resource: "*"
                }]
            })
        }]
    }).arn,
    code: new pulumi.asset.AssetArchive({
        "index.js": new pulumi.asset.StringAsset(`
const { Client } = require('pg');

exports.handler = async (event) => {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        
        // Create tables if they don't exist
        await client.query(\`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(255) UNIQUE NOT NULL,
                name VARCHAR(255),
                avatar VARCHAR(255),
                provider VARCHAR(50) DEFAULT 'basic',
                provider_id VARCHAR(255),
                password VARCHAR(255),
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS links (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                slug VARCHAR(50) UNIQUE NOT NULL,
                url TEXT NOT NULL,
                domain VARCHAR(255) DEFAULT 'localhost:8001',
                utm_source VARCHAR(255),
                utm_medium VARCHAR(255),
                utm_campaign VARCHAR(255),
                utm_term VARCHAR(255),
                utm_content VARCHAR(255),
                description TEXT,
                tags TEXT[],
                is_active BOOLEAN DEFAULT true,
                click_count INTEGER DEFAULT 0,
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS settings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                key VARCHAR(255) UNIQUE NOT NULL,
                value JSONB NOT NULL,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            
            CREATE TABLE IF NOT EXISTS domains (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name VARCHAR(255) UNIQUE NOT NULL,
                is_default BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        \`);
        
        // Insert default data
        await client.query(\`
            INSERT INTO settings (key, value, description) VALUES 
            ('domains', '["localhost:8001", "short.example.com"]', 'Available domains for short links'),
            ('utm_sources', '["newsletter", "social", "website", "blog", "email", "direct", "referral", "organic", "paid"]', 'Predefined UTM sources'),
            ('utm_mediums', '["email", "social", "cpc", "banner", "affiliate", "referral", "direct", "organic", "print", "video"]', 'Predefined UTM mediums'),
            ('utm_campaigns', '["spring_sale", "summer_promotion", "black_friday", "product_launch", "webinar", "newsletter_signup"]', 'Predefined UTM campaigns')
            ON CONFLICT (key) DO NOTHING;
            
            INSERT INTO domains (name, is_default) VALUES 
            ('localhost:8001', true),
            ('short.example.com', false)
            ON CONFLICT (name) DO NOTHING;
        \`);
        
        return { statusCode: 200, body: 'Database initialized successfully' };
    } catch (error) {
        console.error('Database initialization failed:', error);
        throw error;
    } finally {
        await client.end();
    }
};
        `),
        "package.json": new pulumi.asset.StringAsset(JSON.stringify({
            name: "linkpipe-db-init",
            version: "1.0.0",
            dependencies: {
                pg: "^8.11.0"
            }
        }))
    }),
    environment: {
        variables: {
            DB_HOST: db.endpoint,
            DB_PORT: "5432",
            DB_NAME: "linkpipe",
            DB_USER: "linkpipe",
            DB_PASSWORD: dbPassword
        }
    },
    timeout: 300
});

// Invoke database initialization after RDS is ready
const dbInit = new aws.lambda.Invocation("linkpipe-db-init-invoke", {
    functionName: dbInitFunction.name,
    input: JSON.stringify({}),
    qualifier: dbInitFunction.version
}, { dependsOn: [db] });

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
            { name: "POSTGRES_USER", value: "linkpipe" }
        ],
        secrets: [
            { name: "POSTGRES_PASSWORD", valueFrom: dbPassword },
            { name: "JWT_SECRET", valueFrom: jwtSecret },
            { name: "SESSION_SECRET", valueFrom: sessionSecret }
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

// ALB Listener
const listener = new aws.lb.Listener("linkpipe-listener", {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [{
        type: "forward",
        targetGroupArn: targetGroup.arn
    }]
});

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
}, { dependsOn: [listener, dbInit] });

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

// Route 53 and SSL Certificate (if domain is provided)
let certificate: aws.acm.Certificate | undefined;
let record: aws.route53.Record | undefined;

if (domainName) {
    certificate = new aws.acm.Certificate("linkpipe-cert", {
        domainName: domainName,
        validationMethod: "DNS",
        tags: {
            Name: "linkpipe-cert"
        }
    });

    // HTTPS Listener
    const httpsListener = new aws.lb.Listener("linkpipe-https-listener", {
        loadBalancerArn: alb.arn,
        port: 443,
        protocol: "HTTPS",
        sslPolicy: "ELBSecurityPolicy-TLS-1-2-2017-01",
        certificateArn: certificate.arn,
        defaultActions: [{
            type: "forward",
            targetGroupArn: targetGroup.arn
        }]
    });

    // Route 53 Zone (assuming it exists)
    const zone = aws.route53.getZone({ name: domainName });
    
    record = new aws.route53.Record("linkpipe-record", {
        zoneId: zone.then(z => z.zoneId),
        name: domainName,
        type: "A",
        aliases: [{
            name: alb.dnsName,
            zoneId: alb.zoneId,
            evaluateTargetHealth: true
        }]
    });
}

// Outputs
export const vpcId = vpc.vpcId;
export const clusterName = cluster.name;
export const serviceName = service.name;
export const loadBalancerDns = alb.dnsName;
export const databaseEndpoint = db.endpoint;
export const databasePort = db.port;
export const applicationUrl = domainName ? 
    pulumi.interpolate`https://${domainName}` : 
    pulumi.interpolate`http://${alb.dnsName}`; 