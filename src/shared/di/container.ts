// Dependency Injection Container for DDD + Clean Architecture

// Import repositories
import { AuthRepository } from '../../modules/auth/repositories/auth.repository';
import { IAuthRepository } from '../../modules/auth/repositories/IAuthRepository';

// Import use cases
import {
  RegisterUseCase,
  LoginUseCase,
  LogoutUseCase,
  ForgotPasswordUseCase,
  ResetPasswordUseCase,
  RefreshTokenUseCase,
  GetCurrentUserUseCase
} from '../../modules/auth/useCases';

// Type definitions for container
export type Constructor<T = any> = new (...args: any[]) => T;
export type Factory<T = any> = () => T;

export type ServiceIdentifier = string | symbol | Constructor;

// Service container type
interface ServiceContainer {
  [key: string]: any;
}

// EventBus type
interface EventBus {
  emit(event: string, data: any): Promise<void>;
  on(event: string, handler: (data: any) => Promise<void>): void;
  off(event: string, handler: (data: any) => Promise<void>): void;
}

// Class for DI Container
class Container {
  private services: Map<ServiceIdentifier, any> = new Map();
  private factories: Map<ServiceIdentifier, Factory> = new Map();

  // Register a singleton service
  singleton<T>(id: ServiceIdentifier, instance: T): void {
    this.services.set(id, instance);
  }

  // Register a factory for transient services
  transient<T>(id: ServiceIdentifier, factory: Factory<T>): void {
    this.factories.set(id, factory);
  }

  // Resolve a service
  resolve<T>(id: ServiceIdentifier): T {
    // Check for singleton
    if (this.services.has(id)) {
      return this.services.get(id);
    }

    // Check for factory
    const factory = this.factories.get(id);
    if (factory) {
      return factory();
    }

    throw new Error(`Service ${String(id)} not found in container`);
  }

  // Check if service is registered
  has(id: ServiceIdentifier): boolean {
    return this.services.has(id) || this.factories.has(id);
  }

  // Clear all services (useful for testing)
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

// Create global container instance
export const container = new Container();

// Initialize container with services
export function initializeContainer(): void {
  // ==================== REPOSITORIES ====================
  
  // Auth Repository (singleton)
  container.singleton<IAuthRepository>('IAuthRepository', new AuthRepository());

  // ==================== USE CASES ====================

  // Auth Use Cases (factory - new instance each time)
  container.transient('RegisterUseCase', () => {
    const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
    return new RegisterUseCase(authRepository);
  });

  container.transient('LoginUseCase', () => {
    const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
    return new LoginUseCase(authRepository);
  });

  container.transient('LogoutUseCase', () => {
    const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
    return new LogoutUseCase(authRepository);
  });

  container.transient('ForgotPasswordUseCase', () => {
    const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
    return new ForgotPasswordUseCase(authRepository);
  });

  container.transient('ResetPasswordUseCase', () => {
    const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
    return new ResetPasswordUseCase(authRepository);
  });

  container.transient('RefreshTokenUseCase', () => {
    const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
    return new RefreshTokenUseCase(authRepository);
  });

  container.transient('GetCurrentUserUseCase', () => {
    const authRepository = container.resolve<IAuthRepository>('IAuthRepository');
    return new GetCurrentUserUseCase(authRepository);
  });

  console.log('✅ DI Container initialized');
}

// Helper functions to get use cases
export const useCases = {
  get registerUseCase(): RegisterUseCase {
    return container.resolve<RegisterUseCase>('RegisterUseCase');
  },
  
  get loginUseCase(): LoginUseCase {
    return container.resolve<LoginUseCase>('LoginUseCase');
  },
  
  get logoutUseCase(): LogoutUseCase {
    return container.resolve<LogoutUseCase>('LogoutUseCase');
  },
  
  get forgotPasswordUseCase(): ForgotPasswordUseCase {
    return container.resolve<ForgotPasswordUseCase>('ForgotPasswordUseCase');
  },
  
  get resetPasswordUseCase(): ResetPasswordUseCase {
    return container.resolve<ResetPasswordUseCase>('ResetPasswordUseCase');
  },
  
  get refreshTokenUseCase(): RefreshTokenUseCase {
    return container.resolve<RefreshTokenUseCase>('RefreshTokenUseCase');
  },
  
  get getCurrentUserUseCase(): GetCurrentUserUseCase {
    return container.resolve<GetCurrentUserUseCase>('GetCurrentUserUseCase');
  }
};

// Export repository helper
export const repositories = {
  get authRepository(): IAuthRepository {
    return container.resolve<IAuthRepository>('IAuthRepository');
  }
};

export default container;
