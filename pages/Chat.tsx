import React, { useEffect, useState, useRef } from 'react';
import { User, Message } from '../types';
import { subscribeToUsers, subscribeToMessages, sendMessage, subscribeToUserData, toggleSavedContact } from '../services/firebase';
import Avatar from '../components/Avatar';

interface ChatProps {
  currentUser: User;
  onLogout: () => void;
}

const Chat: React.FC<ChatProps> = ({ currentUser, onLogout }) => {
  const [users, setUsers] = useState<User[]>([]);
  // We need local state for the *full* current user object to track savedContacts updates in real-time
  const [realtimeCurrentUser, setRealtimeCurrentUser] = useState<User>(currentUser);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Listen to Current User Data (to keep savedContacts fresh)
  useEffect(() => {
      const unsub = subscribeToUserData(currentUser.username, (updatedUser) => {
          setRealtimeCurrentUser(updatedUser);
      });
      return () => unsub();
  }, [currentUser.username]);

  // 2. Load All Users (Global List)
  useEffect(() => {
    const unsub = subscribeToUsers(currentUser.username, (fetchedUsers) => {
      setUsers(fetchedUsers);
    });
    return () => unsub();
  }, [currentUser.username]);

  // 3. Load Messages when user selected
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToMessages(currentUser.username, selectedUser.username, (msgs) => {
      setMessages(msgs);
    });
    return () => unsub();
  }, [currentUser.username, selectedUser]);

  // 4. Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() || !selectedUser) return;
    
    const text = inputText;
    setInputText(''); // Optimistic clear
    await sendMessage(currentUser.username, selectedUser.username, text);
  };

  const handleToggleSave = async () => {
      if (!selectedUser) return;
      const isSaved = realtimeCurrentUser.savedContacts?.includes(selectedUser.username) || false;
      await toggleSavedContact(currentUser.username, selectedUser.username, isSaved);
  };

  // Logic: 
  // If Search Term exists -> Show ANY matching user from DB (Global Search)
  // If Search Term is empty -> Show ONLY users in `savedContacts` array
  const savedIds = realtimeCurrentUser.savedContacts || [];
  
  const displayedUsers = users.filter(u => {
      const matchesSearch = u.username.toLowerCase().includes(searchTerm.toLowerCase());
      if (searchTerm) {
          return matchesSearch;
      } else {
          // Only show saved contacts by default
          return savedIds.includes(u.username);
      }
  });

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isSelectedUserSaved = selectedUser && savedIds.includes(selectedUser.username);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-900">
      
      {/* SIDEBAR */}
      <div className={`flex flex-col w-full md:w-80 lg:w-96 border-r border-slate-800 bg-slate-900 ${selectedUser ? 'hidden md:flex' : 'flex'}`}>
        
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Avatar src={realtimeCurrentUser.avatar} alt={realtimeCurrentUser.username} size="sm" />
                <span className="font-semibold text-slate-200">@{realtimeCurrentUser.username}</span>
            </div>
            <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
            </button>
        </div>

        {/* Search */}
        <div className="p-3">
            <div className="relative">
                <input 
                    type="text" 
                    placeholder="Search users..." 
                    className="w-full bg-slate-800 text-slate-200 pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 border border-slate-700"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
            {!searchTerm && displayedUsers.length === 0 ? (
                <div className="text-center text-slate-500 mt-10 p-4">
                    <p>No contacts saved.</p>
                    <p className="text-sm mt-2 text-slate-400">Use the search bar to find people and click the <span className="text-yellow-500">★</span> to save them!</p>
                </div>
            ) : searchTerm && displayedUsers.length === 0 ? (
                <div className="text-center text-slate-500 mt-10 p-4">
                    <p>No users found.</p>
                </div>
            ) : (
                <>
                    {!searchTerm && <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Saved Contacts</div>}
                    {searchTerm && <div className="px-4 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Global Search Results</div>}
                    
                    {displayedUsers.map(user => (
                        <div 
                            key={user.username}
                            onClick={() => setSelectedUser(user)}
                            className={`p-3 flex items-center gap-3 cursor-pointer transition-colors hover:bg-slate-800 ${selectedUser?.username === user.username ? 'bg-blue-600/20 border-l-4 border-blue-500' : 'border-l-4 border-transparent'}`}
                        >
                            <Avatar src={user.avatar} alt={user.username} />
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline">
                                    <h3 className="text-sm font-semibold text-slate-200 truncate">{user.username}</h3>
                                </div>
                                <p className="text-xs text-slate-500 truncate">Tap to chat</p>
                            </div>
                        </div>
                    ))}
                </>
            )}
        </div>
      </div>

      {/* CHAT AREA */}
      <div className={`flex-1 flex flex-col bg-slate-950 relative ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {!selectedUser ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                </div>
                <p>Select a chat to start messaging</p>
            </div>
        ) : (
            <>
                {/* Chat Header */}
                <div className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedUser(null)} className="md:hidden text-slate-400 mr-2">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <Avatar src={selectedUser.avatar} alt={selectedUser.username} size="sm" />
                        <div>
                            <h3 className="font-semibold text-slate-200">@{selectedUser.username}</h3>
                            <span className="text-xs text-blue-400">Online</span>
                        </div>
                    </div>
                    
                    {/* Save Contact Star Button */}
                    <button 
                        onClick={handleToggleSave}
                        className={`p-2 rounded-full transition-all active:scale-90 ${isSelectedUserSaved ? 'text-yellow-400 hover:bg-yellow-400/10' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800'}`}
                        title={isSelectedUserSaved ? "Remove from contacts" : "Save contact"}
                    >
                        {isSelectedUserSaved ? (
                            // Filled Star
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                        ) : (
                            // Outline Star
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                            </svg>
                        )}
                    </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed">
                    {messages.length === 0 && (
                        <div className="text-center mt-10 text-slate-600 text-sm">
                            No messages here yet. Say Hi! 👋
                        </div>
                    )}
                    {messages.map((msg) => {
                        const isMe = msg.from === currentUser.username;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-2 shadow-sm ${isMe ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-800 text-slate-200 rounded-bl-none'}`}>
                                    <p className="text-sm whitespace-pre-wrap break-words">{msg.text}</p>
                                    <div className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                                        {formatTime(msg.createdAt)}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-slate-900 border-t border-slate-800">
                    <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Message..."
                            className="flex-1 bg-slate-800 text-slate-200 rounded-2xl px-4 py-3 focus:outline-none focus:ring-1 focus:ring-blue-500 border border-transparent"
                        />
                        <button 
                            type="submit" 
                            disabled={!inputText.trim()}
                            className="bg-blue-600 hover:bg-blue-500 text-white rounded-full p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                </div>
            </>
        )}
      </div>
    </div>
  );
};

export default Chat;