import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store/AppProvider';
import { Bot, User, Send, CornerDownLeft } from 'lucide-react';
import { cn } from '../lib/utils';
import ReactMarkdown from 'react-markdown';
import ErrorBoundary from '../components/ErrorBoundary'; // Import the ErrorBoundary

export function Chat() {
  const { chatWithAI } = useAppStore();
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'assistant', content: string }[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSendMessage = async () => {
    if (!userInput.trim()) return;

    const userMsg = userInput;
    setUserInput('');
    setIsLoading(true);
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);

    // Add a placeholder for the assistant's response
    const assistantMessageIndex = chatHistory.length + 1; // Index for the new assistant message
    setChatHistory(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      await chatWithAI(userMsg, (contentChunk) => {
        setChatHistory(prev => {
          const newHistory = [...prev];
          // Update the last assistant message with the streamed content
          newHistory[assistantMessageIndex] = { ...newHistory[assistantMessageIndex], content: contentChunk };
          return newHistory;
        });
      });
    } catch (e) {
      setChatHistory(prev => {
        const newHistory = [...prev];
        newHistory[assistantMessageIndex] = { role: 'assistant', content: "Sorry, I encountered an error. Please try again." };
        return newHistory;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 h-full bg-slate-50 rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-200 shrink-0 bg-white">
        <h2 className="text-lg font-bold text-slate-900">AI Assistant</h2>
        <p className="text-sm text-slate-500">Your personal guide to academic success. Ask me anything!</p>
      </div>

      <div ref={chatContainerRef} className="flex-1 p-4 space-y-6 overflow-y-auto">
        {chatHistory.length === 0 && (
          <div className="text-center text-slate-400 pt-16">
            <Bot className="w-12 h-12 mx-auto mb-2" />
            <p className="font-medium">Ask me about your tasks, courses, or for study advice.</p>
          </div>
        )}
        {/* Wrap chat history mapping with ErrorBoundary */}
        <ErrorBoundary fallback={<div className="p-4 text-red-600">Error rendering chat message.</div>}>
          {chatHistory.map((chat, i) => (
            <div key={i} className={cn("flex items-start gap-3", chat.role === 'user' ? "justify-end" : "justify-start")}>
              {chat.role === 'assistant' && <Bot className="w-6 h-6 text-indigo-500 shrink-0 mt-1" />}
              <div className={cn(
                "p-3 rounded-2xl max-w-[85%] md:max-w-lg",
                chat.role === 'user' 
                  ? "bg-white text-slate-800 border border-slate-100 rounded-br-none shadow-sm" // User bubble: white background, dark text
                  : "bg-indigo-600 text-white rounded-bl-none" // Assistant bubble: indigo background, white text
              )}>
                {/* Apply className to a wrapping div instead of directly to ReactMarkdown */}
                <div 
                  className="prose prose-sm prose-p:my-0 prose-p:leading-relaxed break-words"
                  onError={(e) => console.error("ReactMarkdown rendering error:", e, "Content:", chat.content)} // Add onError handler
                >
                  <ReactMarkdown>
                    {chat.content}
                  </ReactMarkdown>
                </div>
              </div>
              {chat.role === 'user' && <User className="w-6 h-6 text-indigo-500 shrink-0 mt-1" />}
            </div>
          ))}
        </ErrorBoundary>
        {isLoading && (
          <div className="flex items-start gap-3 justify-start">
            <Bot className="w-6 h-6 text-indigo-500 shrink-0 mt-1" />
            <div className="p-3 rounded-2xl bg-white border border-slate-100 rounded-bl-none shadow-sm">
              <div className="flex items-center gap-2 h-5">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-0"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-200"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse delay-400"></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-200 bg-white shrink-0 mt-auto z-10">
        <div className="relative flex items-end">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="e.g., What should I focus on today?"
            className="w-full p-3 pr-14 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow resize-none bg-slate-50 min-h-[50px] max-h-32"
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !userInput.trim()}
            className="absolute right-2 bottom-2 bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 transition-colors shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}