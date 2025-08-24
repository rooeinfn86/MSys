import { useState, useEffect, useRef } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import './styles/ConfigVerification.css';

const ConfigVerification = ({ selectedNetworkId }) => {
  const [chatLog, setChatLog] = useState([]);
  const [transcriptBox, setTranscriptBox] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState('');
  const [isListening, setIsListening] = useState(false);

  const chatEndRef = useRef(null);
  const silenceTimeout = useRef(null);

  const { transcript, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();

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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLog]);

  useEffect(() => {
    if (!isListening || !transcript.trim()) return;

    if (silenceTimeout.current) clearTimeout(silenceTimeout.current);
    silenceTimeout.current = setTimeout(() => {
      const question = transcript.trim();
      resetTranscript();

      if (!selectedDevice) return setStatusMessage('❌ No device selected.');

      setChatLog(prev => [...prev, { sender: 'user', message: question }]);
      fetch('http://localhost:8000/ask-ai-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip: selectedDevice.ip,
          username: selectedDevice.username,
          password: selectedDevice.password,
          question: question
        })
      })
        .then(res => res.json())
        .then(data => {
          setChatLog(prev => [...prev, { sender: 'ai', message: `${data.command}\n${data.output}` }]);
        })
        .catch(() => setStatusMessage('❌ Failed to get AI response.'));
    }, 2000);
  }, [transcript, isListening, resetTranscript, selectedDevice]);

  const handleTextSubmit = () => {
    if (!selectedDevice || !transcriptBox.trim()) return;
    const question = transcriptBox.trim();
    setChatLog(prev => [...prev, { sender: 'user', message: question }]);

    fetch('http://localhost:8000/ask-ai-show', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ip: selectedDevice.ip,
        username: selectedDevice.username,
        password: selectedDevice.password,
        question: question
      })
    })
      .then(res => res.json())
      .then(data => {
        setChatLog(prev => [...prev, { sender: 'ai', message: `${data.command}\n${data.output}` }]);
      })
      .catch(() => setStatusMessage('❌ Failed to get AI response.'));

    setTranscriptBox('');
  };

  const handleStartVoice = () => {
    if (!browserSupportsSpeechRecognition) return alert('Your browser does not support speech recognition.');
    if (isListening) {
      SpeechRecognition.stopListening();
      setIsListening(false);
    } else {
      resetTranscript();
      setTimeout(() => SpeechRecognition.startListening({ continuous: true }), 300);
      setIsListening(true);
    }
  };

  return (
    <div className="config-verification-container">
      <div className="config-verification-content">
        <h2 className="config-verification-title">AI Configuration Verification</h2>

        <select
          className="device-selector-verification"
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

        <div className="chat-messages-container-verification">
          {chatLog.map((msg, idx) => (
            <div key={idx} className={`chat-message-verification ${msg.sender}`}>
              <div className={`chat-bubble-verification ${msg.sender}`}>
                {msg.message}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div className="input-area-verification">
          <textarea
            placeholder="Type a show command or ask a question..."
            className="input-textarea-verification"
            value={transcriptBox}
            onChange={(e) => setTranscriptBox(e.target.value)}
          />
          
          <div className="button-group-verification">
            <button
              onClick={handleTextSubmit}
              className="btn-send-verification"
            >
              Send
            </button>
            <button
              onClick={handleStartVoice}
              className={`btn-voice-verification ${isListening ? 'listening' : ''}`}
            >
              {isListening ? '🛑 Stop' : '🎙️ Talk to AI'}
            </button>
          </div>

          {statusMessage && (
            <div className={`status-message-verification ${statusMessage.includes('❌') ? 'error' : 'success'}`}>
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfigVerification;
