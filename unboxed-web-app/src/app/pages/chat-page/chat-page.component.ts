import { Component, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ChatComponent } from '../../components/chat/chat.component';
import { MessagingService, Conversation, ChatMessage } from '../../services/messaging.service';
import { AuthService } from '../../services/auth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent, RouterModule],
  templateUrl: './chat-page.component.html',
  styleUrls: ['./chat-page.component.css']
})
export class ChatPageComponent implements OnInit, OnDestroy {
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  currentUser: any; // Frontend Auth User (Supabase)
  backendUser: any; // Backend DB User (Prisma/Int ID)

  showNewChat = false;
  searchQuery = '';
  searchResults: any[] = [];
  private messageSubscription?: Subscription;

  // Mobile sidebar state
  showSidebar = false;
  isMobileView = window.innerWidth < 768;
  private resizeListener = () => {
    this.isMobileView = window.innerWidth < 768;
    if (!this.isMobileView) this.showSidebar = false;
  };

  // Extend Conversation type locally for state management
  // (In a real app, you might have a dedicated interface/model)
  // conversations: (Conversation & { hasUnread?: boolean })[] = []; 
  // We'll just cast or use property access as TS allows it in some contexts here.

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.currentUser = this.authService.currentUser();
    
    // Watch for backend user changes
    effect(() => {
      this.backendUser = this.authService.backendUser();
      if (this.backendUser) {
        this.loadConversations();
      }
    });
  }

  ngOnInit() {
    window.addEventListener('resize', this.resizeListener);
    this.isMobileView = window.innerWidth < 768;
  }

  loadConversations() {
    if (!this.backendUser) return;
    this.messagingService.getUserConversations(this.backendUser.id).subscribe(data => {
      this.conversations = data;
      // Join all conversation rooms for socket updates
      this.conversations.forEach(conv => {
        this.messagingService.joinConversation(conv.id);
      });
      // Setup socket listener for new messages
      this.setupSocketListener();

      // Auto-select conversation if convId is in URL
      const convId = this.route.snapshot.queryParamMap.get('convId');
      if (convId) {
        const targetConv = this.conversations.find(c => c.id === parseInt(convId));
        if (targetConv) {
          this.selectConversation(targetConv);
        }
      }
    });
  }

  setupSocketListener() {
    // Unsubscribe from previous subscription if exists
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }

    // Subscribe to new messages
    this.messageSubscription = this.messagingService.onNewMessage().subscribe((msg: ChatMessage) => {
      this.handleNewMessage(msg);
    });
  }

  handleNewMessage(msg: ChatMessage) {
    if (!msg.conversationId) return;

    // Find the conversation in the list
    const convIndex = this.conversations.findIndex(c => c.id === msg.conversationId);
    
    if (convIndex !== -1) {
      // Update the conversation with the new message
      const conv = this.conversations[convIndex];
      
      // Update messages array - set the new message as the first (latest) message
      conv.messages = [msg];
      
      // Update the timestamp
      conv.updatedAt = msg.createdAt;
      
      // Set unread if not selected
      if (this.selectedConversation?.id !== msg.conversationId) {
        conv.hasUnread = true;
      }
      
      // Remove from current position and add to the beginning (most recent first)
      this.conversations.splice(convIndex, 1);
      this.conversations.unshift(conv);
      
      // Update selected conversation if it's the same one
      if (this.selectedConversation?.id === msg.conversationId) {
        this.selectedConversation = conv;
      }
    } else {
      // If conversation not in list (shouldn't happen, but just in case), reload
      this.loadConversations();
    }
  }

  getOtherUser(conv: Conversation) {
    if (!this.backendUser) return conv.users[0];
    return conv.users.find(u => u.id !== this.backendUser.id) || conv.users[0];
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
    (conv as any).hasUnread = false;
  }

  onSearch() {
    if (this.searchQuery.length < 2) {
      this.searchResults = [];
      return;
    }
    this.messagingService.searchUsers(this.searchQuery).subscribe(users => {
      // Filter out self
      if (this.backendUser) {
        this.searchResults = users.filter(u => u.id !== this.backendUser.id);
      } else {
        this.searchResults = users;
      }
    });
  }

  startChat(targetUser: any) {
    if (!this.backendUser) {
        console.error('Cannot start chat: Backend identity not resolved');
        return;
    }
    
    this.messagingService.createConversation([this.backendUser.id, targetUser.id]).subscribe(conv => {
      this.showNewChat = false;
      this.searchQuery = '';
      this.searchResults = [];
      
      // Add to list if not exists, or define as selected
      if (!this.conversations.find(c => c.id === conv.id)) {
        this.conversations.unshift(conv);
        // Join the conversation room for socket updates
        this.messagingService.joinConversation(conv.id);
      }
      this.selectConversation(conv);
      // Setup socket listener if not already done
      if (!this.messageSubscription) {
        this.setupSocketListener();
      }
    });
  }

  ngOnDestroy() {
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe();
    }
    window.removeEventListener('resize', this.resizeListener);
  }
}
