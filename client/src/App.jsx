import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import useAudioStreaming from './hooks/useAudioStreaming';

const App = () => {
    const [status, setStatus] = useState('Click "Start" to begin');
    const [isAISpeaking, setIsAISpeaking] = useState(false);
    const [turn, setTurn] = useState(0);
    const [maxTurns] = useState(3);
    const [activeSpeaker, setActiveSpeaker] = useState(null); // AI_1, AI_2, etc.
    const [logs, setLogs] = useState([]);
    const [conversationActive, setConversationActive] = useState(false);
    
    // Audio Hook
    const { 
        startStreaming, 
        stopStreaming, 
        transcript, 
        finalTranscript, 
        isRecording 
    } = useAudioStreaming(import.meta.env.VITE_API_URL);

    const audioRef = useRef(new Audio());
    const hasProcessedTurn = useRef(false);

    // Auto-process user turn when final transcript is received
    useEffect(() => {
        if (finalTranscript && !hasProcessedTurn.current && isRecording) {
            hasProcessedTurn.current = true;
            handleUserTurn(finalTranscript);
        }
    }, [finalTranscript, isRecording]);

    // Reset processing flag when recording starts
    useEffect(() => {
        if (isRecording) {
            hasProcessedTurn.current = false;
            setStatus('🎙️ Recording... (speak naturally)');
        }
    }, [isRecording]);

    const addLog = (label, content, type = 'info') => {
        setLogs(prev => [{ id: Date.now(), label, content, type }, ...prev]);
    };

    const playAudio = (audioBase64) => {
        return new Promise((resolve, reject) => {
            audioRef.current.src = `data:audio/mp3;base64,${audioBase64}`;
            audioRef.current.onended = () => {
                setIsAISpeaking(false);
                setActiveSpeaker(null);
                resolve();
            };
            audioRef.current.onerror = reject;
            audioRef.current.play();
        });
    };

    const startConversation = async () => {
        setConversationActive(true);
        setTurn(1);
        setStatus('🤖 AI is thinking...');
        setIsAISpeaking(true);
        setActiveSpeaker('AI_1'); // Assume AI_1 starts

        try {
            const response = await axios.post(`${import.meta.env.VITE_API_URL}/initial-speech`);
            const { response: aiText } = response.data;
            
            addLog('🤖 AI Turn 1', aiText, 'gemini');

            await synthesizeAndPlay(aiText, 'AI_1');
            
            setStatus('🎙️ Your turn - Click to record');
        } catch (error) {
            console.error(error);
            setStatus('❌ Error starting conversation');
            setConversationActive(false);
        }
    };

    const handleUserTurn = async (userText) => {
        await stopStreaming(); // Ensure recording stops
        addLog(`👤 User Turn ${turn}`, userText, 'transcription');
        
        setTurn(prev => prev + 1);
        setStatus('🤖 AI is responding...');
        setIsAISpeaking(true);

        try {
            // Determine next speaker (simple round-robin or random for demo)
            const nextSpeaker = `AI_${(turn % 4) + 1}`; 
            setActiveSpeaker(nextSpeaker);

            const chatResponse = await axios.post(`${import.meta.env.VITE_API_URL}/chat`, { text: userText });
            const { response: aiText } = chatResponse.data;

            addLog(`🤖 AI Turn ${turn + 1}`, aiText, 'gemini');

            await synthesizeAndPlay(aiText, nextSpeaker);

            if (turn >= maxTurns) {
                setStatus('✅ Conversation complete!');
                setConversationActive(false);
            } else {
                setStatus('🎙️ Your turn - Click to record');
            }
        } catch (error) {
            console.error(error);
            setStatus('❌ Error processing turn');
        }
    };

    const synthesizeAndPlay = async (text, speaker) => {
        try {
            setStatus('🔊 Generating speech...');
            const ttsResponse = await axios.post(`${import.meta.env.VITE_API_URL}/synthesize`, { text, speaker });
            const { audio } = ttsResponse.data;
            
            setStatus(`▶️ ${speaker} is speaking...`);
            await playAudio(audio);
        } catch (error) {
            console.error('TTS Error', error);
            setStatus('❌ TTS Error');
        }
    };

    // UI Helpers
    const getHotspotClass = (id) => {
        const isActive = activeSpeaker === id && isAISpeaking;
        const baseClass = "absolute w-20 h-20 rounded-full cursor-default z-10 transition-all duration-300";
        const speakingClass = isActive ? "shadow-[0_0_20px_rgba(108,92,231,0.8),0_0_40px_rgba(108,92,231,0.6)] animate-speaker-pulse" : "";
        return `${baseClass} ${speakingClass}`;
    };

    return (
        <div className="min-h-screen bg-black text-white overflow-hidden relative font-sans">
            {/* Background */}
            <div className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/background.png')" }}></div>
            
            {/* Status Bar */}
            <div className={`fixed top-5 left-1/2 -translate-x-1/2 bg-black/70 px-8 py-2.5 rounded-full text-base z-50 backdrop-blur-sm transition-all border border-transparent ${isAISpeaking ? 'border-indigo-500/50' : ''} ${!isAISpeaking && conversationActive ? 'border-green-500/50 text-green-500' : ''}`}>
                {status}
            </div>

            {/* AI Hotspots */}
            <div id="ai1-hotspot" className={`${getHotspotClass('AI_1')} top-[10%] left-[31.3%] w-40 h-[180px] rounded-[45%]`}></div>
            <div id="ai2-hotspot" className={`${getHotspotClass('AI_2')} top-[15.8%] left-[8.7%] w-[165px] h-[180px] rounded-[45%]`}></div>
            <div id="ai3-hotspot" className={`${getHotspotClass('AI_3')} top-[9%] right-[30.5%] w-40 h-[180px] rounded-[45%]`}></div>
            <div id="ai4-hotspot" className={`${getHotspotClass('AI_4')} top-[16%] right-[9%] w-40 h-[180px] rounded-[45%]`}></div>

            {/* Controls */}
            <div className={`fixed bottom-0 left-0 w-full p-8 flex justify-center z-[200] ${conversationActive ? 'flex' : 'hidden'}`} style={{ display: 'flex' }}> {/* Always show controls at bottom */}
                <div className="bg-black/85 backdrop-blur-md border border-indigo-500/50 rounded-2xl px-12 py-6 text-center shadow-2xl">
                    {!conversationActive ? (
                        <button 
                            className="bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe] text-white text-lg font-semibold px-10 py-4 rounded-full hover:scale-105 transition-transform animate-pulse"
                            onClick={startConversation}
                        >
                            Start Conversation
                        </button>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                           <button 
                                className={`text-white text-lg font-semibold px-10 py-4 rounded-full transition-transform hover:scale-105 ${isRecording ? 'bg-[#c0392b]' : 'bg-gradient-to-br from-[#6c5ce7] to-[#a29bfe]'}`}
                                onClick={isRecording ? () => stopStreaming() : startStreaming}
                                disabled={isAISpeaking}
                                style={{ backgroundColor: isRecording ? '#c0392b' : '' }}
                            >
                                {isRecording ? '⏹️ Stop Recording' : '🎙️ Record'}
                            </button>
                            <div className="text-xs text-gray-400 mt-2">
                                {isRecording ? 'Processing will start automatically on silence or stop.' : 'Press to speak'}
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Logs */}
             <div className="fixed top-2.5 left-2.5 max-h-[300px] overflow-y-auto w-[300px] bg-black/50 p-2.5 rounded-xl block" style={{ display: logs.length ? 'block' : 'none' }}>
                {logs.map(log => (
                    <div key={log.id} className="mb-1 text-xs text-gray-200">
                        <strong style={{ color: log.type === 'error' ? 'red' : '#a29bfe' }}>{log.label}:</strong> {log.content}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
