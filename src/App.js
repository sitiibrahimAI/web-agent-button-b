import React, { useState, useRef, useCallback } from 'react';
import { BlandWebClient } from "bland-client-js-sdk";
import './App.css';

const API_URL = 'http://api-env.eba-kgdp674b.us-west-2.elasticbeanstalk.com';

function App() {
  const [status, setStatus] = useState('idle');
  const [sdk, setSdk] = useState(null);
  const [message, setMessage] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const audioContextRef = useRef(null);
  const streamRef = useRef(null);

  const fetchNewToken = useCallback(async () => {
    try {
      console.log('Fetching token from server...');
      const response = await fetch(`${API_URL}/api/token`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Response received:', data);
      if (!data.token || !data.agentId) {
        throw new Error('Token or Agent ID not received from server');
      }
      console.log('Token and Agent ID received from server');
      return { token: data.token, agentId: data.agentId };
    } catch (error) {
      console.error('Error fetching token:', error);
      throw error;
    }
  }, []);

  const fetchNewTokenWithRetry = useCallback(async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await fetchNewToken();
      } catch (error) {
        if (i === retries - 1) throw error;
        console.log(`Retry attempt ${i + 1}`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second before retrying
      }
    }
  }, [fetchNewToken]);

  const initializeAudio = async () => {
    console.log('Initializing audio');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('Microphone access granted');
      streamRef.current = stream;
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      await audioContextRef.current.resume();
      console.log('AudioContext created and resumed');
    } catch (error) {
      console.error('Error initializing audio:', error);
      throw error;
    }
  };

  const handleClick = async () => {
    console.log('Button clicked, current status:', status);
    setError(null);
    if (status === 'idle') {
      setStatus('connecting');
      setIsProcessing(true);
      setIsLoading(true);
      console.log('Status set to connecting');
      try {
        const { token, agentId } = await fetchNewTokenWithRetry();
        await initializeAudio();
        
        console.log('Initializing SDK with new token');
        console.log('BLAND_AGENT_ID:', agentId);
        console.log('Session Token:', token.substring(0, 10) + '...');
        
        const newSdk = new BlandWebClient(agentId, token);
        console.log('BlandWebClient instance created');
        
        await newSdk.initConversation({ 
          sampleRate: 44100,
          onSpeechStart: () => {
            console.log('Speech detected - user is speaking', new Date().toISOString());
            setIsSpeaking(true);
          },
          onSpeechEnd: () => {
            console.log('Speech ended - user stopped speaking', new Date().toISOString());
            setIsSpeaking(false);
          },
          onMessage: (message) => {
            console.log('Received message from Bland:', JSON.stringify(message, null, 2));
            setIsProcessing(false);
            if (message.text) {
              console.log('AI response text:', message.text);
              setMessage(message.text);
            }
            if (message.audio) {
              console.log('Received audio response, length:', message.audio.byteLength);
              playAudio(message.audio);
            }
          },
        });
        
        setSdk(newSdk);
        setStatus('active');
        console.log('Conversation initialized, status set to active');
      } catch (error) {
        console.error('Failed to start conversation:', error);
        console.error('Error stack:', error.stack);
        setStatus('idle');
        setIsProcessing(false);
        if (error.message.includes('Token or Agent ID not received')) {
          setError('Unable to connect to the AI assistant. Please try again later.');
        } else if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
          setError('Unable to reach the server. Please check your internet connection and try again.');
        } else if (error.name === 'TypeError' && error.message.includes('Cross-Origin Request Blocked')) {
          setError('CORS error. Please check the API server configuration.');
        } else {
          setError('An error occurred while connecting to the AI assistant. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    } else if (status === 'active') {
      try {
        console.log('Stopping conversation');
        await sdk.stopConversation();
        setStatus('idle');
        setMessage('');
        setIsSpeaking(false);
        setIsProcessing(false);
        setSdk(null);
        console.log('Conversation stopped, status set to idle');
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          console.log('Audio tracks stopped');
        }
      } catch (error) {
        console.error('Failed to stop conversation:', error);
        setError('Failed to stop conversation. Please try again.');
      }
    }
  };

  const playAudio = (audioData) => {
    if (!audioContextRef.current) {
      console.error('AudioContext not initialized');
      setError('Audio playback failed. Please try restarting the conversation.');
      return;
    }
    const audioContext = audioContextRef.current;
    audioContext.decodeAudioData(audioData, (buffer) => {
      console.log('Audio data decoded successfully');
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
      console.log('Audio playback started');
    }, (error) => {
      console.error('Error decoding audio data:', error);
      setError('Failed to play audio response. Please try again.');
    });
  };

  return (
    <div className="App">
      <button 
        onClick={handleClick} 
        disabled={status === 'connecting' || isLoading}
        className={status === 'active' ? 'active' : ''}
      >
        {status === 'idle' ? 'Talk with Assistant' : 
         status === 'connecting' ? 'Connecting...' : 'End Call'}
      </button>
      {status === 'active' && (
        <div className={`mic-indicator ${isSpeaking ? 'speaking' : ''}`}>
          🎤
        </div>
      )}
      {isProcessing && <div className="processing">AI is processing...</div>}
      {isLoading && <div className="loading">Loading...</div>}
      {message && (
        <div className="message-container">
          <h3>AI Response:</h3>
          <p className="message">{message}</p>
        </div>
      )}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;