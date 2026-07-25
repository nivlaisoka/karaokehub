#!/bin/bash
# Simple start script that builds and runs the server
cd /root/karaokehub/client
npx vite build --logLevel silent 2>&1

cd /root/karaokehub/server

# Use a simple node script to start the server
cat > /tmp/start-server.mjs << 'EOF'
import { spawn } from "child_process";
const child = spawn("npx", ["tsx", "src/index.ts"], {
  cwd: "/root/karaokehub/server",
  stdio: ["ignore", "pipe", "pipe"],
  detached: true,
  env: { ...process.env, CLIENT_DIR: "/root/karaokehub/client/dist" }
});
child.stdout.on("data", (d) => process.stdout.write(d));
child.stderr.on("data", (d) => process.stderr.write(d));
child.unref();
console.log("Server PID: " + child.pid);
EOF

node /tmp/start-server.mjs
