import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Image as ImageIcon, Loader2, ShieldCheck, HelpCircle, ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  text: string;
  type: 'user' | 'bot';
  image?: string;
  parsedImageResult?: {
    agentNote: string;
    recommendedAction: string;
    rawResponse: string;
  };
  error?: boolean;
}

export const SupportChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      text: 'Hello! I am your FoodFix Policy & Quality Assistant. Ask me anything about our policies, or upload an image if your food was damaged or poor quality for an automated refund review pre-check.',
      type: 'bot'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isLoading, isOpen]);

  const apiCall = async (messageText: string, imageBase64?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/support-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageText,
          history: messages
            .filter(m => !m.error)
            .map(m => ({
              text: m.text,
              type: m.type
            })),
          image: imageBase64
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      setMessages(prev => [
        ...prev,
        {
          text: data.text,
          type: 'bot',
          parsedImageResult: data.parsedImageResult
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          text: `Sorry, we couldn't process your request: ${err.message || "Unknown error occurred"}. Please make sure your server is running and GEMINI_API_KEY is configured under Settings > Secrets.`,
          type: 'bot',
          error: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    const userMsgText = input;
    setMessages(prev => [...prev, { text: userMsgText, type: 'user' }]);
    setInput('');
    apiCall(userMsgText);
  };

  const handleImageFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageBase64 = event.target?.result as string;
      
      // Add the user message with the image to the thread
      setMessages(prev => [
        ...prev,
        {
          text: 'Attached food photo for quality review.',
          type: 'user',
          image: imageBase64
        }
      ]);
      
      // Query the API with the image payload
      apiCall('Attached food photo for quality review.', imageBase64);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFile(e.target.files[0]);
    }
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // Pre-set questions for convenient testing
  const quickQuestions = [
    { label: "Refund policy?", text: "What is your refund policy?" },
    { label: "Wrong Item?", text: "I received the wrong item, can I get a refund?" },
    { label: "Can I cancel?", text: "Can I cancel my active food order?" },
    { label: "Delay Compensation", text: "What happens if my order is delayed?" }
  ];

  const handleQuickQuestion = (qnText: string) => {
    if (isLoading) return;
    setMessages(prev => [...prev, { text: qnText, type: 'user' }]);
    apiCall(qnText);
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button 
            id="chat-toggle-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 bg-orange-500 hover:bg-orange-600 text-white p-5 rounded-full shadow-2xl flex items-center gap-3 transition-all duration-300 z-50 cursor-pointer active:scale-95 group border-2 border-white"
          >
            <div className="relative">
              <MessageSquare size={24} className="group-hover:rotate-6 transition-transform" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400"></span>
              </span>
            </div>
            <span className="font-semibold text-sm">Policy & Quality Support</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            id="support-chat-panel"
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed bottom-6 right-6 w-96 sm:w-104 h-[580px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex justify-between items-center text-white">
              <div className="flex items-center gap-2.5">
                <div className="h-2.5 w-2.5 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm tracking-tight text-white">FoodFix Support Agent</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Policy and QA Assistant • Powered by Gemini 3.5</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 transition text-slate-400 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            {/* Messages body / drag area */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`flex-grow p-4 overflow-y-auto space-y-4 bg-slate-50 relative ${dragActive ? 'bg-orange-50 border-2 border-dashed border-orange-400 m-2 rounded-2xl' : ''}`}
            >
              {dragActive && (
                <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center pointer-events-none z-10 rounded-2xl">
                  <ImageIcon size={48} className="text-orange-500 animate-bounce mb-2" />
                  <p className="text-sm font-semibold text-orange-600">Drop your food photo here</p>
                  <p className="text-xs text-slate-500 mt-1">Accepts PNG, JPG, JPEG</p>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className="flex flex-col space-y-1">
                  <div 
                    className={`p-3.5 rounded-2xl text-[13px] leading-relaxed max-w-[85%] ${
                      m.type === 'user' 
                        ? 'bg-orange-500 text-white self-end ml-auto rounded-tr-none shadow-md' 
                        : m.error 
                          ? 'bg-red-50 border border-red-100 text-red-800 self-start shadow-sm rounded-tl-none font-medium'
                          : 'bg-white border border-slate-100 text-slate-700 self-start shadow-sm rounded-tl-none'
                    }`}
                  >
                    {m.text}
                    {m.image && (
                      <div className="mt-2.5 rounded-xl overflow-hidden border border-orange-200/50 bg-slate-100 p-1">
                        <img src={m.image} alt="Uploaded food sample" className="max-h-48 object-cover mx-auto rounded-lg" />
                      </div>
                    )}
                  </div>

                  {/* AI Inspection Result Widget */}
                  {m.parsedImageResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="self-start w-[85%] mt-1 ml-2 bg-slate-900 text-slate-100 border border-slate-800 p-4 rounded-xl shadow-lg space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                          <ShieldCheck size={12} className="text-emerald-400" />
                          AI Inspection Note
                        </span>
                        
                        {/* Recommendation Badge */}
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                          m.parsedImageResult.recommendedAction.toLowerCase().includes('refund')
                            ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                            : m.parsedImageResult.recommendedAction.toLowerCase().includes('human')
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : 'bg-slate-700 text-slate-300'
                        }`}>
                          {m.parsedImageResult.recommendedAction || "Under Review"}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <h4 className="text-[11px] font-bold text-slate-300">Staff Recommendation Summary:</h4>
                        <p className="text-xs text-slate-400 italic leading-relaxed">
                          "{m.parsedImageResult.agentNote}"
                        </p>
                      </div>

                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>Subject: Quality Check</span>
                        <span className="text-orange-400 flex items-center gap-0.5">
                          Awaiting action <ArrowUpRight size={10} />
                        </span>
                      </div>
                    </motion.div>
                  )}
                </div>
              ))}

              {/* Bot typing loading block */}
              {isLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs py-1 animate-pulse">
                  <Loader2 size={16} className="animate-spin text-orange-500" />
                  <span>AI Agent is checking policy and photos...</span>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Policy Questions Area */}
            {!isLoading && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap gap-1.5 justify-center">
                <span className="text-[10px] text-slate-400 font-semibold w-full text-center mb-1 flex items-center justify-center gap-1">
                  <HelpCircle size={10} />
                  Choose a common quick question:
                </span>
                {quickQuestions.map((qq, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickQuestion(qq.text)}
                    className="text-[11px] text-slate-600 bg-white border border-slate-200 py-1 px-2.5 rounded-lg hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50/20 transition cursor-pointer font-medium"
                  >
                    {qq.label}
                  </button>
                ))}
              </div>
            )}
            
            {/* Box input controls */}
            <div className="p-4 border-t border-slate-100 flex flex-col gap-2 bg-white">
              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  accept="image/*"
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload} 
                />
                <button 
                  type="button"
                  title="Upload Food Image"
                  disabled={isLoading}
                  className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-orange-500 hover:bg-orange-50/40 hover:border-orange-200 transition duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon size={19} />
                </button>
                
                <input 
                  value={input} 
                  disabled={isLoading}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask a question or drop a quality photo..." 
                  className="flex-grow text-xs border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 bg-slate-50 focus:bg-white transition duration-200 disabled:opacity-60"
                />
                
                <button 
                  onClick={handleSend} 
                  disabled={!input.trim() || isLoading}
                  className="p-2.5 bg-orange-500 text-white rounded-xl hover:bg-orange-600 active:scale-95 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send size={19} />
                </button>
              </div>

              <div className="text-center text-[9px] text-slate-400">
                You can drag & drop food quality photos directly into the active chat window.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
