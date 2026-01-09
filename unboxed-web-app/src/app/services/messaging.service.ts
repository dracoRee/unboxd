import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface ChatMessage {
  id: number;
  conversationId?: number;
  tradeId?: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender?: { name: string };
}

export interface Conversation {
  id: number;
  users: { id: number; name: string }[];
  messages?: ChatMessage[];
  updatedAt: string;
  hasUnread?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = 'http://localhost:3000';
  private socket: Socket;

  constructor(private http: HttpClient) {
    this.socket = io(this.apiUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
  }

  // Socket methods
  joinConversation(conversationId: number) {
    this.socket.emit('join_conversation', conversationId);
  }

  onNewMessage(): Observable<ChatMessage> {
    return new Observable(observer => {
      this.socket.on('new_message', (message: ChatMessage) => {
        observer.next(message);
      });
    });
  }

  // API methods
  syncUser(email: string, name?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/sync`, { email, name });
  }

  searchUsers(query: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/search?q=${query}`);
  }

  createConversation(userIds: number[]): Observable<Conversation> {
    return this.http.post<Conversation>(`${this.apiUrl}/conversations`, { userIds });
  }

  getUserConversations(userId: number): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations/user/${userId}`);
  }

  getMessages(conversationId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/messages/${conversationId}`);
  }

  sendMessage(conversationId: number, senderId: number, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/messages`, { conversationId, senderId, content });
  }

  sendMessageSocket(conversationId: number, senderId: number, content: string, senderName: string) {
    this.socket.emit('send_message', { conversationId, senderId, content, senderName });
  }
}
