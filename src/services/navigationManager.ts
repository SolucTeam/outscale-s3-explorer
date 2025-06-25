
export class NavigationManager {
  private static readonly STORAGE_KEY = 'navigation-state';
  
  static saveCurrentBucket(bucketName: string | null): void {
    if (bucketName) {
      localStorage.setItem(`${this.STORAGE_KEY}-bucket`, bucketName);
    } else {
      localStorage.removeItem(`${this.STORAGE_KEY}-bucket`);
    }
  }
  
  static getCurrentBucket(): string | null {
    return localStorage.getItem(`${this.STORAGE_KEY}-bucket`);
  }
  
  static saveCurrentPath(path: string): void {
    if (path) {
      localStorage.setItem(`${this.STORAGE_KEY}-path`, path);
    } else {
      localStorage.removeItem(`${this.STORAGE_KEY}-path`);
    }
  }
  
  static getCurrentPath(): string {
    return localStorage.getItem(`${this.STORAGE_KEY}-path`) || '';
  }
  
  static saveRedirectAfterLogin(path: string): void {
    localStorage.setItem(`${this.STORAGE_KEY}-redirect`, path);
  }
  
  static getRedirectAfterLogin(): string | null {
    const redirect = localStorage.getItem(`${this.STORAGE_KEY}-redirect`);
    this.clearRedirectAfterLogin();
    return redirect;
  }
  
  static clearRedirectAfterLogin(): void {
    localStorage.removeItem(`${this.STORAGE_KEY}-redirect`);
  }
  
  static clearAll(): void {
    localStorage.removeItem(`${this.STORAGE_KEY}-bucket`);
    localStorage.removeItem(`${this.STORAGE_KEY}-path`);
    localStorage.removeItem(`${this.STORAGE_KEY}-redirect`);
  }
}
