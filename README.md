# Voice Pipeline Experiment

A minimal technical spike to validate the **voice → LLM → voice** pipeline using Google Cloud services with Application Default Credentials (ADC).

## 🎯 What This Does

1. **User speaks** into microphone
2. **Google Speech-to-Text** converts speech to text
3. **Gemini API** generates a natural response
4. **Google Text-to-Speech** converts response to audio
5. **Browser plays** the audio response

## 🔧 Prerequisites

1. **GCP SDK installed**
   ```bash
   # Check if installed
   gcloud --version
   ```

2. **ADC authentication configured**
   ```bash
   gcloud auth application-default login
   ```

3. **GCP Project ID**
   - Know your GCP project ID
   - Set as environment variable:
     ```bash
     export GCP_PROJECT_ID="your-project-id"
     export GCP_REGION="us-central1"  # Optional, defaults to us-central1
     ```

4. **GCP APIs enabled**
   - Speech-to-Text API
   - Text-to-Speech API
   - Vertex AI API
   - Ensure billing is enabled

## 🚀 Setup & Run

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start the server**
   ```bash
   GCP_PROJECT_ID="your-project-id" node server.js
   ```

3. **Open in browser**
   ```
   http://localhost:3000
   ```

4. **Test the pipeline**
   - Click "Start Recording"
   - Speak a phrase (e.g., "Hello, how are you?")
   - Click "Stop Recording"
   - Wait for the response to play

## 📁 Project Structure

```
voice-pipeline-experiment/
├── server.js           # Express server with 3 endpoints
├── package.json        # Dependencies
├── public/
│   ├── index.html     # Minimal UI
│   ├── app.js         # Frontend logic
│   └── style.css      # Styling
└── README.md          # This file
```

## 🔌 API Endpoints

### POST /transcribe
- **Input**: Audio file (multipart/form-data)
- **Output**: `{ text: "transcribed text" }`
- **Uses**: Google Cloud Speech-to-Text (ADC)

### POST /chat
- **Input**: `{ text: "user message" }`
- **Output**: `{ response: "gemini response" }`
- **Uses**: Vertex AI - Gemini 2.0 Flash (ADC)

### POST /synthesize
- **Input**: `{ text: "text to speak" }`
- **Output**: `{ audio: "base64-encoded-mp3" }`
- **Uses**: Google Cloud Text-to-Speech (ADC)

## 🐛 Troubleshooting

### "ADC not configured" error
```bash
gcloud auth application-default login
```

### "GCP_PROJECT_ID not set" error
```bash
export GCP_PROJECT_ID="your-project-id"
node server.js
```

### "API not enabled" error
- Go to [GCP Console](https://console.cloud.google.com)
- Enable Speech-to-Text API
- Enable Text-to-Speech API
- Enable Vertex AI API
- Ensure billing is enabled

### Microphone access denied
- Check browser permissions
- Use HTTPS or localhost only

## ⚡ Expected Performance

- **Round-trip time**: ~1-2 seconds
- **Transcription**: ~200-500ms
- **Gemini response**: ~500-800ms
- **TTS synthesis**: ~300-500ms
- **Network overhead**: ~200-400ms

## 🎯 Success Criteria

✅ User can speak into microphone  
✅ Speech is correctly transcribed  
✅ Gemini returns a natural response  
✅ Response is spoken back clearly  
✅ Total round-trip feels fast (~1-2s)  
✅ Loop works consistently  

## 📝 Notes

- This is a **technical validation only**, not a production system
- No memory, database, or user authentication
- Hardcoded voice settings (en-US-Neural2-F)
- Console logging for debugging
- Minimal error handling

## 🔒 Authentication

**All services use Application Default Credentials (ADC):**
- Speech-to-Text: ADC ✅
- Vertex AI (Gemini): ADC ✅
- Text-to-Speech: ADC ✅

No service account JSON files needed!  
No API keys needed!  

Just run: `gcloud auth application-default login`
