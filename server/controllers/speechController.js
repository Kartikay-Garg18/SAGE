const { ttsClient } = require('../config/gcpConfig');

exports.synthesize = async (req, res) => {
    try {
        const startTime = Date.now();
        const { text, speaker } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        let voiceConfig;
        let audioConfig = { audioEncoding: 'MP3' };

        if (speaker === 'AI_1') {
            voiceConfig = { languageCode: 'en-US', name: 'en-US-Neural2-D', ssmlGender: 'MALE' }; // Male, Parth
            audioConfig.speakingRate = 0.95;
            audioConfig.pitch = -3.5;
        } else if (speaker === 'AI_2') {
            voiceConfig = { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' }; // Female, Sneha
            audioConfig.speakingRate = 0.9;
            audioConfig.pitch = 2.0;
        } else if (speaker === 'AI_3') {
            voiceConfig = { languageCode: 'en-US', name: 'en-US-Neural2-A', ssmlGender: 'MALE' }; // Male, Harsh
            audioConfig.speakingRate = 1.05;
            audioConfig.pitch = -0.5;
        } else if (speaker === 'AI_4') {
            voiceConfig = { languageCode: 'en-US', name: 'en-US-Neural2-C', ssmlGender: 'FEMALE' }; // Female, Anshika
            audioConfig.speakingRate = 1.0;
            audioConfig.pitch = 1.2;
        } else {
            voiceConfig = { languageCode: 'en-US', name: 'en-US-Neural2-F', ssmlGender: 'FEMALE' };
        }

        const request = {
            input: { text },
            voice: voiceConfig,
            audioConfig: audioConfig,
        };

        const [response] = await ttsClient.synthesizeSpeech(request);

        const ttsTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Audio synthesized (${ttsTime}s)`);

        const audioBase64 = response.audioContent.toString('base64');
        res.json({
            audio: audioBase64,
            latency: ttsTime
        });
    } catch (error) {
        console.error('❌ TTS error:', error);
        res.status(500).json({ error: error.message });
    }
};
