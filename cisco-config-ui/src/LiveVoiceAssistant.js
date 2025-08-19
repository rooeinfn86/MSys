import React, { useEffect, useState, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

const LiveVoiceAssistant = () => {
  const [socket, setSocket] = useState(null);
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const transcriptRef = useRef('');

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    setSocket(ws);

    ws.onopen = () => console.log('[WebSocket] Connected');
    ws.onclose = () => console.log('[WebSocket] Disconnected');

    ws.onmessage = async (event) => {
      const data = JSON.parse(event.data);
      console.log('[WebSocket] Received:', data);
      setLoading(false);

      if (data.voice) {
        speak(data.voice);
      }

      if (data.config) {
        setGeneratedConfig(data.config);
        setAwaitingApproval(true);
      }

      if (data.status === 'applied') {
        setStatusMessage('✅ Configuration applied successfully!');
        setGeneratedConfig('');
        setAwaitingApproval(false);
      }

      if (data.error) {
        setStatusMessage(`❌ Error: ${data.error}`);
      }
    };

    return () => ws.close();
  }, []);

  const handleStart = () => {
    if (!browserSupportsSpeechRecognition) {
      alert('Your browser does not support speech recognition.');
      return;
    }

    SpeechRecognition.stopListening();
    resetTranscript();

    setTimeout(() => {
      SpeechRecognition.startListening({ continuous: true });
      setIsListening(true);
    }, 300);
  };

  const handleStop = () => {
    SpeechRecognition.stopListening();
    setIsListening(false);
    resetTranscript();
  };

  useEffect(() => {
    if (!isListening || !transcript.trim()) return;

    const currentTranscript = transcript.trim().toLowerCase();
    transcriptRef.current = currentTranscript;

    if (window.silenceTimeout) clearTimeout(window.silenceTimeout);

    window.silenceTimeout = setTimeout(() => {
      if (currentTranscript.length > 3) {
        const selectedDevice = JSON.parse(localStorage.getItem('selectedDevice'));
        if (!selectedDevice) {
          console.warn("[Voice Assistant] Missing or invalid device info:", selectedDevice);
          setStatusMessage("❌ No device selected. Please select a device first.");
          return;
        }

        console.log('[AI SEND]:', currentTranscript);
        setLoading(true);
        resetTranscript();

        if (currentTranscript.includes('approve') && awaitingApproval) {
          // Send config to /apply-config with stored device info
          fetch('http://localhost:8000/apply-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ip: selectedDevice.ip,
              username: selectedDevice.username,
              password: selectedDevice.password,
              config: generatedConfig
            })
          }).then(res => res.json()).then(res => {
            console.log('[Config Applied]', res);
            setStatusMessage(`✅ ${res.message || 'Configuration applied successfully!'}`);
            setGeneratedConfig('');
            setAwaitingApproval(false);
          }).catch(err => {
            console.error(err);
            setStatusMessage('❌ Failed to apply configuration.');
          });
        } else {
          // Send speech request to WebSocket
          socket.send(JSON.stringify({
            message: currentTranscript,
            device: selectedDevice
          }));
        }
      }
    }, 2000); // 2 seconds of silence
  }, [transcript]);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    if (!synth) return;

    SpeechRecognition.stopListening(); // Stop listening during AI speech

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;

    const voices = synth.getVoices();
    const preferredVoice = voices.find(v =>
      v.name.includes("Google UK English Male") ||
      v.name.includes("Microsoft David") ||
      v.name.toLowerCase().includes("male")
    );

    if (preferredVoice) {
      utterance.voice = preferredVoice;
      console.log("[AI Voice] Using voice:", preferredVoice.name);
    }

    utterance.onend = () => {
      console.log('[AI] Done speaking. Resuming listening...');
      handleStart();
    };

    synth.cancel();
    synth.speak(utterance);
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Live Voice Assistant</h2>
      <p>Status: {listening ? '🎙️ Listening...' : '🛑 Stopped'}</p>

      <button onClick={handleStart} disabled={isListening}>Start Listening</button>
      <button onClick={handleStop} disabled={!isListening}>Stop Listening</button>

      <div style={{ marginTop: 20 }}>
        <strong>You said:</strong> {transcriptRef.current || transcript}
      </div>

      {loading && <p style={{ color: 'blue' }}>🧠 AI is generating CLI configuration...</p>}
      {statusMessage && <div style={{ marginTop: 10, color: 'green' }}>{statusMessage}</div>}

      {generatedConfig && (
  <div style={{ marginTop: 20 }}>
    <h3>AI-Generated Configuration</h3>
    <textarea
      value={generatedConfig}
      onChange={(e) => setGeneratedConfig(e.target.value)}
      rows={10}
      cols={60}
      style={{ fontFamily: 'monospace', width: '100%' }}
    />
    {awaitingApproval && (
      <p style={{ marginTop: 8 }}>
        You can edit the config above. When ready, say <strong>"approve"</strong> to apply it.
      </p>
    )}
  </div>
)}

    </div>
  );
};

export default LiveVoiceAssistant;
