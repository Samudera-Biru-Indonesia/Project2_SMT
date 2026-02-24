import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-force-login',
  standalone: true,
  template: ''
})
export class ForceLoginComponent implements OnInit {
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    const secret = this.route.snapshot.paramMap.get('secret') || '';
    const site = this.route.snapshot.paramMap.get('site') || '';

    if (!secret || !site) {
      this.router.navigate(['/login']);
      return;
    }

    if (secret !== environment.forceLoginSecret) {
      this.router.navigate(['/login']);
      return;
    }

    this.authService.forceLogin(site);
    this.router.navigate(['/trip-selection']);
  }
}
