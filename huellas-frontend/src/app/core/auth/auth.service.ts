import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { GoogleAuthProvider, signInWithPopup, signOut, User } from 'firebase/auth';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

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
  async loginWithGoogle() {
    try {
      this.auth.useDeviceLanguage();
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(this.auth, provider);
      const credentials = GoogleAuthProvider.credentialFromResult(result);
      const idToken = credentials?.idToken;
      await this.sendIdTokenToBackend(idToken);
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  async sendIdTokenToBackend(idToken: string | undefined): Promise<void> {
    fetch(`${environment.apiUrlBackend}/auth/google`, {
      method: 'POST',
      body: JSON.stringify({ idToken }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }).then((response) =>
      response
        .json()
        .then(function (result) {
          console.log('Respuesta del backend:', result);
        })
        .catch(function (error) {
          console.error('Error al parsear la respuesta del backend:', error);
        }),
    );
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
