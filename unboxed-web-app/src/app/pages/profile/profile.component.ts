import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UserService, UserProfile } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="profile-container" *ngIf="profile">
      <div class="profile-header">
        <div class="avatar-container">
          <img [src]="profile.profilePicture || 'assets/default-avatar.png'" alt="Avatar" class="profile-avatar">
          <button *ngIf="isOwnProfile" class="edit-avatar-btn" (click)="triggerFileInput()">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <input type="file" #fileInput (change)="onFileSelected($event)" accept="image/*" class="hidden">
        </div>
        
        <div class="profile-info">
          <div class="name-row">
            <h1>{{ profile.name }}</h1>
            <div class="actions">
              <button *ngIf="isOwnProfile" (click)="toggleEdit()" class="btn-secondary">
                {{ isEditing ? 'Cancel' : 'Edit Profile' }}
              </button>
              <button *ngIf="!isOwnProfile" 
                      (click)="toggleFollow()" 
                      [class.btn-following]="profile.isFollowing"
                      class="btn-primary">
                {{ profile.isFollowing ? 'Following' : 'Follow' }}
              </button>
            </div>
          </div>
          
          <p class="email" *ngIf="isOwnProfile">{{ profile.email }}</p>
          
          <div class="stats">
            <div class="stat-item">
              <strong>{{ profile._count.collection }}</strong>
              <span>Items</span>
            </div>
            <div class="stat-item">
              <strong>{{ profile._count.followedBy }}</strong>
              <span>Followers</span>
            </div>
            <div class="stat-item">
              <strong>{{ profile._count.following }}</strong>
              <span>Following</span>
            </div>
          </div>

          <div class="bio-section">
            <p *ngIf="!isEditing">{{ profile.bio || 'No bio yet.' }}</p>
            <div *ngIf="isEditing" class="edit-form">
              <textarea [(ngModel)]="editData.bio" placeholder="Write something about yourself..."></textarea>
              <div class="upload-status" *ngIf="selectedFile">
                Selected: {{ selectedFile.name }}
              </div>
              <button (click)="saveProfile()" class="btn-primary" [disabled]="isSaving">
                {{ isSaving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="profile-content">
        <!-- Collection and other sections could go here -->
        <div class="section-tabs">
          <div class="tab active">Collection</div>
          <div class="tab">Activity</div>
        </div>
        
        <div class="coming-soon">
          Collection view integration coming soon...
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profile-container {
      max-width: 1000px;
      margin: 2rem auto;
      padding: 0 1rem;
      color: #e0e0e0;
    }
    .profile-header {
      display: flex;
      gap: 3rem;
      background: #2a475e;
      padding: 3rem;
      border-radius: 12px;
      border: 1px solid rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
    }
    .avatar-container {
      position: relative;
    }
    .profile-avatar {
      width: 180px;
      height: 180px;
      border-radius: 50%;
      object-fit: cover;
      border: 4px solid #4CAF50;
      box-shadow: 0 0 20px rgba(76, 175, 80, 0.3);
    }
    .edit-avatar-btn {
      position: absolute;
      bottom: 10px;
      right: 10px;
      background: #4CAF50;
      border: none;
      border-radius: 50%;
      padding: 0.8rem;
      color: white;
      cursor: pointer;
    }
    .profile-info {
      flex: 1;
    }
    .name-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }
    .name-row h1 {
      margin: 0;
      font-size: 2.5rem;
      font-weight: 700;
      color: #fff;
    }
    .email {
      color: #888;
      margin-bottom: 1.5rem;
    }
    .stats {
      display: flex;
      gap: 3rem;
      margin-bottom: 1.5rem;
    }
    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .stat-item strong {
      font-size: 1.5rem;
      color: #4CAF50;
    }
    .stat-item span {
      font-size: 0.9rem;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .bio-section {
      margin-top: 2rem;
      font-size: 1.1rem;
      line-height: 1.6;
    }
    .edit-form textarea {
      width: 100%;
      min-height: 100px;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 1rem;
      color: white;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .edit-form input {
      width: 100%;
      background: rgba(0,0,0,0.2);
      border: 1px solid rgba(255,255,255,0.1);
      padding: 0.8rem 1rem;
      color: white;
      border-radius: 8px;
      margin-bottom: 1rem;
    }
    .btn-primary {
      background: #4CAF50;
      color: white;
      border: none;
      padding: 0.8rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-secondary {
      background: rgba(255,255,255,0.1);
      color: white;
      border: 1px solid rgba(255,255,255,0.2);
      padding: 0.8rem 1.5rem;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-following {
      background: rgba(76, 175, 80, 0.2);
      border: 1px solid #4CAF50;
    }
    .profile-content {
      margin-top: 3rem;
    }
    .section-tabs {
      display: flex;
      gap: 2rem;
      border-bottom: 1px solid rgba(255,255,255,0.1);
      margin-bottom: 2rem;
    }
    .tab {
      padding: 1rem 0.5rem;
      cursor: pointer;
      color: #888;
      font-weight: 600;
    }
    .tab.active {
      color: #4CAF50;
      border-bottom: 2px solid #4CAF50;
    }
    .upload-status {
      font-size: 0.9rem;
      color: #4CAF50;
      margin-bottom: 1rem;
    }
    .hidden {
      display: none;
    }
    .coming-soon {
      padding: 4rem;
      text-align: center;
      background: rgba(42, 46, 51, 0.4);
      border-radius: 12px;
      border: 1px dashed rgba(255,255,255,0.1);
      color: #888;
    }
  `]
})
export class ProfileComponent implements OnInit {
  profile?: UserProfile;
  isOwnProfile = false;
  isEditing = false;
  isSaving = false;
  editData = { bio: '', profilePicture: '' };
  selectedFile: File | null = null;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService,
    private supabaseService: SupabaseService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      const id = params['id'];
      if (id) {
        this.loadProfile(parseInt(id));
      }
    });
  }

  loadProfile(id: number) {
    const backendUser = this.authService.backendUser();
    const currentUserId = backendUser?.id;
    
    this.userService.getProfile(id, currentUserId).subscribe(profile => {
      this.profile = profile;
      this.isOwnProfile = currentUserId === profile.id;
      this.editData = { 
        bio: profile.bio || '', 
        profilePicture: profile.profilePicture || '' 
      };
    });
  }

  toggleEdit() {
    this.isEditing = !this.isEditing;
    if (!this.isEditing) {
      this.selectedFile = null;
    }
  }

  triggerFileInput() {
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.isEditing = true; // Auto-enter edit mode when file selected
    }
  }

  async saveProfile() {
    if (!this.profile) return;
    this.isSaving = true;

    try {
      let profilePicture = this.editData.profilePicture;

      if (this.selectedFile) {
        const fileExt = this.selectedFile.name.split('.').pop();
        const fileName = `profile_${this.profile.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `profiles/${fileName}`;
        
        profilePicture = await this.supabaseService.uploadFile(filePath, this.selectedFile);
      }

      const updatePayload = {
        ...this.editData,
        profilePicture
      };

      this.userService.updateProfile(this.profile.id, updatePayload).subscribe({
        next: (updated) => {
          this.profile = { ...this.profile!, ...updated };
          this.isEditing = false;
          this.isSaving = false;
          this.selectedFile = null;
        },
        error: (err) => {
          console.error('Failed to update profile', err);
          this.isSaving = false;
          alert('Failed to save profile. Please try again.');
        }
      });
    } catch (err) {
      console.error('Error uploading profile picture', err);
      this.isSaving = false;
      alert('Error uploading image. Please check your connection.');
    }
  }

  toggleFollow() {
    if (!this.profile) return;
    const currentUserId = this.authService.backendUser()?.id;
    if (!currentUserId) return;
    
    if (this.profile.isFollowing) {
      this.userService.unfollowUser(currentUserId, this.profile.id).subscribe(() => {
        if (this.profile) {
          this.profile.isFollowing = false;
          this.profile._count.followedBy--;
        }
      });
    } else {
      this.userService.followUser(currentUserId, this.profile.id).subscribe(() => {
        if (this.profile) {
          this.profile.isFollowing = true;
          this.profile._count.followedBy++;
        }
      });
    }
  }
}
