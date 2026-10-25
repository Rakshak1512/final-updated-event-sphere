const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

let frontendDir = '.';
if (fs.existsSync(path.join(__dirname, 'smart-event-management-system', 'frontend', 'package.json'))) {
  frontendDir = path.join(__dirname, 'smart-event-management-system', 'frontend');
} else if (fs.existsSync(path.join(__dirname, 'frontend', 'package.json'))) {
  frontendDir = path.join(__dirname, 'frontend');
} else if (fs.existsSync(path.join(__dirname, 'package.json')) && fs.existsSync(path.join(__dirname, 'vite.config.js'))) {
  frontendDir = __dirname;
}

console.log('Building EventSphere frontend from directory:', frontendDir);
execSync(`npm --prefix "${frontendDir}" install`, { stdio: 'inherit' });
execSync(`npm --prefix "${frontendDir}" run build`, { stdio: 'inherit' });

// Ensure dist output exists in all expected output directories for Vercel
const builtDist = path.join(frontendDir, 'dist');
if (fs.existsSync(builtDist)) {
  const targetDirs = [
    path.join(__dirname, 'smart-event-management-system', 'frontend', 'dist'),
    path.join(__dirname, 'frontend', 'dist'),
    path.join(__dirname, 'dist'),
  ];
  for (const target of targetDirs) {
    if (path.resolve(target) !== path.resolve(builtDist)) {
      try {
        fs.cpSync(builtDist, target, { recursive: true, force: true });
        console.log('Synced dist to:', target);
      } catch (e) {
        // ignore
      }
    }
  }
}
