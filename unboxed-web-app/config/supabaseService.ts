import { Injectable }  from '@angular/core';
import { createClient , SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );
  }

  async fetchData(tableName: string) {
    const { data, error } = await this.supabase
      .from(tableName)
      .select('*');

    if (error) throw error;
    return data;
  }

  async testConnection() {
    console.log('Testing Supabase connection...');
    const { data, error } = await this.supabase.from('test_items').select('count');
    console.log('Result:', { data, error });
    return { data, error };
  }
}
