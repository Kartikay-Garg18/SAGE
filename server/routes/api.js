const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const speechController = require('../controllers/speechController');
const sessionController = require('../controllers/sessionController');

// Chat Routes
router.post('/initial-speech', chatController.initialSpeech);
router.post('/chat', chatController.chat);
router.post('/v4/ai-response', chatController.v4Response);
router.post('/v4/generate-topic', chatController.generateTopic);

// Speech Routes
router.post('/synthesize', speechController.synthesize);

// Session Routes
router.post('/v4/log-speech', sessionController.logSpeech);
router.post('/v4/start-session', sessionController.startSession);
router.post('/v4/end-session', sessionController.endSession);
router.post('/v4/analyze-session', sessionController.analyzeSession);

module.exports = router;
