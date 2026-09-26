'use client';

import React, { useState } from 'react';
import { Send, Bot, User, Check, X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  detectedData?: {
    mrp?: number | null;
    ptr?: number | null;
    expiry?: string | null;
    productName?: string;
  };
  applied?: boolean;
  cancelled?: boolean;
}

interface ProductChatAssistantProps {
  productId: string;
  currentProduct: {
    productName: string;
    mrp?: number | null;
    ptr?: number | null;
    expiry?: string | null;
  };
  onProductUpdated?: (updatedProduct: any) => void;
  onClose?: () => void;
}

export function ProductChatAssistant({
  productId,
  currentProduct,
  onProductUpdated,
  onClose,
}: ProductChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your Product Data Assistant for "${currentProduct.productName}". You can type corrections naturally or in shorthand like:\n\n• MRP 85 PTR 13.50 Expiry 12/2026\n• 85, 13.50, 12/26\n• Change PTR to 14.50`,
    },
  ]);
  const [input, setInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const handleSend = async (textToSend?: string) => {
    const messageText = (textToSend || input).trim();
    if (!messageText || isParsing) return;

    const userMsgId = String(Date.now());
    const newMessages: ChatMessage[] = [
      ...messages,
      { id: userMsgId, sender: 'user', text: messageText },
    ];
    setMessages(newMessages);
    setInput('');
    setIsParsing(true);

    try {
      const res = await fetch('/api/chat/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageText,
          productId,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to parse');

      const result = data.result;

      if (result.action === 'update' && (result.mrp !== undefined || result.ptr !== undefined || result.expiry !== undefined)) {
        const assistantMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: result.explanation || 'I detected the following updates:',
          detectedData: {
            mrp: result.mrp,
            ptr: result.ptr,
            expiry: result.expiry,
            productName: result.productName,
          },
        };
        setMessages([...newMessages, assistantMsg]);
      } else {
        const assistantMsg: ChatMessage = {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: result.explanation || 'I could not recognize any specific MRP, PTR, or Expiry updates. Please try typing e.g. "MRP 85 PTR 13.50 Expiry 12/2026".',
        };
        setMessages([...newMessages, assistantMsg]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: `Error processing message: ${err.message}`,
        },
      ]);
    } finally {
      setIsParsing(false);
    }
  };

  const handleApply = async (msg: ChatMessage) => {
    if (!msg.detectedData) return;

    try {
      const res = await fetch(`/api/products/${productId}/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...msg.detectedData,
          source: 'CHAT',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update');

      setMessages(prev =>
        prev.map(m => (m.id === msg.id ? { ...m, applied: true } : m))
      );

      if (onProductUpdated) {
        onProductUpdated(data.product);
      }
    } catch (err: any) {
      alert(`Failed to apply changes: ${err.message}`);
    }
  };

  const handleCancel = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => (m.id === msgId ? { ...m, cancelled: true } : m))
    );
  };

  const quickPrompts = [
    'MRP 85 PTR 13.50 Expiry 12/2026',
    'Change PTR to 14.00',
    'MRP is 90',
    'Expiry 12/2027',
  ];

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Sparkles className="w-4 h-4 text-amber-300" />
          </div>
          <div>
            <h3 className="font-semibold text-sm">Product Data Assistant</h3>
            <p className="text-xs text-blue-100 truncate max-w-[200px]">{currentProduct.productName}</p>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/50">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.sender === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white rounded-tr-none'
                : 'bg-white border border-gray-200 text-gray-800 rounded-tl-none'
            }`}>
              <p className="whitespace-pre-wrap">{msg.text}</p>

              {/* Detected Action Card */}
              {msg.detectedData && (
                <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-gray-900">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Detected Values:
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-3">
                    {msg.detectedData.mrp !== undefined && (
                      <div className="p-2 bg-red-50 rounded-lg border border-red-100">
                        <span className="block font-medium text-red-600">MRP</span>
                        <span className="font-bold text-gray-900">
                          {msg.detectedData.mrp !== null ? `₹${msg.detectedData.mrp.toFixed(2)}` : 'None'}
                        </span>
                      </div>
                    )}
                    {msg.detectedData.ptr !== undefined && (
                      <div className="p-2 bg-blue-50 rounded-lg border border-blue-100">
                        <span className="block font-medium text-blue-600">PTR</span>
                        <span className="font-bold text-gray-900">
                          {msg.detectedData.ptr !== null ? `₹${msg.detectedData.ptr.toFixed(2)}` : 'None'}
                        </span>
                      </div>
                    )}
                    {msg.detectedData.expiry !== undefined && (
                      <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                        <span className="block font-medium text-emerald-600">Expiry</span>
                        <span className="font-bold text-gray-900">
                          {msg.detectedData.expiry || 'None'}
                        </span>
                      </div>
                    )}
                  </div>

                  {msg.applied ? (
                    <div className="flex items-center justify-center gap-1.5 py-1 text-xs font-semibold text-emerald-600 bg-emerald-50 rounded-lg border border-emerald-200">
                      <Check className="w-3.5 h-3.5" />
                      Applied to Catalog
                    </div>
                  ) : msg.cancelled ? (
                    <div className="text-center py-1 text-xs text-gray-400">
                      Cancelled
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApply(msg)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition shadow-sm"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Apply
                      </button>
                      <button
                        onClick={() => {
                          setInput(`${msg.detectedData?.mrp ? `MRP ${msg.detectedData.mrp} ` : ''}${msg.detectedData?.ptr ? `PTR ${msg.detectedData.ptr} ` : ''}${msg.detectedData?.expiry ? `Expiry ${msg.detectedData.expiry}` : ''}`);
                        }}
                        className="py-1.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-medium transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCancel(msg.id)}
                        className="py-1.5 px-2 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-lg text-xs transition"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {isParsing && (
          <div className="flex gap-2 items-center text-xs text-gray-500 animate-pulse">
            <Bot className="w-4 h-4 text-indigo-500" />
            <span>Analyzing your update...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 bg-slate-100/70 border-t border-slate-200 flex gap-1.5 overflow-x-auto text-xs no-scrollbar">
        {quickPrompts.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            className="whitespace-nowrap px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-600 text-gray-600 rounded-md border border-gray-200 text-[11px] transition shrink-0"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="p-3 bg-white border-t border-gray-200 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. MRP 85 PTR 13.50 Expiry 12/2026..."
          className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-gray-900"
          disabled={isParsing}
        />
        <button
          type="submit"
          disabled={!input.trim() || isParsing}
          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white rounded-xl transition shadow-sm flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
