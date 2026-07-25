#!/bin/bash
echo "Starting AGZ VIDEOKE..."

systemctl stop agz-videoke 2>/dev/null
sleep 1

cd /root/karaokehub/client
npx vite build --logLevel silent 2>&1

systemd-run --unit=agz-videoke --service-type=simple \
  --working-directory=/root/karaokehub/server \
  --setenv=CLIENT_DIR=/root/karaokehub/client/dist \
  --setenv=PORT=3001 \
  --setenv=YOUTUBE_API_KEY=AIzaSyCaAMuSunruC6zCXAv8kgVAHE8WH1w3BGk \
  /usr/bin/npx tsx /root/karaokehub/server/src/index.ts 2>&1

sleep 3

SERVER_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "=================================="
echo "  AGZ VIDEOKE is running!"
echo "=================================="
echo ""
echo "  Access: http://$SERVER_IP:3001"
echo ""
echo "  To stop:  systemctl stop agz-videoke"
echo "  To view logs:  journalctl -u agz-videoke -f"
echo "=================================="
