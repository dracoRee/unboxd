import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '@/environments/environment';

const host_url = environment.apiBaseUrl;

export interface ChatMessage {
  id: number;
  conversationId?: number;
  tradeId?: number;
  senderId: number;
  content: string;
  imageUrl?: string | null;
  createdAt: string;
  sender?: { name: string; profilePicture?: string | null };
}

export interface Conversation {
  id: number;
  users: { id: number; name: string; profilePicture?: string | null }[];
  messages?: ChatMessage[];
  updatedAt: string;
  hasUnread?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = host_url;
  private socket: Socket;

  constructor(private http: HttpClient) {
    this.socket = io(this.apiUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
  }

  // Socket methods
  joinUserRoom(userId: number) {
    this.socket.emit('join_user', userId);
  }

  joinConversation(conversationId: number) {
    this.socket.emit('join_conversation', conversationId);
  }

  onNewMessage(): Observable<ChatMessage> {
    return new Observable(observer => {
      const handler = (message: ChatMessage) => {
        observer.next(message);
      };
      this.socket.on('new_message', handler);
      return () => this.socket.off('new_message', handler);
    });
  }

  onTradeCreated(): Observable<{ tradeId: number; status: string; version: number }> {
    return new Observable(observer => {
      const handler = (payload: { tradeId: number; status: string; version: number }) => {
        observer.next(payload);
      };
      this.socket.on('trade:created', handler);
      return () => this.socket.off('trade:created', handler);
    });
  }

  onTradeStatus(): Observable<{ tradeId: number; status: string; version: number; updatedAt?: string }> {
    return new Observable(observer => {
      const handler = (payload: { tradeId: number; status: string; version: number; updatedAt?: string }) => {
        observer.next(payload);
      };
      this.socket.on('trade:status', handler);
      return () => this.socket.off('trade:status', handler);
    });
  }

  onTradeChecklist(): Observable<{ tradeId: number; proposerChecklist: Record<string, boolean>; receiverChecklist: Record<string, boolean>; proposerVerificationStatus: string; receiverVerificationStatus: string; version: number; updatedAt?: string }> {
    return new Observable(observer => {
      const handler = (payload: { tradeId: number; proposerChecklist: Record<string, boolean>; receiverChecklist: Record<string, boolean>; proposerVerificationStatus: string; receiverVerificationStatus: string; version: number; updatedAt?: string }) => {
        observer.next(payload);
      };
      this.socket.on('trade:checklist', handler);
      return () => this.socket.off('trade:checklist', handler);
    });
  }

  onTradeConfirmation(): Observable<{ tradeId: number; proposerConfirmedAt: string | null; receiverConfirmedAt: string | null; status: string; version: number; updatedAt?: string }> {
    return new Observable(observer => {
      const handler = (payload: { tradeId: number; proposerConfirmedAt: string | null; receiverConfirmedAt: string | null; status: string; version: number; updatedAt?: string }) => {
        observer.next(payload);
      };
      this.socket.on('trade:confirmation', handler);
      return () => this.socket.off('trade:confirmation', handler);
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

  sendMessage(conversationId: number, senderId: number, content: string, imageUrl?: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/messages`, { conversationId, senderId, content, imageUrl });
  }

  sendMessageSocket(conversationId: number, senderId: number, content: string, senderName: string, imageUrl?: string) {
    this.socket.emit('send_message', { conversationId, senderId, content, senderName, imageUrl });
  }

  uploadImage(image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }
}
