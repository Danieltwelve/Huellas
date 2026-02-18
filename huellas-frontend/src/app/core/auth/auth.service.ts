import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);

  readonly user$: Observable<User | null> = authState(this.auth);

  constructor() {}

  /**
   * Inicia sesión con Google usando una ventana emergente
   */
  async loginWithGoogle(): Promise<User> {
    try {
      this.auth.useDeviceLanguage();
      const provider = new GoogleAuthProvider();

      const credential = await signInWithPopup(this.auth, provider);

      console.log('Login exitoso:', credential.user.email);
      return credential.user;
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  /**
   * Cierra la sesión actual
   */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      console.log('Sesión cerrada');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      throw error;
    }
  }
}
