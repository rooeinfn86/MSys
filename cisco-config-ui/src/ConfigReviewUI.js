import { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './styles/ConfigReview.css';

const UnifiedConfigAssistant = ({ selectedNetworkId }) => {
  const [chatLog, setChatLog] = useState([]);
  const [transcriptBox, setTranscriptBox] = useState('');
  const [generatedConfig, setGeneratedConfig] = useState('');
  const [originalConfig, setOriginalConfig] = useState('');
  const [awaitingApproval, setAwaitingApproval] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [rollbackPreview, setRollbackPreview] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRollbackModal, setShowRollbackModal] = useState(false);
  const [fromVoice, setFromVoice] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [applyingConfig, setApplyingConfig] = useState(false);
  const [rollingBack, setRollingBack] = useState(false);

  const transcriptRef = useRef('');
  const shouldResumeListening = useRef(false);
  const chatEndRef = useRef(null);

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog, isThinking]);

  useEffect(() => {
    if (!selectedNetworkId) {
      console.warn('⚠️ selectedNetworkId is not defined');
      return;
    }

    const fetchDevices = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) return;

        const response = await fetch(
          `http://localhost:8000/devices/?network_id=${selectedNetworkId}&active_only=true`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await response.json();
        setDevices(data);
        const saved = localStorage.getItem('selectedDevice');
        const fromStorage = saved ? JSON.parse(saved) : null;
        const match = data.find((d) => fromStorage && d.ip === fromStorage.ip);
        const first = match || data[0];
        if (first) {
          setSelectedDevice(first);
          localStorage.setItem('selectedDevice', JSON.stringify(first));
          setSelectedIndex(data.findIndex(d => d.ip === first.ip).toString());
        }
      } catch (error) {
        console.error("Error fetching devices:", error);
      }
    };

    fetchDevices();
  }, [selectedNetworkId]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws');
    setSocket(ws);
    ws.onopen = () => console.log('[WebSocket] Connected');
    ws.onclose = () => console.log('[WebSocket] Disconnected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setIsThinking(false);

      if (data.voice && fromVoice) {
        shouldResumeListening.current = true;
        speak(data.voice);
        setChatLog(prev => [...prev, { sender: 'ai', message: data.voice, timestamp: new Date().toLocaleTimeString() }]);
        setFromVoice(false);
      }

      if (data.config) {
        setGeneratedConfig(data.config);
        setOriginalConfig(data.config);
        setAwaitingApproval(true);
        setShowConfigModal(true);
      }

      if (data.status === 'applied') {
        setStatusMessage('✅ Configuration applied successfully!');
        setAwaitingApproval(false);
      }

      if (data.error) setStatusMessage(`❌ ${data.error}`);
    };

    return () => ws.close();
  }, [fromVoice]);

  const handleApplyConfig = useCallback(() => {
    setApplyingConfig(true);
    fetch('http://localhost:8000/apply-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...selectedDevice, config: generatedConfig }),
    })
      .then(res => res.json())
      .then(res => {
        setStatusMessage(`✅ ${res.message || 'Configuration applied.'}`);
        setChatLog(prev => [...prev, { sender: 'ai', message: `✅ Applied Configuration:\n${generatedConfig}`, timestamp: new Date().toLocaleTimeString() }]);
        setGeneratedConfig('');
        setAwaitingApproval(false);
        setApplyingConfig(false);
      })
      .catch(() => {
        setStatusMessage('❌ Failed to apply configuration.');
        setApplyingConfig(false);
      });
  }, [selectedDevice, generatedConfig]);

  useEffect(() => {
    if (!isListening || !transcript.trim()) return;

    const current = transcript.trim().toLowerCase();
    transcriptRef.current = current;

    if (window.silenceTimeout) clearTimeout(window.silenceTimeout);

    window.silenceTimeout = setTimeout(() => {
      resetTranscript();
      if (!selectedDevice) return setStatusMessage('❌ No device selected.');

      if (current.includes('approve') && awaitingApproval) {
        handleApplyConfig();
      } else {
        setChatLog(prev => [...prev, { sender: 'user', message: current, timestamp: new Date().toLocaleTimeString() }]);
        setIsThinking(true);
        socket.send(JSON.stringify({ message: current, device: selectedDevice }));
      }
    }, 2000);
  }, [transcript, isListening, resetTranscript, selectedDevice, awaitingApproval, handleApplyConfig, socket]);

  const handleTextSubmit = () => {
    if (!selectedDevice || !transcriptBox.trim()) return;
    setFromVoice(false);
    setChatLog(prev => [...prev, { sender: 'user', message: transcriptBox, timestamp: new Date().toLocaleTimeString() }]);
    setIsThinking(true);
    socket.send(JSON.stringify({ message: transcriptBox, device: selectedDevice }));
    setTranscriptBox('');
  };

  const handleStartVoice = () => {
    if (!browserSupportsSpeechRecognition) return alert('Your browser does not support speech recognition.');
    if (isListening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      setFromVoice(true);
      setTimeout(() => SpeechRecognition.startListening({ continuous: true }), 300);
      setIsListening(true);
    }
  };

  const speak = (text) => {
    const synth = window.speechSynthesis;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    const voice = synth.getVoices().find(v => v.name.includes("Google UK English Male") || v.name.includes("Microsoft David"));
    if (voice) utterance.voice = voice;
    utterance.onend = () => {
      if (shouldResumeListening.current) {
        SpeechRecognition.startListening({ continuous: true });
        setIsListening(true);
      }
    };
    synth.cancel();
    synth.speak(utterance);
  };

  const handlePreviewRollback = () => {
    if (!selectedDevice) return setStatusMessage('❌ No device selected.');
    fetch('http://localhost:8000/preview-rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedDevice),
    })
      .then(res => res.json())
      .then(data => {
        setRollbackPreview(data.output || 'No rollback preview available.');
        setShowRollbackModal(true);
      });
  };

  const handleRollback = () => {
    setRollingBack(true);
    fetch('http://localhost:8000/rollback-latest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selectedDevice),
    })
      .then(res => res.json())
      .then(data => {
        setStatusMessage(`⚙️ ${data.message || 'Rollback executed.'}`);
        setChatLog(prev => [...prev, { sender: 'ai', message: `🔁 Rollback Executed:
${rollbackPreview}`, timestamp: new Date().toLocaleTimeString() }]);
        setShowRollbackModal(false);
      })
      .catch(() => setStatusMessage('❌ Rollback failed. Check console.'))
      .finally(() => setRollingBack(false));
  };

  return (
    <div className="config-review-container">
      {/* Left Side - Chat Interface */}
      <div className="config-review-left">
        <div className="config-review-left-content">
          <h2 className="config-review-title">AI Configuration Assistant</h2>

          <select
            className="device-selector"
            value={selectedIndex}
            onChange={(e) => {
              const device = devices[e.target.value];
              setSelectedIndex(e.target.value);
              setSelectedDevice(device);
              localStorage.setItem('selectedDevice', JSON.stringify(device));
            }}>
            <option value="">-- Choose a device --</option>
            {devices.map((device, idx) => (
              <option key={idx} value={idx}>
                {device.name} ({device.ip})
              </option>
            ))}
          </select>

          {/* Chat Messages - Flex grow to fill available space */}
          <div className="chat-messages-container">
            {chatLog.map((msg, idx) => (
              <div key={idx} className={`chat-message ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                <span className={`chat-bubble ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                  {msg.message}
                  <div className="chat-timestamp">{msg.timestamp}</div>
                </span>
              </div>
            ))}
            {isThinking && (
              <div className="ai-thinking">
                <span className="ai-thinking-bubble">
                  🤖 AI is thinking...
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area - Fixed at bottom */}
          <div className="input-area">
            <textarea
              placeholder="Type a request here..."
              rows={2}
              className="input-textarea"
              value={transcriptBox}
              onChange={(e) => setTranscriptBox(e.target.value)}
            />

            <div className="button-group">
              <button onClick={handleTextSubmit} className="btn-send">Send</button>
              <button onClick={handlePreviewRollback} className="btn-preview-rollback">Preview Rollback</button>
              <button 
                onClick={handleStartVoice} 
                className={`btn-voice ${isListening ? 'listening' : ''}`}
              >
                {isListening ? '🛑 Stop' : '🎙️ Talk to AI'}
              </button>
            </div>

            {statusMessage && <p className="status-message">{statusMessage}</p>}
          </div>
        </div>
      </div>

      {/* Right Side - Main Content Area */}
      <div className="config-review-right">
        <div className="config-review-right-content">
          <div className="config-review-main-area">
            {/* Content for the right side will be added in the next step */}
            <div className="config-review-placeholder">
              Select a device and start a conversation to see configuration options
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      {showConfigModal && (
        <div className="modal-overlay">
          <div className="config-modal">
            <h3 className="modal-title">AI-Generated Configuration</h3>
            <textarea
              value={generatedConfig}
              onChange={(e) => setGeneratedConfig(e.target.value)}
              rows={10}
              className="config-textarea"
            />
            <div className="modal-actions">
              <button onClick={() => setGeneratedConfig(originalConfig)} className="btn-reset">Reset</button>
              <button onClick={() => setShowConfigModal(false)} className="btn-cancel">Cancel</button>
              <button
                onClick={handleApplyConfig}
                className="btn-approve">
                {applyingConfig && <div className="loading-spinner-small"></div>}
                Approve & Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rollback Modal */}
      {showRollbackModal && (
        <div className="modal-overlay">
          <div className="rollback-modal">
            <h3 className="modal-title">Rollback Preview</h3>
            <pre className="rollback-preview">
              {rollbackPreview}
            </pre>
            <div className="modal-actions">
              <button onClick={() => setShowRollbackModal(false)} className="btn-cancel">Cancel</button>
              <button
                onClick={handleRollback}
                className="btn-rollback">
                {rollingBack && <div className="loading-spinner-small"></div>}
                Rollback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UnifiedConfigAssistant;
