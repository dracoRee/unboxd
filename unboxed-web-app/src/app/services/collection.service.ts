import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SeriesProgress, AIRecognitionResult } from '../models/collection.model';

@Injectable({
  providedIn: 'root'
})
export class CollectionService {
  private apiUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  getUserCollection(userId: number): Observable<SeriesProgress[]> {
    return this.http.get<SeriesProgress[]>(`${this.apiUrl}/collection/${userId}`);
  }

  scanCollectible(image: File): Observable<AIRecognitionResult> {
    const formData = new FormData();
    formData.append('image', image);
    return this.http.post<AIRecognitionResult>(`${this.apiUrl}/ai/recognize`, formData);
  }

  addToCollection(userId: number, collectibleId: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/collection/add`, { userId, collectibleId });
  }
}
