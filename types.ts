export interface User {
  username: string;
  avatar: string;
  createdAt: number;
  savedContacts?: string[];
}

export interface Message {
  id?: string;
  from: string;
  to: string;
  text: string;
  createdAt: number;
}

export interface ChatSession {
  username: string;
  lastMessage?: string;
  lastMessageTime?: number;
  avatar: string;
}