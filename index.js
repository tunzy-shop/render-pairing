const express = require('express');
const bodyParser = require('body-parser');
const { default: makeWASocket, useMultiFileAuthState } = require('@adiwajshing/baileys');
const fs = require('fs');
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());
const PORT = process.env.PORT || 3000;

app.post('/pair', async (req, res) => {
    const { number } = req.body;
    if (!number) return res.status(400).json({ error: "Number required" });

    const formatted = number.replace(/[^0-9]/g, "");
    const { state, saveCreds } = await useMultiFileAuthState('./tmp');

    const sock = makeWASocket({
        printQRInTerminal: false,
        auth: state,
        browser: ["TUNZY-MD-V1", "Safari", "1.0"]
    });

    const code = await sock.requestPairingCode(formatted);

    // Generate 50-character session ID (alphanumeric)
    const sessionId = crypto.randomBytes(25).toString('hex');

    // Save session file with pairing code
    fs.writeFileSync(`./tmp/${sessionId}.json`, JSON.stringify({ number: formatted, code }));

    res.json({
        pairingCode: code,
        sessionId,
        message: "Pairing code generated! Save this session ID to use in Katabumb."
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', update => {
        if (update.connection === "close") sock.end();
    });
});

app.listen(PORT, () => console.log(`Pairing server running on port ${PORT}`));
