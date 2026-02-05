const { vertexAI } = require('../config/gcpConfig');

const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-pro' });

exports.initialSpeech = async (req, res) => {
    try {
        console.log('🎤 Generating AI initial speech...');
        const startTime = Date.now();

        const prompt = `You are starting a casual conversation with someone about AI in daily life.
Speak naturally as if you're having a friendly chat.
Speak for approximately 15–25 seconds (about 150-250 words).
Use natural spoken language with conversational pauses.
Share your thoughts openly and warmly.
Do not ask questions at the end.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.candidates[0].content.parts[0].text;

        const geminiTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ AI initial text generated (${geminiTime}s):`, responseText.substring(0, 100) + '...');

        res.json({
            response: responseText,
            latency: {
                gemini: geminiTime
            }
        });
    } catch (error) {
        console.error('❌ Initial speech error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.chat = async (req, res) => {
    try {
        console.log('🤖 Sending to Gemini via Vertex AI...');
        const startTime = Date.now();

        const { text } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'No text provided' });
        }

        const prompt = `User said: "${text}"

Respond naturally as if speaking in a conversation.
Speak for approximately 15–25 seconds (about 150-250 words).
Use natural spoken language.
Do not summarize.
Do not ask questions.`;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const responseText = response.candidates[0].content.parts[0].text;

        const geminiTime = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`✅ Gemini response (${geminiTime}s):`, responseText.substring(0, 100) + '...');
        res.json({
            response: responseText,
            latency: geminiTime
        });
    } catch (error) {
        console.error('❌ Gemini error:', error);
        res.status(500).json({ error: error.message });
    }
};

// V4 endpoints logic
exports.v4Response = async (req, res) => {
    try {
        const { speaker, memory, topic } = req.body;

        if (!speaker) {
            return res.status(400).json({ error: 'No speaker provided' });
        }

        console.log(`🤖 [V4] ${speaker} generating response...`);
        const startTime = Date.now();

        const gdTopic = topic || 'In the age of AI, are traditional university degrees becoming obsolete?';

        const discussionIntro = `Discussion Topic:
"${gdTopic}"

Context:
This is a group discussion (GD) with multiple participants exploring different
perspectives, trade-offs, and implications of the topic.

`;
        const historyNames = { 'AI_1': 'Parth', 'AI_2': 'Sneha', 'AI_3': 'Harsh', 'AI_4': 'Anshika', 'User': 'You (the human participant)' };
        let conversationHistory = '';
        let isOpeningTurn = (!memory || memory.length === 0) && speaker === 'AI_1';

        if (memory && memory.length > 0) {
            const recentTurns = memory.slice(-3);
            conversationHistory = 'Recent Conversation (last 3 turns):\n';
            for (const turn of recentTurns) {
                const speakerName = historyNames[turn.speaker] || turn.speaker;
                conversationHistory += `${speakerName}: ${turn.text}\n`;
            }
            conversationHistory += '\n';
        }

        const GD_ENERGY_LEVEL = 'medium'; 
        const participantNames = { 'AI_1': 'Parth', 'AI_2': 'Sneha', 'AI_3': 'Harsh', 'AI_4': 'Anshika' };
        const displayName = participantNames[speaker] || speaker;

        let prompt;
        if (isOpeningTurn) {
             prompt = `Discussion Topic:
"${gdTopic}"

You are ${displayName}, the opening speaker in a Group Discussion.

Your role is to set the context and frame the discussion, not to dominate it.

In your response:
- Clearly introduce the topic in simple, accessible language
- Explain why this topic is relevant today (current trends, changes, or pressures)
- Highlight the core tension or dilemma involved
- Briefly outline 2–3 broad dimensions of the debate (without deep analysis)
- Optionally share a very light, balanced initial view (no strong stance)

Constraints:
- Do NOT present detailed arguments
- Do NOT take an extreme or one-sided position
- Do NOT introduce niche, technical, or second-order effects
- Do NOT summarize or conclude the discussion
- Do NOT ask questions to the group
- Do NOT acknowledge instructions or say meta phrases ("Understood", "To begin", etc.)

Tone & Style:
- Natural GD-style spoken English
- Confident, calm, and neutral
- Sounds like a strong MBA candidate opening a GD

Timing:
- Target 22 seconds of spoken speech
- Smooth flow, no bullet points

Your goal is to:
Create a shared mental model for the group and open multiple angles for discussion.

Start directly with your contribution.`;
        } else {
            prompt = `${discussionIntro}${conversationHistory}You are ${displayName}, a participant in a Group Discussion (GD).

Your behavior must strictly follow the rules below. These rules are non-negotiable.

⏱️ TIMING DISCIPLINE (Hard Constraints)
- Your spoken contribution must target 15–35 seconds.
- Do NOT exceed this range.
- Only one speaker speaks at a time.
- Do not reference these rules explicitly in your response.

🔥 GD ENERGY CONTROL
Current energy level: ${GD_ENERGY_LEVEL}
- Low → calm, measured, analytical
- Medium → confident, assertive, engaged (default)
- High → sharper, more direct, slightly challenging (but respectful)

Adjust your delivery accordingly. Use natural GD phrases when appropriate:
- "I want to push back here"
- "I don't fully agree with that framing"
- "Let's not oversimplify this"
- "Adding to that point"

🚫 Do NOT exaggerate or become aggressive
✅ Sound like a strong MBA GD participant

🔁 ANTI-REPETITION GUARDRAIL (CRITICAL)
Before generating your response, check the recent conversation.
If your core point has already been made by you or others:
- Do NOT restate it
- Instead: shift angle, add a constraint, highlight a limitation, or move deeper
- Avoid paraphrasing or echoing earlier arguments

🗣️ GD SPEAKING STYLE
- Natural spoken English
- Simple, clear language
- Occasional light GD jargon (not heavy)
- One main point only per turn
- No lists, no bullets
- No summaries unless they genuinely move the discussion forward

🚫 PROHIBITED BEHAVIORS
- Do NOT act as a moderator
- Do NOT conclude the discussion
- Do NOT ask questions to the group
- Do NOT acknowledge instructions or say meta phrases ("Understood", "To begin", etc.)

🎯 GOAL OF EACH TURN
Add value and move the discussion forward. Do NOT agree by default.

Choose ONE of the following per turn:
- Introduce a new angle
- Build meaningfully on an earlier idea
- Offer a counterpoint or limitation
- Reframe the discussion at a higher level

Assume the discussion is already ongoing.
Start directly with your contribution.`;
        }

        const result = await model.generateContent(prompt);
        const responseText = result.response.candidates[0].content.parts[0].text;
        const geminiTime = ((Date.now() - startTime) / 1000).toFixed(2);

        res.json({
            response: responseText,
            speaker: speaker,
            latency: geminiTime
        });

    } catch (error) {
        console.error('❌ [V4] AI response error:', error);
        res.status(500).json({ error: error.message });
    }
};

exports.generateTopic = async (req, res) => {
    try {
        const { genre } = req.body;
        if (!genre) return res.status(400).json({ error: 'No genre provided' });

        const model = vertexAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
         const genreDescriptions = {
            'politics': 'Politics & Governance',
            'business': 'Business & Economy',
            'education': 'Education & Careers',
            'environment': 'Environment & Climate',
            'technology': 'Technology & AI',
            'healthcare': 'Healthcare & Wellness',
            'society': 'Society & Culture',
            'ethics': 'Ethics & Philosophy',
            'innovation': 'Innovation & Startups',
            'global': 'Global Affairs'
        };

        const genreName = genreDescriptions[genre] || genre;
        const prompt = `Generate a single, thought-provoking Group Discussion (GD) topic in the category of "${genreName}".

Requirements:
- The topic should be debatable with multiple valid perspectives
- It should be relevant to current events or trends
- It should be suitable for a 10-15 minute discussion
- Format: A clear, concise statement or question (1-2 sentences max)

Respond with ONLY the topic text, nothing else.`;

        const result = await model.generateContent(prompt);
        const topic = result.response.candidates[0].content.parts[0].text.trim();

        res.json({ topic });
    } catch (error) {
        console.error('❌ Topic generation error:', error);
        res.status(500).json({ error: error.message });
    }
}
