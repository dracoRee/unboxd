import { Component, Input, OnInit, OnDestroy, OnChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagingService, ChatMessage } from '../../services/messaging.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: white;
    }
    .messages-area {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .message {
      max-width: 80%;
      padding: 0.5rem 1rem;
      border-radius: 1rem;
      word-wrap: break-word;
    }
    .message.sent {
      align-self: flex-end;
      background-color: #4f46e5;
      color: white;
      border-bottom-right-radius: 0.25rem;
    }
    .message.received {
      align-self: flex-start;
      background-color: #f3f4f6;
      color: #1f2937;
      border-bottom-left-radius: 0.25rem;
    }
    .input-area {
      padding: 1rem;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 0.5rem;
    }
  `]
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() conversationId!: number;
  @Input() currentUserId!: number;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  private messageSubscription!: Subscription;

  constructor(private messagingService: MessagingService) {}

  ngOnInit() {
    this.loadMessages();
    this.setupSocket();
  }

  ngOnChanges() {
    // Reload if conversationId changes
    this.loadMessages();
    this.setupSocket();
  }

  loadMessages() {
    if (!this.conversationId) return;
    this.messagingService.getMessages(this.conversationId).subscribe(msgs => {
      this.messages = msgs;
      this.scrollToBottom();
    });
  }

  setupSocket() {
    if (!this.conversationId) return;
    this.messagingService.joinConversation(this.conversationId);
    
    if (this.messageSubscription) this.messageSubscription.unsubscribe();
    
    this.messageSubscription = this.messagingService.onNewMessage().subscribe(msg => {
      if (msg.conversationId === this.conversationId) {
        this.messages.push(msg);
        this.scrollToBottom();
      }
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }

  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    this.messagingService.sendMessage(this.conversationId, this.currentUserId, this.newMessage).subscribe({
      next: () => {
        this.newMessage = '';
      },
      error: (err) => console.error('Failed to send message', err)
    });
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }
}
