import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TradeService } from '../../services/trade.service';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css'
})
export class NavbarComponent {
  searchQuery: string = '';
  showProfileMenu = false;
  isMobile: boolean = false;

  constructor(
    private tradeService: TradeService,
    public authService: AuthService,
    private router: Router
  ) {
    this.updateIsMobile();
  }

  ngOnInit() {
    window.addEventListener('resize', this.updateIsMobile);
    this.updateIsMobile();
  }

  ngOnDestroy() {
    window.removeEventListener('resize', this.updateIsMobile);
  }

  updateIsMobile = () => {
    this.isMobile = window.innerWidth < 768;
  };

  onSearchChange() {
    this.tradeService.updateFilters({ search: this.searchQuery });
  }

  resetFilters() {
    this.searchQuery = ''; // Clear local search input
    this.tradeService.resetFilters();
  }

  logout() {
    this.authService.logout();
    this.showProfileMenu = false;
  }

  onSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.resetFilters();
      window.location.href = '/browse';
    }
  }

  onSearchEnter() {
    // Do not resetFilters here, just update filters and navigate
    this.tradeService.updateFilters({ search: this.searchQuery });
    this.router.navigate(['/browse']);
  }
}
