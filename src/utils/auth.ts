'use client'
export interface User {
    id: string
    email: string
    name?: string
    role?: string
  }
  
  export interface Company {
    id: string
    name: string
    code: string
  }
  
  export function setUser(user: User) {
    if (typeof window === 'undefined') return
    localStorage.setItem('user', JSON.stringify(user))
  }
  
  export function getUser(): User | null {
    if (typeof window === 'undefined') return null
    try {
      const userStr = localStorage.getItem('user')
      if (!userStr) return null
      return JSON.parse(userStr)
    } catch (error) {
      console.error('Error parsing user data:', error)
      return null
    }
  }
  

  // should this get company or organisation ? if we want to get org, then we already have the subdomain so is it needed?
  export function setCompany(company: Company) {
    if (typeof window === 'undefined') return
    localStorage.setItem('selectedCompany', JSON.stringify(company))
  }
  
  export function getCompany(): Company | null {
    if (typeof window === 'undefined') return null
    try {
      const companyStr = localStorage.getItem('selectedCompany')
      if (!companyStr) return null
      return JSON.parse(companyStr)
    } catch (error) {
      console.error('Error parsing company data:', error)
      return null
    }
  }
  
  // export function isAuthenticated(): boolean {
  //   if (typeof window === 'undefined') return false
  //   const user = getUser()
  //   return user !== null
  // }
  
  export function logout() {
    if (typeof window === 'undefined') return
    // Clear localStorage
    localStorage.removeItem('user')
    localStorage.removeItem('user_id')
    localStorage.removeItem('subdomain')
    localStorage.removeItem('selectedCompany')
    localStorage.removeItem('sidebar_selectedCompany')
    // Clear cookies
    document.cookie = 'access_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'portal_permission_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    // Redirect to home
    window.location.href = '/'
  }

  /**
   * Auto-logout on API auth errors (401/403) is DISABLED.
   *
   * This previously called logout() and redirected on a 401/403 response.
   * It is now a no-op that always returns false so every caller
   * (`if (handleAuthError(status)) return;`) simply continues normally and the
   * user is never redirected/logged out from a failed request.
   *
   * @param _status - HTTP status code from API response (ignored)
   * @returns always false (error not handled here)
   */
  export function handleAuthError(_status: number): boolean {
    return false
  }

  export function urlcheck() {
    let compshow = 1;
    let currentHost = "";
  
    if (typeof window !== 'undefined') {
      currentHost = window.location.host; // Get current domain on client side
      console.log("Detected Host:", currentHost, window.location.href);
      
      if (currentHost === "admin.vowerp.co.in" || currentHost === "localhost:3001") {
        compshow = 1;
      } else {
        compshow = 2;
      }
    }
  
    return { compshow, currentHost };
  }

// if for testing should we remove this now ?
  export function urlfixed() {
    const subdomain = "vowsls3.vowerp.co.in"; 
   
    return { subdomain}
  }