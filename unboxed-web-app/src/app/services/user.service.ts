import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@/environments/environment';

const host_url = environment.apiBaseUrl;

export interface UserProfile {
  id: number;
  name: string;
  username: string;
  email: string;
  bio?: string;
  profilePicture?: string;
  isFollowing?: boolean;
  _count: {
    User_A: number;
    User_B: number;
    collection: number;
    listings: number;
  };
}

export interface UserListing {
  id: number;
  userId: number;
  collectibleId: number | null;
  serialNumber: string;
  demoVideoUrl: string;
  receiptUrl: string;
  imageUrl?: string;
  title: string;
  description: string;
  condition: string;
  referenceValue?: number;
  dealMethods?: string[];
  seriesName?: string;
  isAvailableForTrade: boolean;
  createdAt: string;
  updatedAt: string;
  collectible?: {
    name: string;
    rarity: string;
    series: { name: string };
  };
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = host_url; // Fallback to localhost if environment not updated

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

  listingsBuffer: UserListing[] = []; 
  getUserListings(userId: number): Observable<UserListing[]> {
    return this.http.get<UserListing[]>(`${this.apiUrl}/users/listings/${userId}`);
  }

  getListing(id: number): Observable<UserListing> {
    return this.http.get<UserListing>(`${this.apiUrl}/listings/${id}`);
  }

  updateListing(id: number, activeData: FormData): Observable<UserListing> {
    return this.http.patch<UserListing>(`${this.apiUrl}/listings/${id}`, activeData);
  }
}
