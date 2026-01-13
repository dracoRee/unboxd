import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  isFollowing?: boolean;
  _count: {
    followedBy: number;
    following: number;
    collection: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000'; // Fallback to localhost if environment not updated

  constructor(private http: HttpClient) {}

  syncUser(email: string, name?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users/sync`, { email, name });
  }

  getProfile(userId: number, currentUserId?: number): Observable<UserProfile> {
    const url = `${this.apiUrl}/users/profile/${userId}${currentUserId ? `?currentUserId=${currentUserId}` : ''}`;
    return this.http.get<UserProfile>(url);
  }

  updateProfile(userId: number, data: { name?: string; bio?: string; profilePicture?: string }): Observable<UserProfile> {
    return this.http.patch<UserProfile>(`${this.apiUrl}/users/profile`, { userId, ...data });
  }

  followUser(followerId: number, targetId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/follow/${targetId}`, { followerId });
  }

  unfollowUser(followerId: number, targetId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/users/unfollow/${targetId}`, { followerId });
  }

  getFollowers(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${userId}/followers`);
  }

  getFollowing(userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/${userId}/following`);
  }
}
