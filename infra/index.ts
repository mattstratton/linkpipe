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
    subnets: [
        { type: "public", mapPublicIpOnLaunch: true },
        { type: "private" }
    ],
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
        securityGroups: [vpc.defaultSecurityGroupId]
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
    executionRoleArn: aws.iam.getRole({ name: "ecsTaskExecutionRole" }).then(role => role.arn),
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
    dependsOn: [listener],
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
export const applicationUrl = domainName ? `https://${domainName}` : `http://${alb.dnsName}`; 