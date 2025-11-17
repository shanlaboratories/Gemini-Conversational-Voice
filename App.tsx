
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveSession, Chat } from '@google/genai';
import { TranscriptMessage, Conversation, User } from './types';
import { decode, decodeAudioData, createBlob, createWavBlob } from './utils/audio';

// --- Constants ---
const USERS_STORAGE_KEY = 'gemini-voice-app-users';
const CURRENT_USER_STORAGE_KEY = 'gemini-voice-app-currentUser';
const LANGUAGES = [
    { code: 'en-US', name: 'English (US)' },
    { code: 'es-ES', name: 'Español (España)' },
    { code: 'fr-FR', name: 'Français' },
    { code: 'de-DE', name: 'Deutsch' },
    { code: 'it-IT', name: 'Italiano' },
    { code: 'ja-JP', name: '日本語' },
    { code: 'ko-KR', name: '한국어' },
    { code: 'pt-BR', name: 'Português (Brasil)' },
    { code: 'zh-CN', name: '中文 (普通话)' },
];


// --- Helper Components (Defined outside main App to prevent re-creation) ---

const IconMicrophone: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 14a2 2 0 0 1-2-2V6a2 2 0 1 1 4 0v6a2 2 0 0 1-2 2Zm-2-6a2 2 0 0 1 4 0v6a2 2 0 0 1-4 0V8Zm6 4a1 1 0 0 0-2 0v1a5 5 0 0 1-10 0v-1a1 1 0 1 0-2 0v1a7 7 0 0 0 6 6.92V21a1 1 0 1 0 2 0v-2.08A7 7 0 0 0 18 13v-1Z"/>
  </svg>
);

const IconChatBubble: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-2 12H6v-2h12v2Zm0-4H6V8h12v2Z"/>
    </svg>
);

const IconMicrophoneMute: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 14a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2 .46.46 0 0 1 .112.015l-1.57 1.57a.48.48 0 0 0-.128.349V12a2 2 0 0 1-2 2 .46.46 0 0 1-.112-.015l1.57-1.57a.48.48 0 0 0 .128-.349V8h.001l4.454 4.454a2 2 0 0 1-3.04 1.545Zm6.809 1.2a1 1 0 0 1 .191 1.4A7.002 7.002 0 0 1 13 18.92V21a1 1 0 1 1-2 0v-2.08a7 7 0 0 1-5.947-4.473 1 1 0 0 1 .894-1.453l.11-.027a1 1 0 0 1 .953.535 5 5 0 0 0 9.98 0 1 1 0 0 1 .954-.535l.109.027a1 1 0 0 1 1.256.453ZM4.121 2.707a1 1 0 0 1 1.414 0l14.142 14.142a1 1 0 0 1-1.414 1.414L4.121 4.121a1 1 0 0 1 0-1.414Z"/>
    </svg>
);

const IconStop: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8Zm4-8a4 4 0 1 1-4-4a4 4 0 0 1 4 4Z"/>
  </svg>
);

const IconLoader: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`${className} animate-spin`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const IconSend: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.341 3.932a.87.87 0 0 0-.962-.962L3.166 6.583a.87.87 0 0 0-.153 1.6l6.6 2.64 2.64 6.6a.87.87 0 0 0 1.6-.153l3.613-16.213Z"/>
    </svg>
);


const IconSpeaker: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 10a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h.5a1 1 0 0 1 0 2h-.5a3 3 0 0 1-3-3v-2a3 3 0 0 1 3-3h.5a1 1 0 0 1 0 2h-.5Zm4-2a1 1 0 0 0-1 1v6a1 1 0 1 0 2 0V9a1 1 0 0 0-1-1ZM5 10a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h2.172l4.201 4.201A1.5 1.5 0 0 0 14 17.061V6.939a1.5 1.5 0 0 0-2.627-1.142L7.172 10H5Z"/>
    </svg>
);

const IconLanguage: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.87 15.07 9.33 11.54A10.93 10.93 0 0 0 12 5.06V4h5v1h-3.09a8.94 8.94 0 0 1-2.14 3.33l3.4 3.4L18.6 8h-2.58l-1.9 3.81-1.3-1.3.83-1.66h-1.42L11 11.54l-4.4-4.4L4.17 10H2v1h2.83l.74.74L2.12 15.18l.71.71 3.45-3.45.72.72-2.13 2.12.71.71L12 12.1l2.12 2.12.71-.71-2.07-2.07.72-.72 3.46 3.46.7-.71-3.45-3.45-.72-.72 2.07-2.07-.71-.71L12 12.1 6.87 6.97 6.16 8H4v1h1.43l.72.72L3.54 12.3l.71.71 2.6-2.6.72.72-2.6 2.6.7.71L12 12.82l4.46 4.46.71-.71-4.3-4.3Z M21 4h-1v1h1V4Zm-1 2h-1v1h1V6Zm-1 2h-1v1h1V8Zm-1 2h-1v1h1v-1Zm-1 2h-1v1h1v-1Z"/>
    </svg>
);

const IconHistory: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8Zm1-12h-2v5.414l4.293 4.293 1.414-1.414L12 11.586V8Z"/>
    </svg>
);

const IconNewChat: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 2H8a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Zm-1 10h-2v2a1 1 0 0 1-2 0v-2H9a1 1 0 0 1 0-2h2V8a1 1 0 0 1 2 0v2h2a1 1 0 0 1 0 2Z"/>
    </svg>
);

const IconTrash: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 18a1 1 0 0 0 1-1v-6a1 1 0 0 0-2 0v6a1 1 0 0 0 1 1ZM14 18a1 1 0 0 0 1-1v-6a1 1 0 0 0-2 0v6a1 1 0 0 0 1 1ZM20 6h-4V5a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v1H4a1 1 0 0 0 0 2h1v11a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3V8h1a1 1 0 1 0 0-2ZM10 5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1h-4V5Zm7 14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V8h10v11Z"/>
    </svg>
);

const IconClose: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
    <path d="m12 13.414-4.95 4.95-1.414-1.414L10.586 12 5.636 7.05l1.414-1.414L12 10.586l4.95-4.95 1.414 1.414L13.414 12l4.95 4.95-1.414 1.414L12 13.414Z"/>
  </svg>
);

const IconLogout: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M16 17a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h8Zm-4-3.586-2.293-2.293a1 1 0 0 0-1.414 1.414L11.586 16l-3.293 3.293a1 1 0 0 0 1.414 1.414L12 17.414l2.293 2.293a1 1 0 0 0 1.414-1.414L13.414 16l3.293-3.293a1 1 0 0 0-1.414-1.414L12 14.414ZM21 12a9 9 0 1 0-9 9 9 9 0 0 0 9-9ZM5 12a7 7 0 1 1 7 7 7 7 0 0 1-7-7Z"/>
    </svg>
);

const IconPlay: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8Zm-1.5-12a.5.5 0 0 1 .832-.374l5 4a.5.5 0 0 1 0 .748l-5 4A.5.5 0 0 1 10.5 12v-8Z"/>
    </svg>
);

const IconPause: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8Zm-3-12h2v8h-2v-8Zm4 0h2v8h-2v-8Z"/>
    </svg>
);

const IconDownload: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 15a1 1 0 0 1-.707-.293l-4-4a1 1 0 1 1 1.414-1.414L12 12.586l3.293-3.293a1 1 0 1 1 1.414 1.414l-4 4A1 1 0 0 1 12 15Z"/>
        <path d="M12 2a10 10 0 1 0 10 10A10.011 10.011 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8a8.009 8.009 0 0 1-8 8Z"/>
        <path d="M17 15H7a1 1 0 0 0 0 2h10a1 1 0 0 0 0-2Z"/>
    </svg>
);

const AppLogo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`flex items-center justify-center bg-gradient-to-br from-blue-500 to-blue-600 rounded-full ${className}`}>
        <IconMicrophone className="text-white w-1/2 h-1/2" />
    </div>
);

const LoadingScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col items-center justify-center font-sans">
        <AppLogo className="w-24 h-24 mb-6 animate-pulse" />
        <h1 className="text-2xl font-bold text-gray-300">{message}</h1>
    </div>
);

const MessageBubble: React.FC<{ message: TranscriptMessage }> = ({ message }) => {
  const isUser = message.speaker === 'user';
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    // Cleanup blob URL on unmount
    return () => {
      if (audioBlobUrl) {
        URL.revokeObjectURL(audioBlobUrl);
      }
    };
  }, [audioBlobUrl]);
  
  const handleGenerateAudio = async () => {
      if (message.text.trim().length === 0) return;

      setIsGeneratingAudio(true);
      setTtsError(null);
      
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: message.text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }
        
        const pcmData = decode(base64Audio);
        const wavBlob = createWavBlob(pcmData, 24000); // TTS model sample rate is 24000
        const url = URL.createObjectURL(wavBlob);
        setAudioBlobUrl(url);

      } catch (err) {
          console.error("TTS generation failed:", err);
          const errorMessage = err instanceof Error ? err.message : "An unknown error occurred.";
          setTtsError(`Audio generation failed.`);
      } finally {
          setIsGeneratingAudio(false);
      }
  };

  const handlePlayPause = () => {
      if (!audioRef.current) return;
      if (isPlaying) {
          audioRef.current.pause();
      } else {
          audioRef.current.play();
      }
  };
  
  const handleDownloadAudio = () => {
      if (!audioBlobUrl) return;
      const a = document.createElement('a');
      a.href = audioBlobUrl;
      a.download = `gemini-tts-audio.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-prose rounded-2xl ${isUser ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'} ${message.isPartial ? 'opacity-70' : ''}`}>
        <div className="px-5 py-3">
          <p className="leading-relaxed whitespace-pre-wrap">{message.text}</p>
        </div>
        {!isUser && !message.isPartial && message.text && (
            <div className="px-5 pb-3 border-t border-gray-600/50 flex items-center gap-3 min-h-[40px]">
                {isGeneratingAudio ? (
                    <IconLoader className="w-5 h-5 text-gray-400" />
                ) : audioBlobUrl ? (
                    <>
                        <button onClick={handlePlayPause} className="text-blue-400 hover:text-blue-300 transition-colors" aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
                            {isPlaying ? <IconPause className="w-6 h-6" /> : <IconPlay className="w-6 h-6" />}
                        </button>
                        <button onClick={handleDownloadAudio} className="text-gray-400 hover:text-white transition-colors" aria-label="Download audio">
                            <IconDownload className="w-6 h-6" />
                        </button>
                        <audio 
                            ref={audioRef} 
                            src={audioBlobUrl} 
                            onEnded={() => setIsPlaying(false)}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            hidden 
                        />
                    </>
                ) : (
                    <button onClick={handleGenerateAudio} className="text-gray-400 hover:text-white transition-colors" aria-label="Generate text to speech">
                       <IconSpeaker className="w-5 h-5" />
                    </button>
                )}
                 {ttsError && <p className="text-red-400 text-xs ml-2">{ttsError}</p>}
            </div>
        )}
      </div>
    </div>
  );
};

// --- Authentication Component ---
const Auth: React.FC<{ onLoginSuccess: (user: User) => void }> = ({ onLoginSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Email and password are required.');
            return;
        }

        const users = JSON.parse(localStorage.getItem(USERS_STORAGE_KEY) || '[]');
        
        if (isLogin) {
            const user = users.find((u: any) => u.email === email && u.password === password);
            if (user) {
                onLoginSuccess({ email });
            } else {
                setError('Invalid email or password.');
            }
        } else { // Sign up
            if (users.some((u: any) => u.email === email)) {
                setError('An account with this email already exists.');
                return;
            }
            const newUser = { email, password };
            localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([...users, newUser]));
            onLoginSuccess({ email });
        }
    };

    return (
        <div className="bg-gray-900 text-white min-h-screen flex items-center justify-center font-sans">
            <div className="w-full max-w-md p-8 space-y-8 bg-gray-800 rounded-lg shadow-lg">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-blue-400">Gemini Voice App</h1>
                    <p className="mt-2 text-gray-400">{isLogin ? 'Welcome back!' : 'Create your account'}</p>
                </div>
                <form className="space-y-6" onSubmit={handleSubmit}>
                    <div className="relative">
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email Address"
                            required
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="relative">
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                     {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div>
                        <button type="submit" className="w-full px-4 py-3 font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-blue-500 transition-colors">
                            {isLogin ? 'Login' : 'Sign Up'}
                        </button>
                    </div>
                </form>
                <div className="text-center">
                    <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-sm text-blue-400 hover:underline">
                        {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Main Application Component ---

export default function App() {
  const [appState, setAppState] = useState<'initial_loading' | 'auth' | 'post_login_loading' | 'app_loaded'>('initial_loading');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [mode, setMode] = useState<'voice' | 'text'>('voice');
  
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  
  const [voiceConnectionState, setVoiceConnectionState] = useState<'idle' | 'connecting' | 'live'>('idle');
  const [voiceConnectionMessage, setVoiceConnectionMessage] = useState('');
  const [liveStatusText, setLiveStatusText] = useState('');

  const [isMuted, setIsMuted] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<Conversation[]>([]);
  const [isHistoryPanelOpen, setIsHistoryPanelOpen] = useState(false);
  const [viewingConversationId, setViewingConversationId] = useState<string | null>(null);

  const [audioOutputDevices, setAudioOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedAudioOutput, setSelectedAudioOutput] = useState<string>('default');
  const [inputLanguage, setInputLanguage] = useState<string>('en-US');
  const [outputLanguage, setOutputLanguage] = useState<string>('en-US');

  const sessionRef = useRef<LiveSession | null>(null);
  const chatRef = useRef<Chat | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);

  const currentInputRef = useRef<string>('');
  const currentOutputRef = useRef<string>('');
  const nextStartTimeRef = useRef<number>(0);
  const audioPlaybackSources = useRef<Set<AudioBufferSourceNode>>(new Set());

  const transcriptEndRef = useRef<HTMLDivElement | null>(null);
  
  // App state machine
  useEffect(() => {
    let timer: number;
    if (appState === 'initial_loading') {
        timer = window.setTimeout(() => {
            try {
                const storedUser = localStorage.getItem(CURRENT_USER_STORAGE_KEY);
                if (storedUser) {
                    setCurrentUser(JSON.parse(storedUser));
                    setAppState('post_login_loading');
                } else {
                    setAppState('auth');
                }
            } catch (e) {
                console.error("Failed to parse user from localStorage", e);
                setAppState('auth');
            }
        }, 5000); // 5-second initial load
    } else if (appState === 'post_login_loading') {
        timer = window.setTimeout(() => {
            setAppState('app_loaded');
        }, 3000); // 3-second welcome screen
    }
    return () => clearTimeout(timer);
  }, [appState]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);
  
  // Load history from localStorage when user logs in
  useEffect(() => {
    if (!currentUser) {
        setHistory([]);
        return;
    }
    try {
        const historyKey = `gemini-voice-app-history-${currentUser.email}`;
        const storedHistory = localStorage.getItem(historyKey);
        if (storedHistory) {
            setHistory(JSON.parse(storedHistory));
        } else {
            setHistory([]);
        }
    } catch (error) {
        console.error("Failed to load history from localStorage:", error);
    }
  }, [currentUser]);

  // Enumerate audio output devices
  useEffect(() => {
    const updateDevices = async () => {
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true }); // Request permission first
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
            setAudioOutputDevices(audioOutputs);
        } catch (err) {
            console.error("Error enumerating devices:", err);
        }
    };
    
    updateDevices();
    navigator.mediaDevices.addEventListener('devicechange', updateDevices);

    return () => {
        navigator.mediaDevices.removeEventListener('devicechange', updateDevices);
    };
  }, []);

  const stopConversation = useCallback(() => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (scriptProcessorRef.current) {
        scriptProcessorRef.current.disconnect();
        scriptProcessorRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    for (const source of audioPlaybackSources.current.values()) {
        source.stop();
    }
    audioPlaybackSources.current.clear();
    nextStartTimeRef.current = 0;
    
    setVoiceConnectionState('idle');
    setVoiceConnectionMessage('');
    setLiveStatusText('');
    setIsMuted(false);
  }, []);
  
  const saveConversation = useCallback((convMode: 'voice' | 'text') => {
      if (!currentUser || transcripts.length === 0) return;

      const firstUserMessage = transcripts.find(t => t.speaker === 'user')?.text || '';
      const title = firstUserMessage.substring(0, 40).trim() + (firstUserMessage.length > 40 ? '...' : '') || `New ${convMode} Chat`;

      const newConversation: Conversation = {
          id: viewingConversationId || Date.now().toString(),
          title: title,
          timestamp: new Date().toISOString(),
          transcripts: transcripts.map(t => ({ ...t, isPartial: false })),
          mode: convMode,
      };

      setHistory(prev => {
          const filteredHistory = prev.filter(c => c.id !== newConversation.id);
          const updatedHistory = [newConversation, ...filteredHistory];
          try {
              const historyKey = `gemini-voice-app-history-${currentUser.email}`;
              localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
          } catch (error) {
              console.error("Failed to save history:", error);
          }
          return updatedHistory;
      });
  }, [currentUser, transcripts, viewingConversationId]);


  const handleToggleMute = useCallback(() => {
    if (!mediaStreamRef.current) return;

    const newMutedState = !isMuted;
    mediaStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !newMutedState;
    });
    setIsMuted(newMutedState);
  }, [isMuted]);

  const handleStartVoiceConversation = useCallback(async () => {
    if (!currentUser) return;

    if (voiceConnectionState !== 'idle') {
      saveConversation('voice');
      stopConversation();
      return;
    }

    setError(null);
    setVoiceConnectionState('connecting');
    setTranscripts([]);
    setViewingConversationId(null);
    setIsMuted(false);
    
    try {
      setVoiceConnectionMessage('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      setVoiceConnectionMessage('Initializing audio...');
      const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      if (inputAudioContext.state === 'suspended') {
        await inputAudioContext.resume();
      }
      audioContextRef.current = inputAudioContext;
      
      const contextOptions: any = { sampleRate: 24000 };
      if (selectedAudioOutput && selectedAudioOutput !== 'default') {
          contextOptions.sinkId = selectedAudioOutput;
      }

      const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)(contextOptions);
      if (outputAudioContext.state === 'suspended') {
        await outputAudioContext.resume();
      }
      outputAudioContextRef.current = outputAudioContext;
      const outputNode = outputAudioContext.createGain();
      outputNode.connect(outputAudioContext.destination);

      const systemInstruction = `You are a friendly and helpful AI assistant. The user is speaking ${LANGUAGES.find(l => l.code === inputLanguage)?.name}. Please respond in ${LANGUAGES.find(l => l.code === outputLanguage)?.name}.`;

      setVoiceConnectionMessage('Connecting to Gemini...');
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
          },
        },
        callbacks: {
          onopen: () => {
            setVoiceConnectionState('live');
            setLiveStatusText('Ready');

            const source = inputAudioContext.createMediaStreamSource(stream);
            const scriptProcessor = inputAudioContext.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
              const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then((session) => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            source.connect(scriptProcessor);
            scriptProcessor.connect(inputAudioContext.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            let userPartial = '';
            let modelPartial = '';

            if (message.serverContent?.outputTranscription) {
                modelPartial = message.serverContent.outputTranscription.text;
                currentOutputRef.current += modelPartial;
                setLiveStatusText('Gemini is speaking...');
            } else if (message.serverContent?.inputTranscription) {
                userPartial = message.serverContent.inputTranscription.text;
                currentInputRef.current += userPartial;
                setLiveStatusText('Listening...');
            }

            setTranscripts(prev => {
                const newTranscripts = [...prev];
                if (userPartial && currentInputRef.current) {
                    const last = newTranscripts[newTranscripts.length - 1];
                    if (last && last.speaker === 'user') {
                        last.text = currentInputRef.current;
                        last.isPartial = true;
                    } else {
                        newTranscripts.push({ speaker: 'user', text: currentInputRef.current, isPartial: true });
                    }
                }
                if (modelPartial && currentOutputRef.current) {
                    const last = newTranscripts[newTranscripts.length - 1];
                    if (last && last.speaker === 'model') {
                        last.text = currentOutputRef.current;
                        last.isPartial = true;
                    } else {
                        newTranscripts.push({ speaker: 'model', text: currentOutputRef.current, isPartial: true });
                    }
                }
                return newTranscripts;
            });

            if (message.serverContent?.turnComplete) {
                setTranscripts(prev => {
                    return prev.map(t => ({...t, isPartial: false}));
                });
                currentInputRef.current = '';
                currentOutputRef.current = '';
                setLiveStatusText('Ready');
            }

            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio) {
              const decodedAudio = decode(base64Audio);
              const audioBuffer = await decodeAudioData(decodedAudio, outputAudioContext, 24000, 1);
              const source = outputAudioContext.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(outputNode);

              source.addEventListener('ended', () => {
                audioPlaybackSources.current.delete(source);
              });

              const currentTime = outputAudioContext.currentTime;
              const startTime = Math.max(currentTime, nextStartTimeRef.current);
              source.start(startTime);
              nextStartTimeRef.current = startTime + audioBuffer.duration;
              audioPlaybackSources.current.add(source);
            }
            
            if (message.serverContent?.interrupted) {
                for (const source of audioPlaybackSources.current.values()) {
                    source.stop();
                }
                audioPlaybackSources.current.clear();
                nextStartTimeRef.current = 0;
            }
          },
          onerror: (e: ErrorEvent) => {
            console.error('API Error:', e);
            setError(`Connection error: ${e.message}`);
            stopConversation();
          },
          onclose: () => {
            console.log('Connection closed.');
            stopConversation();
          },
        },
      });

      sessionRef.current = await sessionPromise;
      
    } catch (err) {
      console.error('Failed to start conversation:', err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      if (errorMessage.includes('Permission denied')) {
          setError('Microphone permission denied. Please allow microphone access in your browser settings.');
      } else {
          setError(`Could not start audio source. Please ensure your microphone is connected and configured correctly. Error: ${errorMessage}`);
      }
      setVoiceConnectionState('idle');
    }
  }, [voiceConnectionState, stopConversation, selectedAudioOutput, inputLanguage, outputLanguage, saveConversation, currentUser]);

  const handleSendTextMessage = async () => {
      const text = textInput.trim();
      if (!text || isThinking || !currentUser) return;

      setError(null);
      setIsThinking(true);
      setTextInput('');
      setTranscripts(prev => [...prev, { speaker: 'user', text, isPartial: false }]);

      try {
        if (!chatRef.current) {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const history = transcripts.map(t => ({
                role: t.speaker,
                parts: [{ text: t.text }]
            })).filter(t => t.role === 'user' || t.role === 'model');

            chatRef.current = ai.chats.create({
              model: 'gemini-2.5-flash',
              history: history
            });
        }
        
        const response = await chatRef.current.sendMessage({ message: text });
        
        setTranscripts(prev => [...prev, { speaker: 'model', text: response.text, isPartial: false }]);
      } catch (err) {
        console.error("Failed to send message:", err);
        const message = err instanceof Error ? err.message : 'An unknown error occurred.';
        setError(`Failed to get response: ${message}`);
        setTranscripts(prev => prev.slice(0, -1)); // Remove the user message that failed
      } finally {
        setIsThinking(false);
      }
  };


  const handleViewConversation = (conv: Conversation) => {
    if (voiceConnectionState !== 'idle') return;
    setMode(conv.mode);
    setTranscripts(conv.transcripts);
    setViewingConversationId(conv.id);
    setIsHistoryPanelOpen(false);
    chatRef.current = null; // Reset chat session when loading history
  };

  const handleDeleteConversation = (e: React.MouseEvent, idToDelete: string) => {
    e.stopPropagation();
    if (!currentUser) return;
    
    setHistory(prev => {
        const updatedHistory = prev.filter(conv => conv.id !== idToDelete);
        const historyKey = `gemini-voice-app-history-${currentUser.email}`;
        localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
        return updatedHistory;
    });

    if (viewingConversationId === idToDelete) {
        setTranscripts([]);
        setViewingConversationId(null);
        chatRef.current = null;
    }
  };
  
  const handleNewTextChat = () => {
    saveConversation('text');
    setTranscripts([]);
    setViewingConversationId(null);
    chatRef.current = null;
    setError(null);
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(user));
    setAppState('post_login_loading');
  };

  const handleLogout = () => {
    stopConversation();
    setCurrentUser(null);
    setTranscripts([]);
    setViewingConversationId(null);
    localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    setAppState('auth');
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConversation();
    };
  }, [stopConversation]);
  
  const handleModeChange = (newMode: 'voice' | 'text') => {
      if (voiceConnectionState !== 'idle' || isThinking) return;
      if (mode === newMode) return;
      
      saveConversation(mode);
      setMode(newMode);
      setTranscripts([]);
      setViewingConversationId(null);
      setError(null);
      chatRef.current = null;
  };

  if (appState === 'initial_loading') {
    return <LoadingScreen message="Initializing..." />;
  }

  if (appState === 'post_login_loading') {
    return <LoadingScreen message="Welcome back!" />;
  }

  if (appState === 'auth' || !currentUser) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col font-sans relative">
      {/* History Panel Overlay */}
      {isHistoryPanelOpen && (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 z-10 transition-opacity duration-300" 
            onClick={() => setIsHistoryPanelOpen(false)}
            aria-hidden="true"
        ></div>
      )}
      {/* History Panel */}
      <aside className={`fixed top-0 left-0 h-full w-full max-w-sm bg-gray-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-20 flex flex-col ${isHistoryPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800">
            <h2 className="text-xl font-bold text-white">Conversation History</h2>
            <button onClick={() => setIsHistoryPanelOpen(false)} className="p-2 rounded-full hover:bg-gray-700 transition-colors" aria-label="Close history panel">
                <IconClose className="w-5 h-5"/>
            </button>
        </div>
        <div className="overflow-y-auto flex-1">
            {history.length === 0 ? (
                <p className="text-gray-500 text-center p-6">No past conversations saved.</p>
            ) : (
                <ul>
                    {history.map(conv => (
                        <li key={conv.id} className="border-b border-gray-700 last:border-b-0">
                            <div className="p-4 hover:bg-gray-700/50 cursor-pointer flex justify-between items-start gap-3 transition-colors" onClick={() => handleViewConversation(conv)}>
                                <div className="flex items-center gap-3 flex-1 overflow-hidden">
                                   {conv.mode === 'voice' ? <IconMicrophone className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <IconChatBubble className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                                    <div className="flex-1 overflow-hidden">
                                        <p className="font-semibold text-white truncate">{conv.title}</p>
                                        <p className="text-xs text-gray-400 mt-1">{new Date(conv.timestamp).toLocaleString()}</p>
                                    </div>
                                </div>
                                <button onClick={(e) => handleDeleteConversation(e, conv.id)} className="p-2 text-gray-500 hover:text-red-400 rounded-full hover:bg-gray-600/70 transition-colors" aria-label={`Delete conversation: ${conv.title}`}>
                                    <IconTrash className="w-5 h-5" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
      </aside>
      
      <header className="p-4 border-b border-gray-700 shadow-md flex items-center relative justify-between">
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsHistoryPanelOpen(true)} 
                className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                aria-label="View conversation history"
            >
                <IconHistory className="w-6 h-6" />
            </button>
            {mode === 'text' && (
                <button 
                    onClick={handleNewTextChat} 
                    className="p-2 rounded-full hover:bg-gray-700 transition-colors"
                    aria-label="Start new text chat"
                >
                    <IconNewChat className="w-6 h-6" />
                </button>
            )}
        </div>
        <div className="text-center">
            <h1 className="text-2xl font-bold text-blue-400">Gemini Conversational Voice App</h1>
            <p className="text-center text-gray-400 text-sm mt-1">Logged in as: {currentUser.email}</p>
        </div>
        <button
            onClick={handleLogout}
            className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            aria-label="Logout"
        >
            <IconLogout className="w-6 h-6" />
        </button>
      </header>
      
      <main className="flex-1 flex flex-col p-4 overflow-y-auto">
        <div className="flex-1 space-y-4">
            {transcripts.length === 0 && voiceConnectionState !== 'connecting' && (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    {mode === 'voice' ? <IconMicrophone className="w-16 h-16 mb-4"/> : <IconChatBubble className="w-16 h-16 mb-4"/>}
                    <p className="text-lg">
                        {mode === 'voice' ? 'Click the button below to start a conversation.' : 'Type a message below to start a chat.'}
                    </p>
                </div>
            )}
            {transcripts.map((msg, index) => <MessageBubble key={index} message={msg} />)}
            {isThinking && (
                 <div className="flex justify-start mb-4">
                    <div className="max-w-prose px-5 py-3 rounded-2xl bg-gray-700 rounded-bl-none">
                        <div className="flex items-center justify-center">
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse [animation-delay:-0.15s] mx-1.5"></div>
                           <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        </div>
                    </div>
                </div>
            )}
            <div ref={transcriptEndRef} />
        </div>

        {error && (
            <div className="mt-4 p-3 bg-red-800 border border-red-600 rounded-lg text-center">
                <p className="font-semibold">Error</p>
                <p className="text-sm">{error}</p>
            </div>
        )}
      </main>
      
      <footer className="p-4 sticky bottom-0 bg-gray-900 border-t border-gray-700 flex flex-col justify-center items-center gap-4">
        <p className="text-gray-400 text-sm h-5 transition-opacity duration-300">
            {voiceConnectionState === 'live' ? liveStatusText : ' '}
        </p>
        {/* Mode Toggle */}
        <div className="p-1 bg-gray-800 rounded-full flex items-center">
            <button onClick={() => handleModeChange('voice')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${mode === 'voice' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Voice</button>
            <button onClick={() => handleModeChange('text')} className={`px-4 py-1.5 text-sm font-semibold rounded-full transition-colors ${mode === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'}`}>Text</button>
        </div>
        
        {mode === 'voice' ? (
            <div className="flex justify-center items-center gap-6 w-full">
                <div className="flex items-center gap-4">
                  {voiceConnectionState === 'live' && (
                      <button
                          onClick={handleToggleMute}
                          className={`p-4 rounded-full text-lg font-semibold flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 ${isMuted ? 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400' : 'bg-gray-600 hover:bg-gray-700 focus:ring-gray-500'}`}
                          aria-label={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                      >
                          {isMuted ? <IconMicrophoneMute className="w-6 h-6" /> : <IconMicrophone className="w-6 h-6" />}
                      </button>
                  )}
                  <button
                      onClick={handleStartVoiceConversation}
                      disabled={voiceConnectionState === 'connecting'}
                      className={`px-8 py-4 rounded-full text-lg font-semibold flex items-center justify-center transition-all duration-300 ease-in-out shadow-lg focus:outline-none focus:ring-4 min-w-[280px] ${voiceConnectionState === 'live' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'} ${voiceConnectionState === 'connecting' ? 'bg-gray-500 cursor-not-allowed' : ''}`}
                  >
                    {voiceConnectionState === 'connecting' ? (
                      <><IconLoader className="w-6 h-6 mr-3" />{voiceConnectionMessage}</>
                    ) : voiceConnectionState === 'live' ? (
                      <><IconStop className="w-6 h-6 mr-3" />Stop Conversation</>
                    ) : (
                      <><IconMicrophone className="w-6 h-6 mr-3" />Start Conversation</>
                    )}
                  </button>
                </div>
            </div>
        ) : (
             <div className="w-full max-w-3xl">
                <form 
                    className="flex items-center gap-2"
                    onSubmit={(e) => { e.preventDefault(); handleSendTextMessage(); }}
                >
                    <input 
                        type="text"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                        placeholder="Type your message..."
                        disabled={isThinking}
                        className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    />
                    <button 
                        type="submit"
                        disabled={isThinking || !textInput.trim()}
                        className="p-3 bg-blue-600 rounded-full text-white hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-blue-500 transition-colors"
                        aria-label="Send message"
                    >
                        {isThinking ? <IconLoader className="w-6 h-6" /> : <IconSend className="w-6 h-6" />}
                    </button>
                </form>
            </div>
        )}
      </footer>
    </div>
  );
}
