import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-not-found',
  templateUrl: './not-found.html',
})
export class NotFound {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected goHome(): void {
    void this.router.navigateByUrl(this.authService.isAuthenticated() ? '/dashboard' : '/');
  }
}
