#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

console.log('🔍 Checking for processes on port 3001...\n');

// Check for processes on port 3001
const command = os.platform() === 'win32' 
  ? 'netstat -ano | findstr :3001'
  : 'lsof -i :3001';

exec(command, (error, stdout, stderr) => {
  if (error) {
    console.log('✅ No processes found on port 3001');
    console.log('This means the connection error is likely from:');
    console.log('1. A browser extension trying to connect to a dev server');
    console.log('2. Cached configuration from a previous setup');
    console.log('3. A development tool or extension');
  } else {
    console.log('⚠️  Found processes on port 3001:');
    console.log(stdout);
  }
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Clear browser cache and cookies');
  console.log('2. Disable browser extensions temporarily');
  console.log('3. Try opening in an incognito/private window');
  console.log('4. Check if any development tools are running');
  console.log('5. Restart your development server with: npm run dev');
  
  console.log('\n🚀 To start the development server:');
  console.log('npm run dev');
  console.log('This will start the server on http://localhost:3000');
}); 