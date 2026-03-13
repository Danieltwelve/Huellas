import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
  UserCredential,
} from 'firebase/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environments';

export interface AccessClaims {
  roles?: string[];
  canViewArchivos?: boolean;
  canSubmitEnvios?: boolean;
  externalSystemUid?: string;
  [key: string]: unknown;
}

export interface Credentials {
  correo: string;
  contraseña: string;
}

export interface RegisterUserAttributes {
  nombre: string;
  correo: string;
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

      const nombre = result.user.displayName || '';
      const correo = result.user.email || '';

      await this.sendIdTokenToBackend(idToken, {
        nombre: nombre,
        correo: correo,
      });

      await result.user.getIdToken(true);
      const refreshedTokenResult = await result.user.getIdTokenResult();
      this.claimsSubject.next((refreshedTokenResult.claims as AccessClaims) ?? {});

      console.log('Inicio de sesión exitoso con Google:', result.user);
      return result.user;
    } catch (error) {
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  /**
   * Inicia sesión con Microsoft usando una ventana emergente
   */
  async loginWithMicrosoft() {
    try {
      this.auth.useDeviceLanguage();
      const provider = new OAuthProvider('microsoft.com');
      const result = await signInWithPopup(this.auth, provider);
      const idToken = await result.user.getIdToken();

      const nombre = result.user.displayName || '';
      const correo = result.user.email || '';

      await this.sendIdTokenToBackend(idToken, {
        nombre: nombre,
        correo: correo,
      });

      await result.user.getIdToken(true);
      const refreshedTokenResult = await result.user.getIdTokenResult();
      this.claimsSubject.next((refreshedTokenResult.claims as AccessClaims) ?? {});

      console.log('Inicio de sesión exitoso con Microsoft:', result.user);
      return result.user;
    } catch (error) {
      console.error('Error al iniciar sesión con Microsoft:', error);
      throw error;
    }
  }

  async sendIdTokenToBackend(
    idToken: string,
    registerData?: RegisterUserAttributes,
  ): Promise<void> {
    try {
      const response = await fetch(`${environment.apiUrlBackend}/auth/social`, {
        method: 'POST',
        body: JSON.stringify({
          idToken,
          ...registerData,
        }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(`El backend rechazó la petición: ${response.status} - ${errorPayload}`);
      }

      const data = await response.json();
      console.log('✅ Conexión con backend exitosa. Respuesta:', data);

      if (data.accessToken) {
        localStorage.setItem('nestjs_token', data.accessToken);
      }
    } catch (error) {
      console.error('❌ Error de conexión con el backend:', error);
      throw error;
    }
  }

  async sendEmailTokenToBackend(
    idToken: string,
    registerData?: RegisterUserAttributes,
  ): Promise<void> {
    try {
      const response = await fetch(`${environment.apiUrlBackend}/auth/sync-email`, {
        // <-- NUEVA RUTA
        method: 'POST',
        body: JSON.stringify({
          idToken,
          ...registerData,
        }),
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        const errorPayload = await response.text();
        throw new Error(`El backend rechazó la petición: ${response.status} - ${errorPayload}`);
      }

      const data = await response.json();
      if (data.accessToken) {
        localStorage.setItem('nestjs_token', data.accessToken);
      }
    } catch (error) {
      console.error('Error al sincronizar usuario de email:', error);
      throw error;
    }
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

  async sendVerificationEmail(user: User): Promise<void> {
    await sendEmailVerification(user);
  }

  async signUpWithEmailAndPassword(
    credential: Credentials,
    registerData: RegisterUserAttributes,
  ): Promise<void> {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      credential.correo,
      credential.contraseña,
    );

    await updateProfile(userCredential.user, {
      displayName: registerData.nombre.trim(),
    });

    await this.sendVerificationEmail(userCredential.user);
    const idToken = await userCredential.user.getIdToken();
    await this.sendEmailTokenToBackend(idToken, registerData);

    await signOut(this.auth);
    this.claimsSubject.next({});
    localStorage.removeItem('nestjs_token');
  }

  async logInWithEmailAndPassword(credential: Credentials): Promise<UserCredential> {
    const userCredential = await signInWithEmailAndPassword(
      this.auth,
      credential.correo,
      credential.contraseña,
    );

    if (!userCredential.user.emailVerified) {
      await signOut(this.auth);
      this.claimsSubject.next({});
      throw new Error('EMAIL_NOT_VERIFIED');
    }

    const correo = userCredential.user.email ?? credential.correo;
    const fallbackNombre = correo.split('@')[0] || '';
    const registerData: RegisterUserAttributes = {
      nombre: userCredential.user.displayName?.trim() || fallbackNombre,
      correo,
    };

    const idToken = await userCredential.user.getIdToken();
    await this.sendEmailTokenToBackend(idToken, registerData);
    await userCredential.user.getIdToken(true);
    const refreshedTokenResult = await userCredential.user.getIdTokenResult();
    this.claimsSubject.next((refreshedTokenResult.claims as AccessClaims) ?? {});

    console.log('Inicio de sesión exitoso con email y contraseña:', userCredential.user);
    return userCredential;
  }
}
