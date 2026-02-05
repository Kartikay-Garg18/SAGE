const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const apiRoutes = require('./routes/api');
const { speechClient } = require('./config/gcpConfig');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
    origin: '*', // Configure as needed for production
    credentials: true
}));
app.use(express.json());

// Routes
app.use('/', apiRoutes);

// Helper for WebSocket: Streaming STT
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
    console.log('🔌 WebSocket client connected for streaming STT');

    let recognizeStream = null;
    let finalTranscript = '';

    // Streaming STT configuration
    const streamingConfig = {
        config: {
            encoding: 'LINEAR16',
            sampleRateHertz: 16000,
            languageCode: 'en-US',
            enableAutomaticPunctuation: true,
        },
        interimResults: true,
    };

    // Start streaming recognition
    function startStream() {
        finalTranscript = '';

        recognizeStream = speechClient
            .streamingRecognize(streamingConfig)
            .on('error', (error) => {
                console.error('❌ Streaming STT error:', error.message);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'error', message: error.message }));
                }
            })
            .on('data', (data) => {
                if (data.results && data.results[0]) {
                    const result = data.results[0];
                    const transcript = result.alternatives[0]?.transcript || '';

                    if (result.isFinal) {
                        finalTranscript += transcript + ' ';
                        console.log('📝 Final chunk:', transcript);
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'partial',
                                transcript: finalTranscript.trim(),
                                isFinal: false
                            }));
                        }
                    } else {
                        // Send interim result
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'partial',
                                transcript: finalTranscript + transcript,
                                isFinal: false
                            }));
                        }
                    }
                }
            })
            .on('end', () => {
                console.log('✅ Streaming STT session ended');
            });

        console.log('🎙️ Started streaming STT session');
    }

    // Handle incoming messages
    ws.on('message', (message) => {
        // Try to parse as JSON first (control messages)
        // If it fails, treat as binary audio data
        let messageStr;
        try {
            messageStr = message.toString();
            const data = JSON.parse(messageStr);

            // It's a valid JSON control message
            console.log('📩 Received control message:', data.type);

            if (data.type === 'start') {
                console.log('▶️ Starting streaming STT...');
                startStream();
            } else if (data.type === 'stop') {
                console.log('⏹️ Stopping streaming STT...');
                if (recognizeStream) {
                    recognizeStream.end();

                    // Send final transcript
                    setTimeout(() => {
                        if (ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({
                                type: 'final',
                                transcript: finalTranscript.trim()
                            }));
                            console.log('✅ Final transcript sent:', finalTranscript.trim().substring(0, 100) + '...');
                        }
                    }, 500);
                }
            }
        } catch (e) {
            // Not valid JSON - treat as binary audio data
            if (recognizeStream && !recognizeStream.destroyed) {
                recognizeStream.write(message);
            }
        }
    });

    ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected');
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.end();
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        if (recognizeStream && !recognizeStream.destroyed) {
            recognizeStream.end();
        }
    });
});


const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
