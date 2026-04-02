import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import { Send, User as UserIcon, Sparkles, Wand2, LogOut, MessageSquare } from 'lucide-react';

const Chat = ({ token, user, onLogout }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [stompClient, setStompClient] = useState(null);
  const [summary, setSummary] = useState('');
  const [smartReplies, setSmartReplies] = useState([]);
  
  // Contacts and Notification state
  const [contacts, setContacts] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  
  // State to manage what room we are in
  const [activeTab, setActiveTab] = useState('public'); // 'public' or 'private'
  const [privateRecipient, setPrivateRecipient] = useState('');
  
  // Need a ref to the active chatId so WebSocket callbacks can read the latest value
  const activeChatIdRef = useRef('public_global_chat');
  
  const messagesEndRef = useRef(null);

  const getChatId = (tab = activeTab, recipient = privateRecipient) => {
    if (tab === 'public') return 'public_global_chat';
    if (!recipient) return 'unknown';
    return [user.username, recipient].sort().join('_');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch users for contact list
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const response = await axios.get('http://localhost:8080/api/users', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setContacts(response.data);
      } catch (e) {
        console.error('Failed to fetch contacts', e);
      }
    };
    fetchContacts();
    const intervalId = setInterval(fetchContacts, 10000); 
    return () => clearInterval(intervalId);
  }, [token]);

  // Handle Tab Switching & History Fetching
  useEffect(() => {
    const newChatId = getChatId(activeTab, privateRecipient);
    activeChatIdRef.current = newChatId;
    
    setMessages([]);
    setSummary('');
    setSmartReplies([]);
    
    // Clear unread count for the newly opened tab
    if (activeTab === 'public') {
      setUnreadCounts(prev => ({ ...prev, public_global_chat: 0 }));
    } else if (privateRecipient) {
      setUnreadCounts(prev => ({ ...prev, [privateRecipient]: 0 }));
    }

    // Fetch message history from DB
    const fetchHistory = async () => {
      if (newChatId === 'unknown') return;
      try {
        const response = await axios.get(`http://localhost:8080/api/messages/${newChatId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data);
      } catch (e) {
        console.error('Failed to load chat history');
      }
    };
    
    fetchHistory();
  }, [activeTab, privateRecipient, token]);

  useEffect(() => {
    window.global = window; // Fix for sockjs/stompjs

    const client = new Client({
      brokerURL: 'ws://localhost:8080/ws',
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: { Authorization: `Bearer ${token}` },
      onConnect: () => {
        console.log('Connected to WebSocket');
        
        // Helper to process incoming message safely
        const processIncomingMessage = (body) => {
          // If the message belongs to our currently open chat tab, render it!
          if (body.chatId === activeChatIdRef.current) {
            setMessages((prev) => [...prev, body]);
            
            if (body.senderId !== user.username) {
               fetchSmartReplies(body.content);
            }
          } else {
            // It's a background message! Update unread counts instead.
            if (body.chatId === 'public_global_chat') {
               setUnreadCounts(prev => ({ ...prev, public_global_chat: (prev.public_global_chat || 0) + 1 }));
            } else {
               // Private message from someone else
               setUnreadCounts(prev => ({ ...prev, [body.senderId]: (prev[body.senderId] || 0) + 1 }));
            }
          }
        };

        // 1. Subscribe to Public Global Chat
        client.subscribe('/topic/public', (message) => {
          processIncomingMessage(JSON.parse(message.body));
        });

        // 2. Subscribe to Private Messages specifically meant for this user
        client.subscribe('/user/queue/messages', (message) => {
          processIncomingMessage(JSON.parse(message.body));
        });
      },
      onStompError: (frame) => {
        console.error('Broker reported error: ' + frame.headers['message']);
      }
    });

    client.activate();
    setStompClient(client);

    return () => client.deactivate();
  }, [token, user]);

  const fetchSmartReplies = async (content) => {
    try {
      const response = await axios.post('http://localhost:8080/api/ai/smart-reply', content, {
        headers: { 'Content-Type': 'text/plain', Authorization: `Bearer ${token}` }
      });
      if (response.data && response.data.trim()) {
        const replyLine = response.data.split('\n')[0].replace(/['"]/g, '');
        if (replyLine.length > 2 && replyLine.length < 80) setSmartReplies([replyLine]);
      }
    } catch (e) { console.error('Failed to get smart reply'); }
  };

  const handleSummarize = async () => {
    setSummary('Summarizing...');
    try {
      const response = await axios.get(`http://localhost:8080/api/ai/summarize/${getChatId()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummary(response.data);
    } catch (e) {
      setSummary('Failed to summarize. Check backend logs and ensure API keys are valid.');
    }
  };

  const sendMessage = (e, textOverride = null) => {
    if (e) e.preventDefault();
    const text = textOverride || inputMessage;
    
    if (text.trim() && stompClient && stompClient.connected) {
      const recipientId = activeTab === 'private' ? privateRecipient : '';
      
      const chatMessage = {
        chatId: getChatId(),
        senderId: user.username,
        recipientId: recipientId,
        content: text
      };
      
      stompClient.publish({
        destination: '/app/chat.sendMessage',
        body: JSON.stringify(chatMessage)
      });
      
      // If private, optimistic UI update 
      if (activeTab === 'private') {
         setMessages((prev) => [...prev, { ...chatMessage, timestamp: new Date() }]);
      }

      setInputMessage('');
      setSmartReplies([]);
    }
  };

  return (
    <div className="glass-panel app-container">
      {/* Sidebar */}
      <div className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
             <UserIcon size={20} style={{ color: 'var(--text-muted)' }} />
             {user.username}
          </div>
          <button style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }} onClick={onLogout}>
            <LogOut size={16} />
          </button>
        </div>
        
        <div className="contact-list">
          {/* Public Tab */}
          <div className={`contact-item ${activeTab === 'public' ? 'active' : ''}`} onClick={() => setActiveTab('public')}>
            <div className="contact-avatar"><MessageSquare size={20} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                Public Global Room
                {unreadCounts['public_global_chat'] > 0 && (
                  <span style={{ background: '#22c55e', color: 'white', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                    {unreadCounts['public_global_chat']}
                  </span>
                )}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Community Chat</div>
            </div>
          </div>
          
          {/* Private Chat List */}
          <div className="sidebar-header" style={{ marginTop: '1rem', borderTop: '1px solid var(--border-color)', borderBottom: 'none', fontSize: '1rem'}}>
             Direct Messages
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {contacts.length === 0 && <div style={{ padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No other users registered yet.</div>}
            
            {contacts.map((contact) => (
              <div 
                key={contact.username} 
                className={`contact-item ${activeTab === 'private' && privateRecipient === contact.username ? 'active' : ''}`}
                onClick={() => { setActiveTab('private'); setPrivateRecipient(contact.username); }}
              >
                <div className="contact-avatar"><UserIcon size={20} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                    {contact.username}
                    {unreadCounts[contact.username] > 0 && (
                      <span style={{ background: '#22c55e', color: 'white', borderRadius: '12px', padding: '0.1rem 0.5rem', fontSize: '0.7rem' }}>
                        {unreadCounts[contact.username]}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: contact.status === 'ONLINE' ? 'green' : 'var(--text-muted)' }}>
                    {contact.status || 'OFFLINE'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="chat-area">
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="contact-avatar">{activeTab === 'public' ? <MessageSquare size={20} /> : <UserIcon size={20}/>}</div>
            <span style={{ fontWeight: 600 }}>
               {activeTab === 'public' ? 'Public Global Room' : (privateRecipient ? `Chatting with ${privateRecipient}` : 'Type a username to start')}
            </span>
          </div>
          <button onClick={handleSummarize} style={{ background: 'var(--ai-badge)' }}>
            <Wand2 size={16} /> Summarize
          </button>
        </div>

        <div className="messages-container">
          {summary && (
            <div className="ai-summary-box">
              <strong style={{ color: 'var(--ai-badge)' }}><Sparkles size={14} style={{ display: 'inline', verticalAlign: 'text-bottom' }}/> AI Summary:</strong> {summary}
            </div>
          )}
          
          {messages.map((msg, idx) => {
            const isMe = msg.senderId === user.username;
            return (
              <div key={idx} className={`message-bubble ${isMe ? 'message-sent' : 'message-received'}`}>
                {!isMe && <div style={{ fontSize: '0.75rem', fontWeight: 600, marginBottom: '0.2rem', color: 'var(--text-muted)' }}>{msg.senderId}</div>}
                <div>{msg.content}</div>
                <span className="message-time">{msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-container">
          {smartReplies.length > 0 && (
            <div className="ai-replies">
              <span style={{ fontSize: '0.8rem', color: 'var(--ai-badge)', display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={14} /> Smart Replies:</span>
              {smartReplies.map((reply, i) => (
                 <div key={i} className="ai-chip" onClick={() => sendMessage(null, reply)}>{reply}</div>
              ))}
            </div>
          )}
          <form className="input-row" onSubmit={sendMessage}>
            <input 
              type="text" 
              placeholder={activeTab === 'private' && !privateRecipient ? "Please select a user on the left sidebar to DM" : "Type your message..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              disabled={activeTab === 'private' && !privateRecipient}
            />
            <button type="submit" disabled={activeTab === 'private' && !privateRecipient}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat;
