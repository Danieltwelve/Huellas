import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface AccessClaims {
  roles?: string[];
  canViewArchivos?: boolean;
  canSubmitEnvios?: boolean;
  externalSystemUid?: string;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  readonly user$: Observable<User | null> = authState(this.auth);
  private claimsSubject = new BehaviorSubject<AccessClaims>({});
  readonly claims$ = this.claimsSubject.asObservable();

  constructor() {
    this.user$.subscribe(async (user) => {
      if (!user) {
        this.claimsSubject.next({});
        return;
      }

      const tokenResult = await user.getIdTokenResult();
      this.claimsSubject.next((tokenResult.claims as AccessClaims) ?? {});
    });
  }

  hasClaim(claimName: keyof AccessClaims): boolean {
    return Boolean(this.claimsSubject.value[claimName]);
  }

  hasAnyRole(allowedRoles: string[]): boolean {
    const currentRoles = this.claimsSubject.value.roles ?? [];
    return allowedRoles.some((role) => currentRoles.includes(role));
  }

  /**
   * Inicia sesión con Google usando una ventana emergente
   */
  async loginWithGoogle() {
    try {
      this.auth.useDeviceLanguage();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const idToken = await result.user.getIdToken();
      await this.sendIdTokenToBackend(idToken);
      await result.user.getIdToken(true);
      const refreshedTokenResult = await result.user.getIdTokenResult();
      this.claimsSubject.next((refreshedTokenResult.claims as AccessClaims) ?? {});
      return result.user;
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  async sendIdTokenToBackend(idToken: string): Promise<void> {
    await fetch(`${environment.apiUrlBackend}/auth/google`, {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });
  }
  /**
   * Cierra la sesión actual
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.claimsSubject.next({});
      console.log('Sesión cerrada');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }
}
