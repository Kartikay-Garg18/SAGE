const path = require('path');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const textToSpeech = require('@google-cloud/text-to-speech');
const { VertexAI } = require('@google-cloud/vertexai');

// Load GCP credentials
let credentials;
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
    console.log('📦 Loading credentials from environment variable...');
    credentials = JSON.parse(
        Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString()
    );
} else {
    const credentialsPath = path.join(__dirname, '..', 'credentials.json');
    if (fs.existsSync(credentialsPath)) {
        console.log('📂 Loading credentials from credentials.json...');
        credentials = require(credentialsPath);
    } else {
        console.error('❌ No credentials found! Set GOOGLE_APPLICATION_CREDENTIALS_JSON env var or provide credentials.json');
        // We might not want to exit here in case some features don't need it, but for this app it's critical.
        // process.exit(1); 
    }
}

// Initialize Clients
const speechClient = new speech.SpeechClient({ credentials });
const ttsClient = new textToSpeech.TextToSpeechClient({ credentials });

const projectId = credentials?.project_id || process.env.GCP_PROJECT_ID || 'gd-agent-482514';
const location = process.env.GCP_REGION || 'us-central1';

const vertexAI = new VertexAI({
    project: projectId,
    location: location,
    googleAuthOptions: { credentials }
});

module.exports = {
    speechClient,
    ttsClient,
    vertexAI,
    credentials // Exported if needed by other modules
};
