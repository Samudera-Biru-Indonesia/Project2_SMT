import { Injectable } from '@angular/core';
import { CanActivate, Router, ActivatedRouteSnapshot } from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot): boolean {
    // Read from localStorage every time canActivate is called to get fresh values
    const role = localStorage.getItem('savedRole') || '';
    const adminCode = localStorage.getItem('adminCode') || '';
    const expectedRole = route.data['expectedRole'] || 'satpam';

    console.log('Expected Role:', expectedRole);
    console.log('User Role:', role);
    console.log('Admin code:', adminCode);
    console.log('localStorage adminCode:', localStorage.getItem('adminCode'));

    if (role.trim() === 'satpam' && this.authService.isAuthenticated() && role.trim() === expectedRole) {
      return true;
    } else if (role.trim() === 'admin' && adminCode.trim() && role.trim() === expectedRole){
      return true;
    } else {
      alert('Anda tidak memiliki akses halaman ini. Mohon login sesuai akses terlebih dahulu.');
      console.log('Access denied. Clearing localStorage...');
      localStorage.removeItem('savedRole');
      localStorage.removeItem('adminCode');
      this.router.navigate(['/login']);
      return false;
    }
  }
}
