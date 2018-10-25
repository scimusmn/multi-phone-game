# Multiplayer Phone Game
Communal shared-screen game controlled by smartphones. 

Based from the Illumination version of the previous game:
https://github.com/scimusmn/illumination-game/commit/780570a6a9f4b5ceb4f59f4f1931d1118b6b8db0

## Deploy
Setup PM2 configuration

    cp pm2.example.json pm2-env.json

Modify the PORT value to match your server config.

Deploy using fabric:
    fab -H server.example.com deploy.app:server_user,server.example.com,/opt/node-apps/app_path,pm2-process-name

