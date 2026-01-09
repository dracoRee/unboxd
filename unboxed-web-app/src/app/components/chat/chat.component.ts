import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessagingService, ChatMessage } from '../../services/messaging.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.css']
})
export class ChatComponent implements OnInit, OnChanges, OnDestroy, AfterViewChecked {
  @Input() conversationId!: number;
  @Input() currentUserId!: number;
  @Input() senderName: string = 'Me';
  @Output() onMessageSent = new EventEmitter<ChatMessage>();
  
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
    
    this.messagingService.getMessages(this.conversationId).subscribe({
      next: (messages) => {
        this.messages = messages;
        this.scrollToBottom();
      },
      error: (err) => console.error('Error fetching messages:', err)
    });
  }

  setupSocket() {
    if (!this.conversationId) return;
    this.messagingService.joinConversation(this.conversationId);
    
    if (this.messageSubscription) this.messageSubscription.unsubscribe();
    
    this.messageSubscription = this.messagingService.onNewMessage().subscribe(msg => {
      if (msg.conversationId === this.conversationId) {
        // Only add if not already in the list (avoid duplicates)
        if (!this.messages.find(m => m.id === msg.id)) {
          this.messages.push(msg);
          this.scrollToBottom();
        }
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
      conversationId: this.conversationId,
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
    
    this.onMessageSent.emit(tempMsg);
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
