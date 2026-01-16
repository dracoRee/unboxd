import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { UserService, UserProfile, UserListing } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { SupabaseService } from '../../services/supabase.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})

export class ProfileComponent implements OnInit {
  profile?: UserProfile;
  isOwnProfile = false;
  isEditing = false;
  isSaving = false;
  editData = { bio: '', profilePicture: '' };
  selectedFile: File | null = null;
  userListings: UserListing[] = [];
  activeTab: 'collection' | 'activity' | 'listings' = 'collection';

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
      
      this.loadListings(id);
    });
  }

  loadListings(userId: number) {
    this.userService.getUserListings(userId).subscribe(listings => {
      this.userListings = listings;
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
