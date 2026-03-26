import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface VouchResponse {
  vouchCount: number;
}

export interface CheckVouchResponse {
  hasVouched: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class VouchService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiBaseUrl}/vouches`;

  toggleVouch(type: 'USER' | 'LISTING', targetId: number, isVouching: boolean): Observable<VouchResponse> {
    if (isVouching) {
      return this.http.post<VouchResponse>(this.apiUrl, { type, targetId });
    } else {
      return this.http.delete<VouchResponse>(this.apiUrl, { body: { type, targetId } });
    }
  }

  checkVouch(type: 'USER' | 'LISTING', targetId: number): Observable<CheckVouchResponse> {
    return this.http.get<CheckVouchResponse>(`${this.apiUrl}/check?type=${type}&targetId=${targetId}`);
  }
}
