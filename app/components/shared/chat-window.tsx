'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: number;
  text: string;
  sender: 'user' | 'ai';
  isRoleplayPrompt?: boolean;
}

interface RoleplayScenario {
  id: string;
  title: string;
  icon: string;
  description: string;
  initialMessage: string;
  context: string;
}

const SILENCE_THRESHOLD = 0.01;
const SILENCE_DURATION = 1500;

const ROLEPLAY_SCENARIOS: RoleplayScenario[] = [
  {
    id: 'school',
    title: 'At School',
    icon: '🏫',
    description: 'Practice talking with teachers and classmates',
    initialMessage: 'Good morning! What\'s your name?',
    context: 'You are a friendly teacher meeting a new student. Keep responses simple, encouraging, and ask basic questions about school life, subjects, and friends.'
  },
  {
    id: 'store',
    title: 'At the Store',
    icon: '🛒',
    description: 'Learn to shop and ask for things you need',
    initialMessage: 'Welcome to our store! What would you like to buy today?',
    context: 'You are a helpful shopkeeper. Ask about what they want to buy, help them with prices, and practice basic shopping vocabulary.'
  },
  {
    id: 'home',
    title: 'At Home',
    icon: '🏠',
    description: 'Talk about family and daily activities',
    initialMessage: 'Hello! Tell me about your family. Who do you live with?',
    context: 'You are a friendly neighbor asking about family and home life. Ask about family members, daily routines, and household activities.'
  },
  {
    id: 'playground',
    title: 'At the Playground',
    icon: '🎮',
    description: 'Make friends and talk about games',
    initialMessage: 'Hi there! Do you want to play together? What games do you like?',
    context: 'You are a friendly child at the playground. Talk about games, sports, hobbies, and making friends.'
  }
];

export function ChatWindow() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState('en-US');
  const [isRoleplayMode, setIsRoleplayMode] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<RoleplayScenario | null>(null);
  const [showScenarioSelection, setShowScenarioSelection] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const startRoleplay = (scenario: RoleplayScenario) => {
    setSelectedScenario(scenario);
    setShowScenarioSelection(false);
    setMessages([{
      id: Date.now(),
      text: scenario.initialMessage,
      sender: 'ai',
      isRoleplayPrompt: true
    }]);
  };

  const exitRoleplay = () => {
    setIsRoleplayMode(false);
    setSelectedScenario(null);
    setMessages([]);
  };

  const toggleRoleplayMode = () => {
    if (isRoleplayMode) {
      exitRoleplay();
    } else {
      setIsRoleplayMode(true);
      setShowScenarioSelection(true);
      setMessages([]);
    }
  };

  const handleRecord = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      audioChunksRef.current = [];
      if (!audioContextRef.current) audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      source.connect(analyserRef.current);
      mediaRecorderRef.current.ondataavailable = (event) => audioChunksRef.current.push(event.data);
      mediaRecorderRef.current.onstop = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        if (audioBlob.size > 0) {
          setIsLoading(true);
          sendAudioToServer(audioBlob);
        }
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
      detectSpeech();
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please allow microphone permission.");
    }
  };

  const detectSpeech = () => {
    if (!analyserRef.current) return;
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteTimeDomainData(dataArray);
    const rms = Math.sqrt(dataArray.reduce((sum, val) => sum + Math.pow((val / 128.0) - 1, 2), 0) / dataArray.length);
    if (rms > SILENCE_THRESHOLD) {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    } else {
      if (!silenceTimerRef.current && mediaRecorderRef.current?.state === 'recording') {
        silenceTimerRef.current = setTimeout(() => mediaRecorderRef.current?.stop(), SILENCE_DURATION);
      }
    }
    animationFrameRef.current = requestAnimationFrame(detectSpeech);
  };

  const sendAudioToServer = async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('language', language);
    
    // Add roleplay context if in roleplay mode
    if (isRoleplayMode && selectedScenario) {
      formData.append('isRoleplay', 'true');
      formData.append('roleplayContext', selectedScenario.context);
      formData.append('scenarioTitle', selectedScenario.title);
    }
    
    try {
      const response = await fetch('/api/chat', { method: 'POST', body: formData });
      if (!response.ok) throw new Error(`Network response was not ok: ${await response.text()}`);
      const responseData = await response.formData();
      const audioResponseBlob = responseData.get('audio') as Blob;
      const textData = JSON.parse(responseData.get('textData') as string);
      setMessages(prev => [
        ...prev,
        { id: Date.now(), text: textData.user, sender: 'user' },
        { id: Date.now() + 1, text: textData.ai, sender: 'ai' }
      ]);
      const audioUrl = URL.createObjectURL(audioResponseBlob);
      const audio = new Audio(audioUrl);
      audio.play();
    } catch (error) {
      console.error('Error sending audio to server:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const GenieIcon = () => ( 
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M12 2a5 5 0 0 0-5 5c0 1.48.65 2.79 1.67 3.67C6.79 11.98 6 13.82 6 16v2h12v-2c0-2.18-.79-4.02-2.67-5.33A4.98 4.98 0 0 0 17 7a5 5 0 0 0-5-5zm-3 5a3 3 0 0 1 3-3 3 3 0 0 1 3 3c0 .83-.34 1.58-.88 2.12C13.43 9.4 12.76 9 12 9s-1.43.4-2.12.88A3.01 3.01 0 0 1 9 7zm3 5c2.97 0 5.46 2.16 5.92 5H6.08A5.99 5.99 0 0 1 12 12z"></path>
    </svg> 
  );
  
  const UserIcon = () => ( 
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path>
    </svg> 
  );
  
  const MicIcon = () => ( 
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-lg">
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" x2="12" y1="19" y2="22"></line>
    </svg> 
  );

  const SparkleIcon = ({ className = "" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className={`text-yellow-300 ${className}`}>
      <path d="M12 0l2.5 7.5L22 10l-7.5 2.5L12 20l-2.5-7.5L2 10l7.5-2.5L12 0z"/>
    </svg>
  );

  return (
    <div className="font-nunito w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-pink-200 via-purple-200 via-blue-200 to-cyan-200 relative overflow-hidden">
      {/* Floating sparkles animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <SparkleIcon className="absolute top-10 left-10 animate-bounce text-pink-400" />
        <SparkleIcon className="absolute top-20 right-20 animate-bounce text-blue-400"/>
        <SparkleIcon className="absolute bottom-32 left-16 animate-bounce text-purple-400"/>
        <SparkleIcon className="absolute bottom-20 right-32 animate-bounce text-green-400"/>
        <SparkleIcon className="absolute top-1/2 left-8 animate-bounce text-yellow-400" />
        <SparkleIcon className="absolute top-1/3 right-12 animate-bounce text-red-400" />
      </div>
      
      <div className="w-full max-w-2xl h-[90vh] md:h-[80vh] bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col border-4 border-white/50 relative z-10">
        <div className="p-4 border-b border-rainbow bg-gradient-to-r from-pink-300 via-purple-300 to-blue-300 rounded-t-3xl flex justify-between items-center gap-4">
          <h1 className="text-xl md:text-2xl font-bold text-white drop-shadow-lg flex items-center gap-2">
            {isRoleplayMode ? (
              <>🎭 {selectedScenario ? `${selectedScenario.icon} ${selectedScenario.title}` : 'Choose Roleplay'} ✨</>
            ) : (
              <>🧞‍♂️ LearnGenie AI Tutor ✨</>
            )}
            <span className="animate-bounce">🌟</span>
          </h1>
          <div className="flex items-center gap-3">
            {/* Roleplay Mode Toggle */}
            <button
              onClick={toggleRoleplayMode}
              className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all duration-300 shadow-lg ${
                isRoleplayMode 
                  ? 'bg-gradient-to-r from-red-400 to-pink-500 text-white hover:from-red-500 hover:to-pink-600' 
                  : 'bg-gradient-to-r from-green-400 to-blue-500 text-white hover:from-green-500 hover:to-blue-600'
              }`}
            >
              {isRoleplayMode ? '🏠 Exit Roleplay' : '🎭 Roleplay'}
            </button>
            
            {/* Language Selector */}
            <div className="relative">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="font-nunito rounded-xl border-3 border-white/50 py-2 pl-4 pr-10 text-black bg-gradient-to-r from-purple-400 to-pink-400 appearance-none focus:outline-none focus:ring-4 focus:ring-yellow-300 shadow-lg font-semibold"
                style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23000000' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.25em 1.25em' }}
              >
                <option value="en-US" className="text-black"> English</option>
                <option value="hi-IN" className="text-black"> Hindi</option>
                <option value="mr-IN" className="text-black"> Marathi</option>
                <option value="gu-IN" className="text-black"> Gujarati</option>
                <option value="ta-IN" className="text-black"> Tamil</option>
              </select>
            </div>
          </div>
        </div>
        
        <div ref={chatContainerRef} className="flex-1 p-6 space-y-6 overflow-y-auto bg-gradient-to-b from-white/20 to-blue-50/30">
          {/* Scenario Selection */}
          {showScenarioSelection && (
            <div className="text-center space-y-6">
              <div className="text-6xl mb-4 animate-bounce">🎭</div>
              <h2 className="text-2xl font-bold text-purple-600 mb-4">Choose Your Roleplay Adventure! 🌟</h2>
              <p className="text-lg text-gray-600 mb-6">Pick a scenario and start practicing conversations!</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ROLEPLAY_SCENARIOS.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => startRoleplay(scenario)}
                    className="p-6 bg-gradient-to-br from-white to-purple-50 rounded-2xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                  >
                    <div className="text-4xl mb-3">{scenario.icon}</div>
                    <h3 className="text-xl font-bold text-purple-700 mb-2">{scenario.title}</h3>
                    <p className="text-sm text-gray-600">{scenario.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Regular Chat or Empty State */}
          {!showScenarioSelection && messages.length === 0 && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">
                {isRoleplayMode ? '🎭' : '🧞‍♂️'}
              </div>
              <h2 className="text-2xl font-bold text-purple-600 mb-2">
                {isRoleplayMode ? 'Ready for Roleplay! 🎭' : 'Welcome to LearnGenie! 🌟'}
              </h2>
              <p className="text-lg text-gray-600">
                {isRoleplayMode 
                  ? 'Choose a scenario above to start your roleplay adventure!' 
                  : 'Tap the magic microphone below to start talking! 🎤✨'
                }
              </p>
              <div className="flex justify-center gap-2 mt-4">
                <span className="animate-bounce text-2xl" style={{animationDelay: '0s'}}>🌈</span>
                <span className="animate-bounce text-2xl" style={{animationDelay: '0.2s'}}>⭐</span>
                <span className="animate-bounce text-2xl" style={{animationDelay: '0.4s'}}>🎉</span>
              </div>
            </div>
          )}
          
          {/* Messages */}
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && (
                <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-white animate-pulse ${
                  isRoleplayMode 
                    ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500' 
                    : 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400'
                }`}> 
                  {isRoleplayMode ? <span className="text-2xl">🎭</span> : <GenieIcon />}
                </div>
              )}
              <div className={`max-w-xs md:max-w-md p-4 rounded-t-2xl text-base shadow-lg transform hover:scale-105 transition-all duration-300 ${ 
                msg.sender === 'user' 
                  ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white rounded-bl-2xl border-2 border-blue-300' 
                  : isRoleplayMode
                    ? 'bg-gradient-to-br from-purple-50 to-pink-50 text-gray-800 rounded-br-2xl border-2 border-purple-200'
                    : 'bg-gradient-to-br from-white to-yellow-50 text-gray-800 rounded-br-2xl border-2 border-yellow-200' 
              }`}>
                {msg.isRoleplayPrompt && (
                  <div className="text-xs text-purple-600 font-semibold mb-2 uppercase tracking-wide">
                    🎭 {selectedScenario?.title}
                  </div>
                )}
                <p className="font-medium">{msg.text}</p>
              </div>
              {msg.sender === 'user' && (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-white"> 
                  <UserIcon /> 
                </div>
              )}
            </div>
          ))}
          
          {/* Loading Animation */}
          {isLoading && (
            <div className="flex items-end gap-3 justify-start">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg border-2 border-white animate-pulse ${
                isRoleplayMode 
                  ? 'bg-gradient-to-br from-purple-500 via-pink-500 to-red-500' 
                  : 'bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400'
              }`}> 
                {isRoleplayMode ? <span className="text-2xl">🎭</span> : <GenieIcon />}
              </div>
              <div className={`rounded-br-2xl rounded-t-2xl p-4 shadow-lg border-2 ${
                isRoleplayMode 
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 text-gray-800 border-purple-200'
                  : 'bg-gradient-to-br from-white to-yellow-50 text-gray-800 border-yellow-200'
              }`}>
                <div className="flex items-center justify-center gap-1">
                  <span className="h-3 w-3 bg-gradient-to-r from-pink-400 to-red-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="h-3 w-3 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="h-3 w-3 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Controls */}
        <div className="p-6 bg-gradient-to-r from-purple-100 via-pink-100 to-blue-100 border-t-4 border-white/50 rounded-b-3xl flex flex-col items-center justify-center gap-3 relative">
          {/* Magic sparkles around button */}
          <div className="absolute inset-0 pointer-events-none">
            <SparkleIcon className="absolute top-2 left-8 animate-ping text-pink-400" />
            <SparkleIcon className="absolute top-4 right-8 animate-ping text-blue-400" />
            <SparkleIcon className="absolute bottom-2 left-12 animate-ping text-purple-400"/>
            <SparkleIcon className="absolute bottom-4 right-12 animate-ping text-green-400"/>
          </div>
          
          {/* Microphone Button */}
          {!showScenarioSelection && (
            <button
              onClick={handleRecord} 
              disabled={isLoading}
              className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ease-in-out shadow-2xl transform hover:scale-110 border-4 border-white relative z-10 ${
                isRecording 
                  ? 'bg-gradient-to-r from-red-400 to-pink-500 animate-pulse' 
                  : isRoleplayMode
                    ? 'bg-gradient-to-r from-purple-500 via-pink-500 to-red-500'
                    : 'bg-gradient-to-r from-purple-500 via-pink-500 via-yellow-500 to-green-500'
              } ${
                isLoading ? 'bg-gray-400 cursor-not-allowed' : 'hover:shadow-rainbow'
              }`}
            >
              <MicIcon />
              {isRecording && (
                <div className="absolute inset-0 rounded-full animate-ping bg-red-400 opacity-30"></div>
              )}
            </button>
          )}
          
          <p className="text-sm font-semibold text-purple-700 mt-1 flex items-center gap-1">
            {showScenarioSelection ? (
              <>🎭 Choose your roleplay adventure! <span className="animate-bounce">✨</span></>
            ) : isRecording ? (
              <>🎤 Listening to your magic words... <span className="animate-bounce">✨</span></>
            ) : isRoleplayMode && selectedScenario ? (
              <>🎭 You&apos;re in {selectedScenario.title}! Keep talking! 🎪</>
            ) : (
              <>🌟 Tap the magic button to speak! 🎪</>
            )}
          </p>
          
          <div className="flex gap-1 mt-1">
            <span className="animate-bounce text-lg" style={{animationDelay: '0s'}}>
              {isRoleplayMode ? '🎭' : '🎵'}
            </span>
            <span className="animate-bounce text-lg" style={{animationDelay: '0.3s'}}>
              {isRoleplayMode ? '✨' : '🎶'}
            </span>
            <span className="animate-bounce text-lg" style={{animationDelay: '0.6s'}}>
              {isRoleplayMode ? '🌟' : '🎵'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}