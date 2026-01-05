import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChatMessage {
  id: number;
  tradeId: number;
  senderId: number;
  content: string;
  createdAt: string;
  sender?: { name: string };
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getMessages(tradeId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/messages/${tradeId}`);
  }

  sendMessage(tradeId: number, senderId: number, content: string): Observable<ChatMessage> {
    return this.http.post<ChatMessage>(`${this.apiUrl}/messages`, { tradeId, senderId, content });
  }
}
