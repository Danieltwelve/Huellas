import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import {
  AuthCredential,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  linkWithCredential,
  OAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
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
  canManageUsers?: boolean;
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

export interface EmailStatusResponse {
  exists: boolean;
  emailVerified?: boolean;
}

interface BackendSyncResponse {
  status: 'ok';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private auth: Auth = inject(Auth);
  readonly user$: Observable<User | null> = authState(this.auth);
  private claimsSubject = new BehaviorSubject<AccessClaims>({});
  readonly claims$ = this.claimsSubject.asObservable();
  private pendingMicrosoftLinkEmail: string | null = null;
  private pendingMicrosoftCredential: AuthCredential | null = null;

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
      if (this.isPopupCancelledByUser(error)) {
        return null;
      }
      console.error('Error al iniciar sesión con Google:', error);
      throw error;
    }
  }

  /**
   * Inicia sesión con Microsoft usando una ventana emergente y vincula cuentas si es necesario
   */
  async loginWithMicrosoft() {
    try {
      this.auth.useDeviceLanguage();
      const provider = new OAuthProvider('microsoft.com');
      provider.setCustomParameters({ prompt: 'select_account' });

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
    } catch (error: any) {
      if (this.isPopupCancelledByUser(error)) {
        return null;
      }
      if (error.code === 'auth/account-exists-with-different-credential') {
        const pendingCredential = OAuthProvider.credentialFromError(error);
        const email = error.customData?.email;

        if (!email || !pendingCredential) {
          throw error;
        }

        this.pendingMicrosoftLinkEmail = email;
        this.pendingMicrosoftCredential = pendingCredential;
        throw new Error('MICROSOFT_LINK_REQUIRED');
      } else {
        console.error('Error al iniciar sesión con Microsoft:', error);
        throw error;
      }
    }
  }

  getPendingMicrosoftLinkEmail(): string | null {
    return this.pendingMicrosoftLinkEmail;
  }

  clearPendingMicrosoftLink(): void {
    this.pendingMicrosoftLinkEmail = null;
    this.pendingMicrosoftCredential = null;
  }

  async linkMicrosoftWithPassword(password: string): Promise<User> {
    if (!this.pendingMicrosoftLinkEmail || !this.pendingMicrosoftCredential) {
      throw new Error('MICROSOFT_LINK_NOT_READY');
    }

    try {
      const signInResult = await signInWithEmailAndPassword(
        this.auth,
        this.pendingMicrosoftLinkEmail,
        password,
      );

      await linkWithCredential(signInResult.user, this.pendingMicrosoftCredential);

      const idToken = await signInResult.user.getIdToken();
      const nombre = signInResult.user.displayName || '';
      const correo = signInResult.user.email || '';

      await this.sendIdTokenToBackend(idToken, {
        nombre,
        correo,
      });

      await signInResult.user.getIdToken(true);
      const refreshedTokenResult = await signInResult.user.getIdTokenResult();
      this.claimsSubject.next((refreshedTokenResult.claims as AccessClaims) ?? {});
      this.clearPendingMicrosoftLink();

      return signInResult.user;
    } catch (error: any) {
      if (
        error?.code === 'auth/wrong-password' ||
        error?.code === 'auth/invalid-credential' ||
        error?.code === 'auth/invalid-login-credentials'
      ) {
        throw new Error('MICROSOFT_LINK_INVALID_PASSWORD');
      }

      console.error('Error al vincular cuenta de Microsoft:', error);
      throw new Error('MICROSOFT_LINK_FAILED');
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

      const data = (await response.json()) as BackendSyncResponse;
      console.log('✅ Conexión con backend exitosa. Respuesta:', data);

      if (data.status !== 'ok') {
        throw new Error('Respuesta inesperada del backend durante la sincronización');
      }
    } catch (error) {
      console.error('❌ Error de conexión con el backend:', error);
      await this.rollbackIncompleteSession();
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

      const data = (await response.json()) as BackendSyncResponse;

      if (data.status !== 'ok') {
        throw new Error('Respuesta inesperada del backend durante la sincronización');
      }
    } catch (error) {
      console.error('Error al sincronizar usuario de email:', error);
      await this.rollbackIncompleteSession();
      throw error;
    }
  }

  private async rollbackIncompleteSession(): Promise<void> {
    try {
      if (this.auth.currentUser) {
        await signOut(this.auth);
      }
    } catch (rollbackError) {
      console.error('No fue posible cerrar sesión durante el rollback:', rollbackError);
    } finally {
      this.claimsSubject.next({});
      this.clearPendingMicrosoftLink();
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

  async sendPasswordResetEmail(email: string): Promise<void> {
    return sendPasswordResetEmail(this.auth, email);
  }

  async sendVerificationEmail(user: User): Promise<void> {
    await sendEmailVerification(user);
  }

  async signUpWithEmailAndPassword(
    credential: Credentials,
    registerData: RegisterUserAttributes,
  ): Promise<void> {
    try {
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
    } catch (error: unknown) {
      await this.rollbackIncompleteSession();

      const code = this.getFirebaseAuthErrorCode(error);

      if (code === 'auth/email-already-in-use') {
        const e = new Error('EMAIL_ALREADY_IN_USE');
        (e as any).code = 'EMAIL_ALREADY_IN_USE';
        throw e;
      }

      throw error;
    }
  }

  async logInWithEmailAndPassword(credential: Credentials): Promise<UserCredential> {
    const userCredential = await signInWithEmailAndPassword(
      this.auth,
      credential.correo,
      credential.contraseña,
    );

    if (!userCredential.user.emailVerified) {
      // await signOut(this.auth);
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

  async getEmailStatus(email: string): Promise<EmailStatusResponse> {
    const response = await fetch(`${environment.apiUrlBackend}/auth/email-status`, {
      method: 'POST',
      body: JSON.stringify({ email }),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorPayload = await response.text();
      throw new Error(
        `No se pudo consultar el estado del correo: ${response.status} - ${errorPayload}`,
      );
    }

    return (await response.json()) as EmailStatusResponse;
  }

  getPostLoginRoute(): string {
    const claims = this.claimsSubject.value;
    if (this.hasAnyRole(['admin']) || claims.canManageUsers) {
      return '/gestion-usuarios';
    }
    if (this.hasAnyRole(['autor'])) {
      return '/panel-autor';
    }
    if (this.hasAnyRole(['revisor'])) {
      return '/envios';
    }
    return '/';
  }

  private getFirebaseAuthErrorCode(error: unknown): string | null {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const code = (error as any).code;
      return typeof code === 'string' ? code : null;
    }
    return null;
  }

  getFriendlyLoginErrorMessage(error: unknown): string {
    const code = this.getFirebaseAuthErrorCode(error);

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return 'Correo o contraseña incorrectos. Verifica tus datos e inténtalo de nuevo.';
      case 'auth/invalid-email':
        return 'El correo no tiene un formato válido.';
      case 'auth/too-many-requests':
        return 'Se han realizado demasiados intentos. Espera unos minutos e inténtalo de nuevo.';
      case 'auth/network-request-failed':
        return 'No se pudo conectar. Revisa tu internet e inténtalo de nuevo.';
      default:
        return 'No se pudo iniciar sesión. Intenta nuevamente.';
    }
  }

  private isPopupCancelledByUser(error: unknown): boolean {
    const code = this.getFirebaseAuthErrorCode(error);
    return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
  }
}
