import { Component, effect, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { SupabaseService } from '../../services/supabase.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css',
})
export class SettingsComponent {
  loading = signal(true);
  loadError = signal(false);

  saving = signal(false);
  saveError = signal<string | null>(null);
  saveSuccess = signal(false);

  uploadingAvatar = signal(false);

  changePasswordSending = signal(false);
  changePasswordSent = signal(false);
  changePasswordError = signal<string | null>(null);

  // Account details form — only fields PATCH /users/profile actually persists.
  formData = { name: '', username: '' };

  // Visual-only for v1: no shippingCity field exists on the User/PublicUser
  // model yet, so this never gets sent anywhere.
  shippingCityDraft = '';

  // Visual-only for v1: no notification-preference fields exist on the
  // backend. Local component state only — resets on reload/navigation.
  notifPrefs = {
    tradeOffers: true,
    directMessages: true,
    wishlistMatches: true,
    dropsAndNews: false,
  };

  constructor(
    public authService: AuthService,
    private userService: UserService,
    private supabaseService: SupabaseService,
  ) {
    effect(() => {
      const user = this.authService.backendUser();
      if (user) {
        this.formData = { name: user.name || '', username: user.username || '' };
        this.loading.set(false);
        this.loadError.set(false);
      }
    });

    setTimeout(() => {
      if (!this.authService.backendUser()) {
        this.loading.set(false);
        this.loadError.set(true);
      }
    }, 4000);
  }

  get initials(): string {
    const name = this.authService.backendUser()?.name || '';
    return name.trim().split(/\s+/).slice(0, 2).map((p: string) => p[0]?.toUpperCase()).join('') || '?';
  }

  cancelChanges() {
    const user = this.authService.backendUser();
    if (user) this.formData = { name: user.name || '', username: user.username || '' };
    this.saveError.set(null);
    this.saveSuccess.set(false);
  }

  saveAccountDetails() {
    const user = this.authService.backendUser();
    if (!user) return;
    this.saving.set(true);
    this.saveError.set(null);
    this.saveSuccess.set(false);

    this.userService.updateProfile(user.id, {
      name: this.formData.name,
      username: this.formData.username,
    }).subscribe({
      next: (updated) => {
        this.authService.backendUser.set({ ...user, name: updated.name, username: updated.username });
        this.saving.set(false);
        this.saveSuccess.set(true);
      },
      error: (err) => {
        this.saving.set(false);
        this.saveError.set(err.error?.error || 'Failed to save changes. Please try again.');
      }
    });
  }

  triggerFileInput() {
    document.getElementById('avatar-file-input')?.click();
  }

  async onAvatarFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    const user = this.authService.backendUser();
    if (!file || !user) return;

    this.uploadingAvatar.set(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `profiles/profile_${user.id}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const profilePicture = await this.supabaseService.uploadFile(filePath, file);

      this.userService.updateProfile(user.id, { profilePicture }).subscribe({
        next: () => {
          this.authService.backendUser.set({ ...user, profilePicture });
          this.uploadingAvatar.set(false);
        },
        error: () => {
          this.uploadingAvatar.set(false);
          alert('Failed to save photo. Please try again.');
        }
      });
    } catch {
      this.uploadingAvatar.set(false);
      alert('Error uploading image. Please check your connection.');
    }
  }

  removeAvatar() {
    const user = this.authService.backendUser();
    if (!user || !confirm('Remove your profile photo?')) return;

    this.userService.updateProfile(user.id, { profilePicture: '' }).subscribe({
      next: () => this.authService.backendUser.set({ ...user, profilePicture: '' }),
      error: () => alert('Failed to remove photo. Please try again.')
    });
  }

  sendPasswordReset() {
    const email = this.authService.currentUser()?.email;
    if (!email) return;
    this.changePasswordSending.set(true);
    this.changePasswordError.set(null);
    this.authService.forgotPassword(email).subscribe({
      next: () => {
        this.changePasswordSending.set(false);
        this.changePasswordSent.set(true);
      },
      error: (err) => {
        this.changePasswordSending.set(false);
        this.changePasswordError.set(err.error?.error || 'Failed to send reset link.');
      }
    });
  }

  payoutsComingSoon() {
    alert('Marketplace payouts are coming in a future update.');
  }

  retryLoad() {
    window.location.reload();
  }
}
