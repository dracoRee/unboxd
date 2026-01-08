import { Component, Input, OnInit, OnChanges, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
export class ChatComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input() conversationId!: number;
  @Input() currentUserId!: number;
  @Input() senderName: string = 'Me';
  
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';
  private messageSubscription!: Subscription;

  constructor(private messagingService: MessagingService) {}

  ngOnInit() {
    this.loadMessages();
    this.setupSocket();
  }

  ngOnChanges() {
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

  sendMessage() {
    if (!this.newMessage.trim()) return;
    
    const content = this.newMessage.trim();
    this.newMessage = '';

    // Optimistic UI update
    const tempMsg: ChatMessage = {
      id: -Math.random(),
      senderId: this.currentUserId,
      content,
      createdAt: new Date().toISOString(),
      sender: { name: this.senderName }
    };
    this.messages.push(tempMsg);
    this.scrollToBottom();

    // Send via socket
    this.messagingService.sendMessageSocket(
      this.conversationId,
      this.currentUserId,
      content,
      this.senderName
    );
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
  }

  private scrollToBottom(): void {
    if (this.scrollContainer) {
      try {
        this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
      } catch(err) { }
    }
  }
}
