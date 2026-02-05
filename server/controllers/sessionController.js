const fs = require('fs');
const path = require('path');
const { vertexAI } = require('../config/gcpConfig');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

exports.logSpeech = (req, res) => {
    try {
        const { speaker, text, turnNumber, duration } = req.body;
        
        // Participant names for friendly logging
        const names = { 'AI_1': 'Parth', 'AI_2': 'Sneha', 'AI_3': 'Harsh', 'AI_4': 'Anshika', 'User': 'You' };
        const displayName = names[speaker] || speaker;
        const speakerType = speaker.startsWith('AI_') ? 'AI' : 'User';
        const durationStr = duration ? `~${duration}s` : '~?s';

        const speechEntry = `[Turn ${turnNumber || '?'} | ${speakerType} | ${durationStr}]\n[${new Date().toLocaleTimeString()}] ${displayName}: ${text}\n\n`;
        fs.appendFileSync(path.join(logDir, 'gd_session.log'), speechEntry);

        console.log(`📝 Logged ${speaker} speech to session log`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Log speech error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.startSession = (req, res) => {
    try {
        const { topic, userName } = req.body || {};
        
        const sessionHeader = `\n${'═'.repeat(60)}\n` +
            `   NEW GD SESSION - ${new Date().toLocaleString()}\n` +
            `   GD Mode: Practice\n` +
            (userName ? `   Participant: ${userName}\n` : '') +
            (topic ? `   Topic: ${topic}\n` : '') +
            `${'═'.repeat(60)}\n\n`;
        fs.appendFileSync(path.join(logDir, 'gd_session.log'), sessionHeader);

        console.log('📋 New GD session started, log header written');
        if (topic) console.log(`📌 Topic: ${topic}`);
        res.json({ success: true });
    } catch (error) {
        console.error('❌ Start session error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.endSession = (req, res) => {
    try {
        const { totalDuration, totalTurns, userTurns, participants } = req.body || {};
        
        const sessionSummary = `\n${'─'.repeat(60)}\n` +
            `   SESSION SUMMARY\n` +
            `${'─'.repeat(60)}\n` +
            `   Total Duration: ${totalDuration || 'N/A'}\n` +
            `   Total Turns: ${totalTurns || 'N/A'}\n` +
            `   User Turns: ${userTurns || 'N/A'}\n` +
            `   Participants: ${participants || 'N/A'}\n` +
            `${'─'.repeat(60)}\n\n`;
        fs.appendFileSync(path.join(logDir, 'gd_session.log'), sessionSummary);

        console.log('📋 Session summary logged');
        res.json({ success: true });
    } catch (error) {
        console.error('❌ End session error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.analyzeSession = async (req, res) => {
    try {
        const { transcript, topic, userName, totalDuration, participantCount, turnCounts } = req.body;

        if (!transcript || !topic) {
            return res.status(400).json({ error: 'Missing transcript or topic' });
        }

        console.log('📊 Analyzing GD session...');
        const startTime = Date.now();

        const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

        // Format transcript for analysis
        const transcriptText = transcript.map((turn, i) =>
            `[Turn ${i + 1}] ${turn.speaker === 'User' ? userName || 'User' : turn.speaker}: ${turn.text}`
        ).join('\n\n');

        const userTurns = transcript.filter(t => t.speaker === 'User');
        const userTurnTexts = userTurns.map((t, i) => `Turn ${transcript.indexOf(t) + 1}: "${t.text}"`).join('\n');

        const analysisPrompt = `You are a professional GD evaluator and coach. Analyze this Group Discussion and provide structured feedback.

DISCUSSION TOPIC:
"${topic}"

SESSION DETAILS:
- Participant: ${userName || 'User'}
- Duration: ${totalDuration || 'Not recorded'}
- Total Participants: ${participantCount || 5} (1 human + 4 AI)
- User's Speaking Turns: ${userTurns.length}

FULL TRANSCRIPT:
${transcriptText}

USER'S CONTRIBUTIONS:
${userTurnTexts || 'No contributions recorded'}

Provide your analysis in the following JSON format. Be specific, supportive, and actionable. Do NOT use generic advice.

{
  "gdSummary": "A 4-6 sentence paragraph summarizing what the discussion covered, how it evolved (early framing to deeper trade-offs), and whether it stayed focused or fragmented. Write in plain English.",
  
  "keyThemes": ["Theme 1", "Theme 2", "Theme 3", "Theme 4", "Theme 5"],
  
  "userContributions": [
    {"turn": 1, "summary": "2-3 line summary of what the user said and its purpose"},
    ...
  ],
  
  "feedback": {
    "strengths": [
      "Specific strength 1 with evidence",
      "Specific strength 2 with evidence"
    ],
    "improvements": [
      "Specific improvement area 1 with actionable tip",
      "Specific improvement area 2 with actionable tip"
    ]
  },
  
  "missedAngles": [
    "An angle that wasn't explored and why it would have been valuable",
    "Another unexplored perspective"
  ],
  
  "flowAssessment": {
    "flow": "smooth / uneven / fragmented",
    "balance": "well-balanced / dominated by few / under-participated",
    "engagement": "high / moderate / low"
  }
}

IMPORTANT:
- If user had 0 contributions, note this sensitively and focus on listening/observation feedback
- Be encouraging but honest
- Reference specific moments from the transcript
- Keep userContributions array empty if user didn't speak`;

        const result = await model.generateContent(analysisPrompt);
        const responseText = result.response.candidates[0].content.parts[0].text;

        // Parse JSON from response
        let analysis;
        try {
            // Extract JSON from response (handle markdown code blocks)
            const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) ||
                responseText.match(/```\s*([\s\S]*?)\s*```/) ||
                [null, responseText];
            analysis = JSON.parse(jsonMatch[1] || responseText);
        } catch (parseError) {
            console.error('Failed to parse analysis JSON:', parseError);
            // Return a basic structure if parsing fails
            analysis = {
                gdSummary: "Analysis could not be fully processed. The discussion covered the topic with multiple perspectives shared.",
                keyThemes: ["Unable to extract themes"],
                userContributions: [],
                feedback: {
                    strengths: ["Participated in the discussion"],
                    improvements: ["Consider speaking more frequently"]
                },
                missedAngles: ["Analysis unavailable"],
                flowAssessment: {
                    flow: "moderate",
                    balance: "varied",
                    engagement: "moderate"
                }
            };
        }

        const analysisTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Analysis complete in ${analysisTime}s`);

        res.json({
            success: true,
            analysis: analysis,
            sessionOverview: {
                topic: topic,
                duration: totalDuration,
                participantCount: participantCount || 5,
                userTurnCount: userTurns.length
            }
        });

    } catch (error) {
        console.error('❌ Analysis error:', error);
        res.status(500).json({ error: error.message });
    }
};
