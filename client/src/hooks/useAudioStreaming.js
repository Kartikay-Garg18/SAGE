// client/src/hooks/useAudioStreaming.js
import { useState, useRef, useEffect } from 'react';

const useAudioStreaming = (backendUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000') => {
    const [isRecording, setIsRecording] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [finalTranscript, setFinalTranscript] = useState('');
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);

    const websocketRef = useRef(null);
    const audioContextRef = useRef(null);
    const mediaStreamRef = useRef(null);
    const audioProcessorRef = useRef(null);

    // Audio Processing Helpers
    const downsampleBuffer = (buffer, inputSampleRate, outputSampleRate) => {
        if (inputSampleRate === outputSampleRate) return buffer;
        const sampleRateRatio = inputSampleRate / outputSampleRate;
        const newLength = Math.round(buffer.length / sampleRateRatio);
        const result = new Float32Array(newLength);
        let offsetResult = 0;
        let offsetBuffer = 0;
        while (offsetResult < result.length) {
            const nextOffsetBuffer = Math.round((offsetResult + 1) * sampleRateRatio);
            let accum = 0, count = 0;
            for (let i = offsetBuffer; i < nextOffsetBuffer && i < buffer.length; i++) {
                accum += buffer[i];
                count++;
            }
            result[offsetResult] = accum / count;
            offsetResult++;
            offsetBuffer = nextOffsetBuffer;
        }
        return result;
    };

    const floatTo16BitPCM = (float32Array) => {
        const int16Array = new Int16Array(float32Array.length);
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        return int16Array;
    };

    const initAudio = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true }
            });
            mediaStreamRef.current = stream;
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            return true;
        } catch (err) {
            console.error('Microphone access error:', err);
            setError(err.message);
            return false;
        }
    };

    const startStreaming = async () => {
        setError(null);
        if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            const success = await initAudio();
            if (!success) return;
        }
        if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        // Connect WebSocket
        const wsUrl = backendUrl.replace(/^http/, 'ws');
        websocketRef.current = new WebSocket(wsUrl);

        websocketRef.current.onopen = () => {
            console.log('WebSocket connected');
            setConnected(true);
            websocketRef.current.send(JSON.stringify({ type: 'start' }));
            setupAudioProcessing();
            setIsRecording(true);
        };

        websocketRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'partial') {
                    setTranscript(data.transcript);
                } else if (data.type === 'final') {
                    setFinalTranscript(data.transcript);
                    setTranscript(data.transcript);
                } else if (data.type === 'error') {
                    setError(data.message);
                }
            } catch (e) {
                console.error('Error parsing WS message:', e);
            }
        };

        websocketRef.current.onclose = () => {
            setConnected(false);
            console.log('WebSocket closed');
        };

        websocketRef.current.onerror = (err) => {
            console.error('WebSocket error:', err);
            setError('WebSocket error');
        };
    };

    const setupAudioProcessing = () => {
        const source = audioContextRef.current.createMediaStreamSource(mediaStreamRef.current);
        const inputSampleRate = audioContextRef.current.sampleRate;
        const targetSampleRate = 16000;
        const bufferSize = 4096;

        audioProcessorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

        audioProcessorRef.current.onaudioprocess = (event) => {
            if (!websocketRef.current || websocketRef.current.readyState !== WebSocket.OPEN) return;
            
            const inputData = event.inputBuffer.getChannelData(0);
            const downsampled = downsampleBuffer(inputData, inputSampleRate, targetSampleRate);
            const int16Data = floatTo16BitPCM(downsampled);
            websocketRef.current.send(int16Data.buffer);
        };

        source.connect(audioProcessorRef.current);
        audioProcessorRef.current.connect(audioContextRef.current.destination);
    };

    const stopStreaming = async () => {
        setIsRecording(false);
        if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
            websocketRef.current.send(JSON.stringify({ type: 'stop' }));
            // Wait a bit for final transcript if needed, but we rely on onmessage
            // For now, we just close after a short delay or rely on the server sending 'final' before we close.
            // But to be safe properly, we should wait.
            // Simplified for React:
            setTimeout(() => {
                websocketRef.current?.close();
            }, 1000);
        }
        if (audioProcessorRef.current) {
            audioProcessorRef.current.disconnect();
            audioProcessorRef.current = null;
        }
    };

    return {
        isRecording,
        transcript,
        finalTranscript,
        startStreaming,
        stopStreaming,
        error,
        connected
    };
};

export default useAudioStreaming;
