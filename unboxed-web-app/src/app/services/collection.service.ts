import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SeriesProgress, AIRecognitionResult } from '../models/collection.model';
import { environment } from '@/environments/environment';

const host_url = environment.apiBaseUrl;

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private apiUrl = host_url;

  constructor(private http: HttpClient) {}

  getUserCollection(userId: number): Observable<SeriesProgress[]> {
    return this.http.get<SeriesProgress[]>(`${this.apiUrl}/collection/${userId}`);
  }

  scanCollectible(image: File): Observable<AIRecognitionResult> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<AIRecognitionResult>(`${this.apiUrl}/ai/recognize`, formData);
  }

  addToCollection(userId: number, seriesId: number, imageUrl: string, name?: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/collection/add`, { userId, seriesId, imageUrl, name });
  }

  uploadImage(image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<any>(`${this.apiUrl}/upload`, formData);
  }

  getSeries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/series`);
  }

  getCollectiblesBySeries(seriesId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/collectibles?seriesId=${seriesId}`);
  }

  deleteCollectible(collectibleId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/collection/${collectibleId}`);
  }

  getSeriesCollectibles(seriesId: number, userId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/series/${seriesId}/collectibles/${userId}`);
  }
}
