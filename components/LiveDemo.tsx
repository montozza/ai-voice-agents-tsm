import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { AGENTS } from '../constants';
import { ConnectionState, AgentPersona } from '../types';
import { createAudioBlob, decodeAudioData, base64ToUint8Array } from '../services/audio-utils';
import AudioVisualizer from './AudioVisualizer';

// Icons
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
);
const PhoneOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"></path><line x1="23" y1="1" x2="1" y2="23"></line></svg>
);

const LiveDemo: React.FC = () => {
  const [activeAgent, setActiveAgent] = useState<AgentPersona>(AGENTS[0]);
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  const [volume, setVolume] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio Context Refs
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  // Live API Refs
  const sessionRef = useRef<any>(null); // Type is loosely defined in SDK for the promise resolution
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  // Cleanup function
  const stopSession = async () => {
    // 1. Close connection
    if (sessionRef.current) {
      // session.close() isn't strictly documented as synchronous, but we just drop the reference usually.
      // However, per docs, we rely on callbacks.
      sessionRef.current = null;
    }

    // 2. Stop Microphone
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // 3. Stop Audio Contexts
    if (inputAudioContextRef.current) {
      await inputAudioContextRef.current.close();
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      await outputAudioContextRef.current.close();
      outputAudioContextRef.current = null;
    }
    
    // 4. Stop Processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    // 5. Stop Playing Audio
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;

    setConnectionState(ConnectionState.DISCONNECTED);
    setVolume(0);
  };

  const startSession = async () => {
    if (!process.env.API_KEY) {
      setErrorMsg("API Key not found in environment variables.");
      return;
    }

    try {
      setConnectionState(ConnectionState.CONNECTING);
      setErrorMsg(null);

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      // Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const connectPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: activeAgent.systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: activeAgent.id === 'intake' ? 'Kore' : 'Fenrir' } }
          }
        },
        callbacks: {
          onopen: async () => {
            setConnectionState(ConnectionState.CONNECTED);
            
            // Setup Input Processing
            if (!inputAudioContextRef.current) return;
            
            sourceRef.current = inputAudioContextRef.current.createMediaStreamSource(stream);
            processorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processorRef.current.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              // Simple volume meter logic
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              const rms = Math.sqrt(sum / inputData.length);
              setVolume(Math.min(rms * 5, 1)); // Amplify for visual

              const blob = createAudioBlob(inputData);
              
              // Send to Gemini
              connectPromise.then((session) => {
                 session.sendRealtimeInput({ media: blob });
              });
            };

            sourceRef.current.connect(processorRef.current);
            processorRef.current.connect(inputAudioContextRef.current.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
             // Handle interruptions
             if (message.serverContent?.interrupted) {
                audioSourcesRef.current.forEach(source => source.stop());
                audioSourcesRef.current.clear();
                nextStartTimeRef.current = 0;
                return;
             }

             // Handle Audio Output
             const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (base64Audio && outputAudioContextRef.current) {
                const ctx = outputAudioContextRef.current;
                const audioData = base64ToUint8Array(base64Audio);
                const buffer = await decodeAudioData(audioData, ctx);
                
                const source = ctx.createBufferSource();
                source.buffer = buffer;
                
                const gainNode = ctx.createGain();
                gainNode.gain.value = 1.0; // Adjust volume if needed
                source.connect(gainNode);
                gainNode.connect(ctx.destination);

                // Queue playback
                const now = ctx.currentTime;
                // If nextStartTime is in the past, reset to now
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, now);
                
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;

                audioSourcesRef.current.add(source);
                source.onended = () => {
                  audioSourcesRef.current.delete(source);
                };
             }
          },
          onclose: () => {
            console.log("Connection closed");
            setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
            console.error("Connection error:", err);
            setConnectionState(ConnectionState.ERROR);
            setErrorMsg("Connection lost. Please try again.");
            stopSession();
          }
        }
      });

      sessionRef.current = connectPromise;

    } catch (e) {
      console.error(e);
      setConnectionState(ConnectionState.ERROR);
      setErrorMsg("Failed to access microphone or connect.");
      stopSession();
    }
  };

  const handleToggleCall = () => {
    if (connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) {
      stopSession();
    } else {
      startSession();
    }
  };

  const handleAgentSelect = (agent: AgentPersona) => {
    if (connectionState === ConnectionState.CONNECTED) {
      // If connected, we must disconnect first to switch persona system prompts
      stopSession();
    }
    setActiveAgent(agent);
  };

  return (
    <div className="w-full max-w-5xl mx-auto p-4 md:p-8">
      
      {/* Agent Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {AGENTS.map((agent) => (
          <div 
            key={agent.id}
            onClick={() => handleAgentSelect(agent)}
            className={`cursor-pointer rounded-xl border-2 p-6 transition-all duration-300 relative overflow-hidden group
              ${activeAgent.id === agent.id 
                ? 'border-brand-gold bg-white shadow-lg scale-[1.02]' 
                : 'border-slate-200 bg-slate-50 hover:border-slate-300'
              }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className={`text-xl font-bold font-serif ${activeAgent.id === agent.id ? 'text-brand-navy' : 'text-slate-600'}`}>
                  {agent.role}
                </h3>
                <p className="text-sm font-medium text-brand-gold mt-1">{agent.name}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg ${agent.color}`}>
                {agent.name[0]}
              </div>
            </div>
            
            <p className="text-slate-600 text-sm mb-4 leading-relaxed">
              {agent.description}
            </p>

            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map(cap => (
                <span key={cap} className="px-2 py-1 bg-slate-100 text-xs font-semibold text-slate-600 rounded">
                  {cap}
                </span>
              ))}
            </div>

            {/* Selection Indicator */}
            {activeAgent.id === agent.id && (
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-gold"></div>
            )}
          </div>
        ))}
      </div>

      {/* Main Interaction Area */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden flex flex-col md:flex-row min-h-[400px]">
        
        {/* Left: Avatar & Visuals */}
        <div className="w-full md:w-1/2 bg-slate-900 p-8 flex flex-col items-center justify-center relative">
          <div className="absolute top-4 left-4 text-slate-400 text-xs font-mono">
            STATUS: <span className={`${connectionState === ConnectionState.CONNECTED ? 'text-green-400' : 'text-slate-500'}`}>{connectionState}</span>
          </div>

          <div className="mb-8 relative">
            <div className={`w-32 h-32 rounded-full flex items-center justify-center text-5xl font-serif text-white shadow-2xl z-10 relative ${activeAgent.color}`}>
              {activeAgent.name[0]}
            </div>
            {/* Pulsing ring when connected */}
            {connectionState === ConnectionState.CONNECTED && (
               <div className={`absolute top-0 left-0 w-full h-full rounded-full ${activeAgent.color} animate-ping opacity-20`}></div>
            )}
          </div>

          <div className="h-20 w-full flex items-center justify-center">
             <AudioVisualizer 
                isActive={connectionState === ConnectionState.CONNECTED} 
                volume={volume} 
                color={activeAgent.color}
             />
          </div>

          <p className="text-slate-400 mt-4 text-center font-serif italic">
            "{activeAgent.role}" Mode Active
          </p>
        </div>

        {/* Right: Controls & Context */}
        <div className="w-full md:w-1/2 p-8 flex flex-col justify-between bg-slate-50">
           <div>
             <h2 className="text-2xl font-serif font-bold text-brand-navy mb-2">Live Demonstration</h2>
             <p className="text-slate-600 mb-6">
               Click the button below to initiate a voice call with our AI. Speak naturally.
             </p>

             <div className="bg-white p-4 rounded-lg border border-slate-200 mb-6">
               <h4 className="text-sm font-bold text-brand-navy mb-2 uppercase tracking-wide">Try asking:</h4>
               <ul className="text-sm text-slate-600 space-y-2 list-disc list-inside">
                 {activeAgent.id === 'intake' ? (
                   <>
                     <li>"I was in a car accident yesterday."</li>
                     <li>"How do I schedule an appointment?"</li>
                     <li>"Does it cost money to talk to a lawyer?"</li>
                   </>
                 ) : (
                   <>
                     <li>"I slipped on a wet floor at a grocery store."</li>
                     <li>"The other driver ran a red light."</li>
                     <li>"What is a statute of limitations?"</li>
                   </>
                 )}
               </ul>
             </div>
           </div>

           <div>
             {errorMsg && (
               <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded border border-red-200">
                 {errorMsg}
               </div>
             )}

             <button
               onClick={handleToggleCall}
               disabled={connectionState === ConnectionState.CONNECTING}
               className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-md
                 ${connectionState === ConnectionState.CONNECTED
                   ? 'bg-red-500 hover:bg-red-600 text-white'
                   : 'bg-brand-navy hover:bg-slate-800 text-white'
                 }
                 ${connectionState === ConnectionState.CONNECTING ? 'opacity-70 cursor-not-allowed' : ''}
               `}
             >
               {connectionState === ConnectionState.CONNECTED ? (
                 <>
                   <PhoneOffIcon /> End Consultation
                 </>
               ) : (
                 <>
                   <MicIcon /> Start Voice Call
                 </>
               )}
             </button>
             <p className="text-xs text-center text-slate-400 mt-3">
               Powered by Trendspot Media • Gemini Live API
             </p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default LiveDemo;
