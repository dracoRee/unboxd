import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReportPayload {
  reporterId: number;
  reportedUserId?: number;
  listingId?: number;
  reason: string;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/reports`;

  submitReport(payload: ReportPayload): Observable<any> {
    return this.http.post(this.apiUrl, payload);
  }
}
