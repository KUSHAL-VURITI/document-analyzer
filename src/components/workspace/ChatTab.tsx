"use client";

import ReactMarkdown from 'react-markdown';
import { useDocumentStore } from "@/lib/store";
import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Bot, AlertCircle, MessageCircle } from "lucide-react";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export function ChatTab() {
  const { extractedText } = useDocumentStore();
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const suggestedQuestions = [
    "What is the main topic of this document?",
    "Summarize the key findings.",
    "What are the most important numbers?",
  ];

  const sendQuestion = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          documentText: extractedText,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      const assistantId = crypto.randomUUID();

      // Add empty assistant message that we'll stream into
      setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      let done = false;
      while (!done) {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantId ? { ...m, content: m.content + chunk } : m
            )
          );
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to get a response.");
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, extractedText]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  const preprocessContent = (content: string) => {
    // Replace [Page X] or [Page X, Y] with a custom markdown link we can intercept
    return content.replace(/\[Page\s+([0-9,\s]+)\]/g, ' [Page $1](citation://$1) ');
  };

  const renderMessageContent = (content: string) => (
    <ReactMarkdown
      components={{
        a: ({ node, ...props }) => {
          if (props.href?.startsWith('citation://')) {
            const pages = props.href.replace('citation://', '');
            return (
              <button
                onClick={() => {
                  const event = new CustomEvent("citation-click", { detail: { pages } });
                  window.dispatchEvent(event);
                }}
                className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[11px] font-mono font-medium rounded-md bg-[var(--annotation-soft)] text-[var(--annotation)] hover:bg-[var(--annotation)]/15 transition-all cursor-pointer border border-[var(--annotation)]/20"
                title={`Jump to Page ${pages}`}
              >
                p.{pages}
              </button>
            );
          }
          return <a {...props} className="text-[var(--annotation)] hover:underline" target="_blank" rel="noopener noreferrer" />;
        },
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="mb-1">{children}</li>,
        strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
        code: ({ children }) => <code className="bg-black/10 px-1 py-0.5 rounded text-sm font-mono">{children}</code>
      }}
    >
      {preprocessContent(content)}
    </ReactMarkdown>
  );

  return (
    <div className="flex flex-col h-full min-h-0 w-full">
      {/* Scrollable chat messages / suggested prompts area */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1 pb-2">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full text-center px-2 py-4 space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--annotation-soft)] text-[var(--annotation)] flex items-center justify-center mx-auto">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Ask this document</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[240px] mx-auto leading-relaxed">
                  Ask any question. Answers are grounded in the extracted text with page citations.
                </p>
              </div>
            </div>
            
            {/* Suggested questions */}
            <div className="w-full space-y-2 max-w-sm">
              {suggestedQuestions.map((q, i) => (
                <button
                  key={q}
                  onClick={() => sendQuestion(q)}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="w-full text-left px-3.5 py-2.5 text-xs sm:text-sm bg-card border border-[var(--border)] rounded-xl hover:border-[var(--annotation)]/30 hover:bg-[var(--annotation-soft)]/20 transition-smooth hover-lift text-foreground cascade-item cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3.5 pt-1">
            {messages.map((m) => (
              <div 
                key={m.id} 
                className={`flex gap-2.5 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role !== 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[var(--annotation-soft)] text-[var(--annotation)] flex items-center justify-center shrink-0 mt-0.5 transition-all hover:scale-105">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}
                
                <div 
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed shadow-xs transition-all duration-300 ${
                    m.role === 'user' 
                      ? 'bg-[var(--annotation)] text-[var(--accent-foreground)] rounded-br-xs' 
                      : 'bg-card border border-[var(--border)] text-foreground rounded-bl-xs hover:border-[var(--annotation)]/20'
                  }`}
                >
                  {renderMessageContent(m.content)}
                </div>
              </div>
            ))}
            
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex gap-2.5 text-sm justify-start">
                <div className="w-7 h-7 rounded-lg bg-[var(--annotation-soft)] text-[var(--annotation)] flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-card border border-[var(--border)] rounded-xl rounded-bl-xs px-3.5 py-2.5 flex gap-1.5 items-center">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
            
            {error && (
              <div className="flex gap-2 items-center p-3 text-xs sm:text-sm bg-[var(--caution-soft)] text-[var(--caution)] rounded-xl border border-[var(--caution)]/20">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <p>Couldn't get a response. Please try again.</p>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Pinned Input Form at Bottom */}
      <div className="shrink-0 pt-2 pb-1 bg-background border-t border-[var(--border)]/50">
        <form 
          onSubmit={handleSubmit}
          className="relative flex items-center bg-card border border-[var(--border)] rounded-xl overflow-hidden focus-within:border-[var(--annotation)] transition-colors shadow-xs"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about this document..."
            className="flex-1 bg-transparent px-3.5 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none placeholder:text-muted-foreground"
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            className="m-1 w-8 h-8 flex items-center justify-center bg-[var(--annotation)] text-[var(--accent-foreground)] rounded-lg disabled:opacity-40 hover:bg-[var(--annotation)]/90 active:scale-95 transition-all focus:outline-none cursor-pointer shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
