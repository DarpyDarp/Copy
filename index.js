const { Client } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const client = new Client({ checkUpdate: false });
const config = require('./config.json');
const prefix = config.prefix;

client.login(config.token);

client.on('message', async (message) => {
    if(message.author.id !== client.user.id) return;

    if (message.content.startsWith(`${prefix}createslot`)) {
        const args = message.content.split(' ').slice(1);
        const fromChannelId = args[0];
        const toChannelId = args[1];

        const channelsFilePath = path.join(__dirname, 'channels.json');
        if (!fs.existsSync(channelsFilePath)) {
            fs.writeFileSync(channelsFilePath, JSON.stringify([]));
        }

        let channelsData = JSON.parse(fs.readFileSync(channelsFilePath));
        const existingChannel = channelsData.find(channel => channel.id === fromChannelId && channel.toChannelId === toChannelId);
        if (!existingChannel) {
            channelsData.push({ id: fromChannelId, toChannelId: toChannelId, last_used_token: '' });
            fs.writeFileSync(channelsFilePath, JSON.stringify(channelsData));
        }

        const channelsDir = path.join(__dirname, 'channels');
        if (!fs.existsSync(channelsDir)) {
            fs.mkdirSync(channelsDir);
        }

        const channelDir = path.join(channelsDir, fromChannelId);
        if (!fs.existsSync(channelDir)) {
            fs.mkdirSync(channelDir);
            fs.writeFileSync(path.join(channelDir, 'token.txt'), '');
            message.reply(`Folder created in ${channelDir}\n\nadd tokens in that token.txt file`);
        }
    } else if(message.content.startsWith(`${prefix}help`)){
        message.reply('.help\n.createslot <from chanel id> <to channel id>')
    }
});

client.on('message', async (message) => {
    const channelsFilePath = path.join(__dirname, 'channels.json');
    if (fs.existsSync(channelsFilePath)) {
        const channelsData = JSON.parse(fs.readFileSync(channelsFilePath));

        const fromChannelData = channelsData.find(channel => channel.id === message.channel.id);
        if (fromChannelData) {
            const channelDir = path.join(__dirname, 'channels', fromChannelData.id);
            const tokenFilePath = path.join(channelDir, 'token.txt');
            const tokens = fs.readFileSync(tokenFilePath, 'utf-8')
                .split('\n')
                .map(token => token.trim())
                .filter(Boolean);

            if (tokens.length > 0) {
                let token;

                if (fromChannelData.last_used_token === '') {
                    token = tokens[Math.floor(Math.random() * tokens.length)];
                } else {
                    const availableTokens = tokens.filter(t => t !== fromChannelData.last_used_token);
                    token = availableTokens[Math.floor(Math.random() * availableTokens.length)];
                }
                if(!token)return;
                const payload = { content: message.content, flags: 0 };
                const headers = {
                    'Authorization': token,
                    'Accept': '*/*',
                    'Accept-Encoding': 'gzip, deflate, br, zstd',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                };

                try {
                    await axios.post(`https://discord.com/api/v9/channels/${fromChannelData.toChannelId}/messages`, payload, { headers });
                    fromChannelData.last_used_token = token;
                    fs.writeFileSync(channelsFilePath, JSON.stringify(channelsData));
                } catch (error) {
                    console.error(error);
                }
            }
        }
    }
});
