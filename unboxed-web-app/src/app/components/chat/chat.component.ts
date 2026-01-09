import { Component, Input, OnInit, OnDestroy, OnChanges, SimpleChanges, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
export class ChatComponent implements OnInit, OnDestroy, OnChanges, AfterViewChecked {
  @Input() conversationId!: number;
  @Input() currentUserId!: number;
  @Input() senderName?: string;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  messages: ChatMessage[] = [];
  newMessage = '';

  private messageSubscription!: Subscription;

  constructor(private messagingService: MessagingService) {}

  ngOnInit() {
    this.loadMessages();
    this.setupSocket();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Reload messages when conversation changes
    if (changes['conversationId'] && !changes['conversationId'].firstChange) {
      this.loadMessages();
      this.setupSocket();
    }
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
