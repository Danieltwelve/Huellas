import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
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
  apellido: string;
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

      const nombreCompleto = result.user.displayName || '';

      const partesNombre = nombreCompleto.trim().split(' ');
      const nombre = partesNombre[0] || '';
      const apellido = partesNombre.slice(1).join(' ') || '';
      const correo = result.user.email || '';

      await this.sendIdTokenToBackend(idToken, {
        nombre: nombre,
        apellido: apellido,
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

  async sendIdTokenToBackend(
    idToken: string,
    registerData?: RegisterUserAttributes,
  ): Promise<void> {
    await fetch(`${environment.apiUrlBackend}/auth/google`, {
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

  async signUpWithEmailAndPassword(
    credential: Credentials,
    registerData: RegisterUserAttributes,
  ): Promise<UserCredential> {
    const userCredential = await createUserWithEmailAndPassword(
      this.auth,
      credential.correo,
      credential.contraseña,
    );

    const idToken = await userCredential.user.getIdToken();
    await this.sendIdTokenToBackend(idToken, registerData);
    await userCredential.user.getIdToken(true);
    const refreshedTokenResult = await userCredential.user.getIdTokenResult();
    this.claimsSubject.next((refreshedTokenResult.claims as AccessClaims) ?? {});

    return userCredential;
  }

  logInWithEmailAndPassword(credential: Credentials) {
    return signInWithEmailAndPassword(this.auth, credential.correo, credential.contraseña);
  }
}
