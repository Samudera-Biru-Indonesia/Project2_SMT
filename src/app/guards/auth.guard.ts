import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  private role: string;
  private adminCode: string;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {
    
    this.role = localStorage.getItem('savedRole') || '';
    this.adminCode = localStorage.getItem('adminCode') || '';
  }

  canActivate(route: ActivatedRouteSnapshot): boolean {

    const expectedRole = route.data['expectedRole'] || 'satpam';

    if (this.role.trim() === 'satpam' && this.authService.isAuthenticated() && this.role.trim() === expectedRole) {
      return true;
    } else if (this.role.trim() === 'admin' && this.adminCode.trim() && this.role.trim() === expectedRole){
      return true;
    } else {
      alert('Anda tidak memiliki akses halaman ini. Mohon login sesuai akses terlebih dahulu.');
      console.log(localStorage.getItem('savedRole'));
      localStorage.removeItem('savedRole' );
      this.router.navigate(['/login']);
      return false;
    }
  }
}
