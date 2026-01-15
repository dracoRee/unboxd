import { Component, Input, Output, EventEmitter, OnInit, OnChanges, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MessagingService, ChatMessage } from '../../services/messaging.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
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
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  isUploading = false;

  private messageSubscription!: Subscription;

  openImage(imageUrl: string) {
    window.open(imageUrl, '_blank');
  }

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
      if (msg.conversationId !== this.conversationId) return;

      if (msg.senderId === this.currentUserId) {
        return;
      }

    // Prevent duplicates by ID
      if (!this.messages.find(m => m.id === msg.id)) {
        this.messages.push(msg);
        this.scrollToBottom();
      }
    });
  }

  onImageSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
      this.selectedImage = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.selectedImage = null;
    this.imagePreview = null;
  }

  async sendMessage() {
    if (!this.newMessage.trim() && !this.selectedImage) return;
    
    const content = this.newMessage.trim();
    this.newMessage = '';
    let imageUrl: string | undefined = undefined;

    // If there's an image, upload it first
    if (this.selectedImage) {
      this.isUploading = true;
      try {
        const uploadResult = await this.messagingService.uploadImage(this.selectedImage).toPromise();
        imageUrl = uploadResult.url;
        this.selectedImage = null;
        this.imagePreview = null;
      } catch (error) {
        console.error('Failed to upload image:', error);
        this.isUploading = false;
        alert('Failed to upload image. Please try again.');
        return;
      }
      this.isUploading = false;
    }

    // Optimistic UI update (only for image messages, text messages use socket)
    let tempMsg: ChatMessage | null = null;
    
    if (imageUrl) {
      tempMsg = {
        id: -Math.random(),
        conversationId: this.conversationId,
        senderId: this.currentUserId,
        content: content || '📷 Image',
        imageUrl: imageUrl,
        createdAt: new Date().toISOString(),
        sender: { name: this.senderName, profilePicture: null }
      };
      this.messages.push(tempMsg);
      this.scrollToBottom();
    } else {
      // For text messages, create temp message for socket
      tempMsg = {
        id: -Math.random(),
        conversationId: this.conversationId,
        senderId: this.currentUserId,
        content: content,
        createdAt: new Date().toISOString(),
        sender: { name: this.senderName, profilePicture: null }
      };
      this.messages.push(tempMsg);
      this.scrollToBottom();
    }

    // Send via HTTP (for images) or socket (for text)
    if (imageUrl) {
      // For images, use HTTP to handle upload
      this.messagingService.sendMessage(
        this.conversationId,
        this.currentUserId,
        content || '',
        imageUrl
      ).subscribe({
        next: (savedMsg) => {
          // Replace optimistic message with real one
          if (tempMsg) {
            const tempIndex = this.messages.findIndex(m => m.id === tempMsg!.id);
            if (tempIndex !== -1) {
              this.messages[tempIndex] = savedMsg;
            } else {
              // If temp message was already replaced, check for duplicates
              const existingIndex = this.messages.findIndex(m => 
                m.id === savedMsg.id || 
                (m.senderId === this.currentUserId && 
                 m.content === savedMsg.content && 
                 m.imageUrl === savedMsg.imageUrl &&
                 Math.abs(new Date(m.createdAt).getTime() - new Date(savedMsg.createdAt).getTime()) < 2000)
              );
              if (existingIndex === -1) {
                this.messages.push(savedMsg);
              }
            }
          }
          this.onMessageSent.emit(savedMsg);
        },
        error: (err) => {
          console.error('Failed to send message:', err);
          // Remove optimistic message on error
          if (tempMsg) {
            const tempIndex = this.messages.findIndex(m => m.id === tempMsg!.id);
            if (tempIndex !== -1) {
              this.messages.splice(tempIndex, 1);
            }
          }
          alert('Failed to send message. Please try again.');
        }
      });
    } else {
      // For text-only messages, use socket
      this.messagingService.sendMessageSocket(
        this.conversationId,
        this.currentUserId,
        content,
        this.senderName
      );
      this.onMessageSent.emit(tempMsg!);
    }
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
