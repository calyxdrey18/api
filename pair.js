import express from 'express';
import fs from 'fs';
import pino from 'pino';
import { makeWASocket, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, Browsers, jidNormalizedUser } from '@whiskeysockets/baileys';

const router = express.Router();

// Ensure the session directory exists
function removeFile(FilePath) {
    try {
        if (!fs.existsSync(FilePath)) return false;
        fs.rmSync(FilePath, { recursive: true, force: true });
    } catch (e) {
        console.error('Error removing file:', e);
    }
}

router.get('/', async (req, res) => {
    let num = req.query.number;
    let dirs = './' + (num || `session`);
    
    // Remove existing session if present
    await removeFile(dirs);
    
    async function initiateSession() {
        const { state, saveCreds } = await useMultiFileAuthState(dirs);

        try {
            let KnightBot = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.windows('Firefox'),
            });

            if (!KnightBot.authState.creds.registered) {
                await delay(2000);
                // Remove any non-digit characters except plus sign
                num = num.replace(/[^\d+]/g, '');
                
                // If number starts with +, remove it
                if (num.startsWith('+')) {
                    num = num.substring(1);
                }
                
                // If number doesn't start with a country code, add default
                if (!num.match(/^[1-9]\d{1,2}/)) {
                    num = '62' + num;
                }
                
                const code = await KnightBot.requestPairingCode(num);
                if (!res.headersSent) {
                    console.log({ num, code });
                    await res.send({ code });
                }
            }

            KnightBot.ev.on('creds.update', saveCreds);
            KnightBot.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(10000);
                    const sessionKnight = fs.readFileSync(dirs + '/creds.json');

                    // Send session file to user
                    const userJid = jidNormalizedUser(num + '@s.whatsapp.net');
                    await KnightBot.sendMessage(userJid, { 
                        document: sessionKnight, 
                        mimetype: 'application/json', 
                        fileName: 'creds.json' 
                    });

                    // Send welcome message
                    await KnightBot.sendMessage(userJid, { 
                        text: `*╭❍* *𝐒𝐔𝐂𝐂𝐄𝐒𝐒𝐅𝐔𝐋𝐋𝐘 𝐂𝐎𝐍𝐍𝐄𝐂𝐓𝐄𝐃* *❍*\n` +
                              `*┊* 𝐏𝐥𝐞𝐚𝐬𝐞 𝐬𝐮𝐩𝐩𝐨𝐫𝐭 𝐨𝐮𝐫 𝐜𝐡𝐚𝐧𝐧𝐞𝐥𝐬\n` +
                              `*┊*❶ || *ᴡʜᴀᴛsᴀᴘᴘ ᴄʜᴀɴɴᴇʟ* = https://whatsapp.com/channel/0029VagE9oHDp2Q34xE8S22c\n` +
                              `*┊*❷ || *ᴛᴇʟᴇɢʀᴀᴍ* = https://t.me/haxk_em\n` +
                              `*┊*➌ || *ʏᴏᴜᴛᴜʙᴇ* = https://www.youtube.com/@CalyxDrey\n` +
                              `*┊* 📛Don't share the creds.json file with anyone.\n` +
                              `*┊* *ᴠɪꜱɪᴛ ᴏᴜʀ ᴡᴇʙꜱɪᴛᴇ ғᴏʀ ᴍᴏʀᴇ* = 𝚙𝚎𝚗𝚍𝚒𝚗𝚐\n` +
                              `*┊* Upload the file on session folder.\n` +
                              `*╰═❍* *𝐁𝐲 𝐂𝐚𝐥𝐲𝐱-𝐃𝐫𝐞𝐲*` 
                    });

                    // Send warning message
                    await KnightBot.sendMessage(userJid, { 
                        text: `☠️DONT SHARE WITH ANYONE☠️
                        ©Calyx-Drey kepp it safe 💥
                         ⳹\n\n` 
                    });

                    // Clean up session after use
                    await delay(100);
                    removeFile(dirs);
                    process.exit(0);
                }
                if (connection === "close" && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    initiateSession();
                }
            });
        } catch (err) {
            console.error('Error initializing session:', err);
            if (!res.headersSent) {
                res.status(503).send({ code: 'Service Unavailable' });
            }
        }
    }

    await initiateSession();
});

// Global uncaught exception handler
process.on('uncaughtException', (err) => {
    let e = String(err);
    if (e.includes("conflict")) return;
    if (e.includes("not-authorized")) return;
    if (e.includes("Socket connection timeout")) return;
    if (e.includes("rate-overlimit")) return;
    if (e.includes("Connection Closed")) return;
    if (e.includes("Timed Out")) return;
    if (e.includes("Value not found")) return;
    console.log('Caught exception: ', err);
});

export default router;
