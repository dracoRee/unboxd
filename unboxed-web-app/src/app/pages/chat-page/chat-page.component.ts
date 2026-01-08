import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatComponent } from '../../components/chat/chat.component';
import { MessagingService, Conversation } from '../../services/messaging.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [CommonModule, FormsModule, ChatComponent],
  template: `
    <div class="h-[calc(100vh-64px)] bg-gray-50 flex">
      <!-- Sidebar -->
      <div class="w-80 bg-white border-r border-gray-200 flex flex-col">
        <!-- Header -->
        <div class="p-4 border-b border-gray-100">
          <h2 class="text-xl font-bold mb-4">Chats</h2>
          
          <!-- New Chat Button -->
          <button (click)="showNewChat = true" class="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>

        <!-- Search Popover (simulated inside sidebar for prototype) -->
        @if (showNewChat) {
          <div class="p-4 bg-gray-50 border-b border-gray-200 animate-slide-down">
            <div class="flex justify-between items-center mb-2">
              <span class="text-xs font-bold text-gray-500 uppercase">New Message To:</span>
              <button (click)="showNewChat = false" class="text-gray-400 hover:text-gray-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input type="text" 
                   [(ngModel)]="searchQuery" 
                   (input)="onSearch()"
                   placeholder="Search users..."
                   class="w-full px-3 py-2 border rounded-lg text-sm mb-2 focus:outline-none focus:border-indigo-500">
            
            <div class="max-h-40 overflow-y-auto bg-white rounded-lg border border-gray-100">
              @for (user of searchResults; track user.id) {
                <button (click)="startChat(user)" class="w-full text-left px-3 py-2 hover:bg-indigo-50 text-sm flex items-center gap-2">
                  <div class="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center text-xs font-bold text-indigo-600">
                    {{ user.name[0] }}
                  </div>
                  {{ user.name }}
                </button>
              } @empty {
                @if (searchQuery) { <div class="p-2 text-xs text-center text-gray-400">No users found</div> }
              }
            </div>
          </div>
        }

        <!-- Conversations List -->
        <div class="flex-1 overflow-y-auto">
          @for (conv of conversations; track conv.id) {
            <div (click)="selectConversation(conv)"
                 [class.bg-indigo-50]="selectedConversation?.id === conv.id"
                 [class.border-l-4]="selectedConversation?.id === conv.id"
                 [class.border-indigo-600]="selectedConversation?.id === conv.id"
                 class="p-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-all">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {{ getOtherUser(conv).name[0] }}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex justify-between items-baseline mb-1">
                    <h3 class="font-bold truncate text-gray-900">{{ getOtherUser(conv).name }}</h3>
                    <span class="text-[10px] text-gray-400 ml-2 whitespace-nowrap">
                      {{ conv.updatedAt | date:'shortTime' }}
                    </span>
                  </div>
                  <p class="text-xs text-gray-500 truncate">
                    {{ conv.messages?.[0]?.content || 'Start a conversation' }}
                  </p>
                </div>
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
               <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                 {{ getOtherUser(selectedConversation).name[0] }}
               </div>
               <div>
                 <h3 class="font-bold text-lg">{{ getOtherUser(selectedConversation).name }}</h3>
                 <!-- <span class="text-green-500 text-xs flex items-center gap-1">● Online</span> -->
               </div>
             </div>
          </div>

          <!-- Chat Component -->
          <div class="flex-1 relative bg-white">
            <app-chat 
              [conversationId]="selectedConversation.id" 
              [currentUserId]="backendUser.id"
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
export class ChatPageComponent implements OnInit {
  conversations: Conversation[] = [];
  selectedConversation: Conversation | null = null;
  currentUser: any; // Frontend Auth User (Supabase)
  backendUser: any; // Backend DB User (Prisma/Int ID)

  showNewChat = false;
  searchQuery = '';
  searchResults: any[] = [];

  constructor(
    private messagingService: MessagingService,
    private authService: AuthService
  ) {
    this.currentUser = this.authService.currentUser();
  }

  ngOnInit() {
    if (this.currentUser?.email) {
      this.resolveBackendIdentity();
    } else {
        console.warn('No logged in user found via AuthService');
    }
  }

  resolveBackendIdentity() {
    // Extract name from metadata if available, otherwise fallback
    const name = this.currentUser.user_metadata?.name || this.currentUser.name;
    
    this.messagingService.syncUser(this.currentUser.email, name).subscribe({
      next: (user) => {
        this.backendUser = user;
        this.loadConversations();
      },
      error: (err) => {
        console.error('Failed to resolve backend identity', err);
      }
    });
  }

  loadConversations() {
    if (!this.backendUser) return;
    this.messagingService.getUserConversations(this.backendUser.id).subscribe(data => {
      this.conversations = data;
    });
  }

  getOtherUser(conv: Conversation) {
    if (!this.backendUser) return conv.users[0];
    return conv.users.find(u => u.id !== this.backendUser.id) || conv.users[0];
  }

  selectConversation(conv: Conversation) {
    this.selectedConversation = conv;
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
      }
      this.selectConversation(conv);
    });
  }
}
