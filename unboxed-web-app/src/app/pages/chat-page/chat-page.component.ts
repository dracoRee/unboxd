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
  template: `
    <div class="h-[calc(100vh-64px)] bg-gray-50 flex">
      <!-- Sidebar -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-100">
          <h2 class="text-xl font-bold mb-4">Chats</h2>
          
        </div>

        <!-- Conversations List -->
        <div class="flex-1 overflow-y-auto">
          @for (conv of conversations; track conv.id) {
            <div (click)="selectConversation(conv)"
                 [class.bg-indigo-50]="selectedConversation?.id === conv.id"
                 [class.border-l-4]="selectedConversation?.id === conv.id"
                 [class.border-indigo-600]="selectedConversation?.id === conv.id"
                 class="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-all">
              <div class="flex items-center gap-3">
                <img [src]="getOtherUser(conv).profilePicture || '/default-avatar.png'" 
                     [alt]="getOtherUser(conv).name"
                     [routerLink]="['/profile', getOtherUser(conv).id]" 
                     (click)="$event.stopPropagation()" 
                     class="w-10 h-10 rounded-full object-cover cursor-pointer border-2 border-gray-200 hover:border-indigo-500 transition-colors">
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-baseline mb-1">
                    <h3 [routerLink]="['/profile', getOtherUser(conv).id]" (click)="$event.stopPropagation()" class="font-bold truncate text-gray-900 hover:text-indigo-600">{{ getOtherUser(conv).name }}</h3>
                    <span class="text-[10px] text-gray-400 ml-2 whitespace-nowrap">
                      {{ conv.updatedAt | date:'shortTime' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 truncate flex items-center gap-1">
                    @if (conv.messages && conv.messages.length > 0) {
                      <span class="font-semibold text-gray-700">
                        {{ conv.messages[0].senderId === backendUser?.id ? 'You' : conv.messages[0].sender?.name }}:
                      </span>
                      {{ conv.messages[0].content }}
                    } @else {
                      Start a conversation
                    }
                  </p>
                </div>
                <!-- Unread Dot -->
                @if (conv.hasUnread && selectedConversation?.id !== conv.id) {
                  <div class="w-2.5 h-2.5 bg-indigo-600 rounded-full shadow-sm animate-pulse"></div>
                }
              </div>
            </div>
          } @empty {
            <div class="p-8 text-center text-gray-400 text-sm">
              No conversations yet.
            </div>
          }
        </div>
      </div>

      <!-- Main Chat Area -->
      <div class="flex-1 flex flex-col">
        @if (selectedConversation) {
          <!-- Chat Header -->
          <div class="h-16 border-b border-gray-200 bg-white flex items-center px-6 justify-between">
             <div class="flex items-center gap-3">
               <img [src]="getOtherUser(selectedConversation).profilePicture || '/default-avatar.png'" 
                    [alt]="getOtherUser(selectedConversation).name"
                    [routerLink]="['/profile', getOtherUser(selectedConversation).id]" 
                    class="w-10 h-10 rounded-full object-cover cursor-pointer border-2 border-gray-200 hover:border-indigo-500 transition-colors">
               <div>
                 <h3 [routerLink]="['/profile', getOtherUser(selectedConversation).id]" class="font-bold text-lg hover:text-indigo-600 cursor-pointer">{{ getOtherUser(selectedConversation).name }}</h3>
                 <!-- <span class="text-green-500 text-xs flex items-center gap-1">● Online</span> -->
               </div>
             </div>
          </div>

          <!-- Chat Component -->
          <div class="flex-1 relative bg-white">
            <app-chat 
              [conversationId]="selectedConversation.id" 
              [currentUserId]="backendUser?.id"
              [senderName]="backendUser?.name || 'Me'"
              (onMessageSent)="handleNewMessage($event)"
              class="absolute inset-0 block">
            </app-chat>
          </div>
        } @else {
          <div class="flex-1 flex flex-col items-center justify-center bg-gray-50 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-24 w-24 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>Select a chat to start messaging</p>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .animate-slide-down {
      animation: slideDown 0.2s ease-out forwards;
    }
    @keyframes slideDown {
      from { opacity: 0; transform: translateY(-10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `]
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

  ngOnInit() {}

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
  }
}
