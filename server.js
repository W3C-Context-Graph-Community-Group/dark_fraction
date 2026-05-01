import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const ROOT = dirname(fileURLToPath(import.meta.url));

// Start event bus (WebSocket on port 8080)
const bus = spawn('node', ['lib/event-bus/server.js'], { cwd: ROOT, stdio: 'inherit' });

// Start static file server (HTTP on port 3000)
const serve = spawn('npx', ['serve', ROOT, '-l', '3000'], { cwd: ROOT, stdio: 'inherit' });

// If either exits, kill the other
bus.on('close', (code) => { serve.kill(); process.exit(code); });
serve.on('close', (code) => { bus.kill(); process.exit(code); });

// Forward Ctrl-C to both
process.on('SIGINT', () => { bus.kill(); serve.kill(); });
process.on('SIGTERM', () => { bus.kill(); serve.kill(); });
