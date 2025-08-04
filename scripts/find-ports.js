#!/usr/bin/env node

const net = require('net');
const fs = require('fs');
const path = require('path');

/**
 * Check if a port is available
 */
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Find the next available port starting from a given port
 */
async function findAvailablePort(startPort) {
  let port = startPort;
  while (port < startPort + 100) { // Check up to 100 ports
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

/**
 * Generate .env file with available ports
 */
async function generatePortsEnv() {
  console.log('🔍 Finding available ports...');
  
  const services = [
    { name: 'FRONTEND_PORT', preferred: 3000 },
    { name: 'BACKEND_PORT', preferred: 8000 },
    { name: 'REDIRECT_PORT', preferred: 8001 },
    { name: 'DYNAMODB_PORT', preferred: 8002 },
    { name: 'DYNAMODB_ADMIN_PORT', preferred: 8003 },
  ];
  
  const ports = {};
  let currentPort = 3000;
  
  for (const service of services) {
    // First try the preferred port
    if (await isPortAvailable(service.preferred)) {
      ports[service.name] = service.preferred;
      console.log(`✅ ${service.name}: ${service.preferred} (preferred)`);
    } else {
      // Find next available port
      const availablePort = await findAvailablePort(currentPort);
      ports[service.name] = availablePort;
      currentPort = availablePort + 1;
      console.log(`⚠️  ${service.name}: ${availablePort} (${service.preferred} was busy)`);
    }
  }
  
  // Read existing .env or create from example
  const envPath = path.join(__dirname, '..', '.env');
  const envExamplePath = path.join(__dirname, '..', '.env.example');
  
  let envContent = '';
  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  } else if (fs.existsSync(envExamplePath)) {
    envContent = fs.readFileSync(envExamplePath, 'utf8');
  }
  
  // Update port values in env content
  for (const [key, value] of Object.entries(ports)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (envContent.match(regex)) {
      envContent = envContent.replace(regex, `${key}=${value}`);
    } else {
      envContent += `\n${key}=${value}`;
    }
  }
  
  // Update API URLs based on found ports
  envContent = envContent.replace(
    /^VITE_API_URL=.*$/m,
    `VITE_API_URL=http://localhost:${ports.BACKEND_PORT}`
  );
  envContent = envContent.replace(
    /^VITE_REDIRECT_URL=.*$/m,
    `VITE_REDIRECT_URL=http://localhost:${ports.REDIRECT_PORT}`
  );
  
  // Write updated .env file
  fs.writeFileSync(envPath, envContent);
  
  console.log('\n🎉 Generated .env file with available ports!');
  console.log('\n📋 Your services will be available at:');
  console.log(`   Frontend:       http://localhost:${ports.FRONTEND_PORT}`);
  console.log(`   API:            http://localhost:${ports.BACKEND_PORT}`);
  console.log(`   Redirect:       http://localhost:${ports.REDIRECT_PORT}`);
  console.log(`   DynamoDB:       http://localhost:${ports.DYNAMODB_PORT}`);
  console.log(`   DynamoDB Admin: http://localhost:${ports.DYNAMODB_ADMIN_PORT}`);
  console.log('\n💡 You can now run: npm run dev');
}

if (require.main === module) {
  generatePortsEnv().catch(console.error);
}

module.exports = { findAvailablePort, isPortAvailable }; 