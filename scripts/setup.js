#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Setting up LinkPipe development environment...');

// Make shell scripts executable (Unix systems only)
if (process.platform !== 'win32') {
  try {
    const scriptsDir = path.join(__dirname);
    const shellScripts = fs.readdirSync(scriptsDir).filter(file => file.endsWith('.sh'));
    
    for (const script of shellScripts) {
      const scriptPath = path.join(scriptsDir, script);
      try {
        execSync(`chmod +x "${scriptPath}"`, { stdio: 'ignore' });
        console.log(`✅ Made ${script} executable`);
      } catch (error) {
        console.log(`⚠️  Could not make ${script} executable (this is usually fine)`);
      }
    }
  } catch (error) {
    console.log('⚠️  Could not process shell scripts (this is usually fine)');
  }
}

// Check if .env exists, if not, suggest creating one
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('');
  console.log('📝 No .env file found.');
  console.log('💡 Run "npm run dev" to automatically create one with available ports.');
  console.log('');
} else {
  console.log('✅ Found existing .env file');
}

console.log('🎉 Setup complete! You can now run:');
console.log('   npm run dev        # Start with auto port detection');
console.log('   npm run dev:force  # Start with existing configuration');
console.log(''); 