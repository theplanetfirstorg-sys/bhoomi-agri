import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, Paperclip, X, MessageCircle, Plus, Leaf } from 'lucide-react';
import { advisorApi } from '../api/advisor';
import { ConversationMessage } from '../types';
import ReactMarkdown from 'react-markdown';

// Fallback renderer if react-markdown not installed
function MessageContent({ content }: { content: string }) {
  return (
    <div className="prose prose-sm max-w-none text-inherit">
      {content.split('\n').map((line, i) => (
        <span key={i}>{line}<br /></span>
      ))}
    </div>
  );
}

export default function AdvisorPage() {
  const { conversationId } = useParams<{ conversationId?: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | undefined>(conversationId);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: advisorApi.getConversations,
  });

  const { data: activeConversation } = useQuery({
    queryKey: ['conversation', activeConvId],
    queryFn: () => advisorApi.getConversation(activeConvId!),
    enabled: !!activeConvId,
  });

  const messages: ConversationMessage[] = activeConversation?.messages ?? [];

  const chatMutation = useMutation({
    mutationFn: advisorApi.chat,
    onSuccess: (data) => {
      if (!activeConvId) {
        setActiveConvId(data.conversationId);
        navigate(`/advisor/${data.conversationId}`, { replace: true });
      }
      qc.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      qc.invalidateQueries({ queryKey: ['conversations'] });
      setFiles([]);
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend() {
    const msg = input.trim();
    if (!msg || chatMutation.isPending) return;
    setInput('');
    chatMutation.mutate({
      message: msg,
      conversationId: activeConvId,
      attachments: files.length > 0 ? files : undefined,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function newConversation() {
    setActiveConvId(undefined);
    navigate('/advisor', { replace: true });
  }

  const suggestions = [
    'What should I plant this Yala season?',
    'My tomato leaves are turning yellow — what\'s wrong?',
    'How do I improve my soil pH for capsicum?',
    'What\'s the current price of bitter gourd in Colombo?',
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] md:h-[calc(100vh-48px)] gap-4 -mx-4 md:mx-0">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex w-64 flex-col bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-sm text-gray-900">Conversations</span>
          <button onClick={newConversation} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 min-h-0">
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <p className="px-4 py-6 text-xs text-gray-400 text-center">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { setActiveConvId(conv.id); navigate(`/advisor/${conv.id}`); }}
                className={`w-full text-left px-4 py-3 text-sm border-b border-gray-50 hover:bg-gray-50 transition ${
                  activeConvId === conv.id ? 'bg-leaf-50 text-leaf-700' : 'text-gray-700'
                }`}
              >
                <div className="font-medium truncate">{conv.title ?? 'New conversation'}</div>
                <div className="text-xs text-gray-400 mt-0.5">{conv.ai_query_count} message{conv.ai_query_count !== 1 ? 's' : ''}</div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat panel */}
      <div className="flex-1 flex flex-col bg-white md:border md:border-gray-200 md:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-leaf-100 flex items-center justify-center">
            <Leaf className="w-4 h-4 text-leaf-600" />
          </div>
          <div>
            <p className="font-semibold text-sm text-gray-900">Bhoomi AI Advisor</p>
            <p className="text-xs text-gray-400">Your personal agronomist for Sri Lanka</p>
          </div>
          <button onClick={newConversation} className="ml-auto btn-secondary text-xs py-1.5 px-3 min-h-0">
            <Plus className="w-3 h-3" /> New chat
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-6 py-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-leaf-50 flex items-center justify-center mx-auto mb-3">
                  <Leaf className="w-8 h-8 text-leaf-500" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Ask Bhoomi anything</h3>
                <p className="text-gray-500 text-sm">Your AI agronomist knows your farms, crops, and Sri Lankan conditions.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setInput(s)}
                    className="text-left text-sm px-4 py-3 rounded-xl border border-gray-200 hover:border-leaf-300 hover:bg-leaf-50 transition text-gray-700"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
                msg.role === 'assistant' ? 'bg-leaf-100 text-leaf-600' : 'bg-gray-200 text-gray-600'
              }`}>
                {msg.role === 'assistant' ? '🌱' : '👤'}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-leaf-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 text-gray-800 rounded-tl-sm'
              }`}>
                {msg.attachments?.map((a) => (
                  <div key={a.url} className="mb-2">
                    {a.type === 'image' && (
                      <img src={a.url} alt={a.filename} className="rounded-lg max-h-48 w-auto" />
                    )}
                    {a.type === 'pdf' && (
                      <div className="flex items-center gap-2 text-xs opacity-75">
                        📄 {a.filename}
                      </div>
                    )}
                  </div>
                ))}
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}

          {chatMutation.isPending && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-leaf-100 flex items-center justify-center text-sm">🌱</div>
              <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1.5 items-center">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* File previews */}
        {files.length > 0 && (
          <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-gray-100">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1.5 bg-gray-100 rounded-lg px-2.5 py-1 text-xs text-gray-700">
                {f.type.startsWith('image/') ? '🖼️' : '📄'} {f.name}
                <button onClick={() => setFiles((fs) => fs.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 min-h-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex gap-2 items-end bg-gray-50 rounded-2xl border border-gray-200 px-3 py-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-gray-400 hover:text-gray-600 p-1 min-h-0 flex-shrink-0"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              multiple
              className="hidden"
              capture="environment"
              onChange={(e) => {
                const newFiles = Array.from(e.target.files ?? []);
                setFiles((f) => [...f, ...newFiles].slice(0, 3));
                e.target.value = '';
              }}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your crops, soil, pests, market prices..."
              rows={1}
              className="flex-1 bg-transparent resize-none text-sm text-gray-900 placeholder-gray-400 outline-none max-h-32 min-h-0 py-1"
              style={{ minHeight: '24px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || chatMutation.isPending}
              className="p-1.5 rounded-xl bg-leaf-600 text-white hover:bg-leaf-700 disabled:opacity-40 disabled:cursor-not-allowed transition flex-shrink-0 min-h-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-gray-400 text-center mt-1.5">
            Bhoomi has full context of your farms and current weather.
          </p>
        </div>
      </div>
    </div>
  );
}
