import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { normalisePortalPath } from '@/utils/portalPermissions';

export interface MenuItem {
  menu_id: number;
  menu_name: string;
  menu_path: string;
  menu_parent_id: number | null;
  access_type_id?: number | null;
}

export interface Branch {
  branch_id: number;
  branch_name: string;
  menus: MenuItem[];
}

export interface Company {
  co_id: number;
  co_name: string;
  branches: Branch[];
}

interface SidebarContextType {
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  selectedCompany: Company | null;
  setSelectedCompany: React.Dispatch<React.SetStateAction<Company | null>>;
  selectedBranches: number[];
  setSelectedBranches: React.Dispatch<React.SetStateAction<number[]>>;
  expandedMenus: number[];
  setExpandedMenus: React.Dispatch<React.SetStateAction<number[]>>;
  availableMenus: MenuItem[];
  setAvailableMenus: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  parentMenus: MenuItem[];
  setParentMenus: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  menuItems: MenuItem[];
  setMenuItems: React.Dispatch<React.SetStateAction<MenuItem[]>>;
  menuPermissions: Record<string, number>;
  setMenuPermissions: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  hasMenuAccess: (path: string, action?: string) => boolean;
  handleCompanyChange: (companyId: number) => void;
  handleBranchChange: (branchIds: number[]) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export const SidebarProvider = ({ children }: { children: ReactNode }) => {
  // Lazy initializers that read from localStorage on first render (avoids race with persist effects)
  const [companies, setCompanies] = useState<Company[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('sidebar_companies'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    }
    return [];
  });
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('sidebar_selectedCompany'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    }
    return null;
  });
  const [selectedBranches, setSelectedBranches] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('sidebar_selectedBranches'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    }
    return [];
  });
  const [expandedMenus, setExpandedMenus] = useState<number[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('sidebar_expandedMenus'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    }
    return [];
  });
  const [availableMenus, setAvailableMenus] = useState<MenuItem[]>([]);
  const [parentMenus, setParentMenus] = useState<MenuItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    if (typeof window !== 'undefined') {
      try { const s = localStorage.getItem('sidebar_menuItems'); if (s) return JSON.parse(s); } catch { /* ignore */ }
    }
    return [];
  });
  const [menuPermissions, setMenuPermissions] = useState<Record<string, number>>({});

  // Guard flag: skip persisting the initial render to avoid overwriting localStorage before load completes
  const initializedRef = React.useRef(false);
  useEffect(() => {
    initializedRef.current = true;
  }, []);

  // Persist to localStorage on change (guarded: skip first render to avoid overwriting restored values)
  useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem('sidebar_companies', JSON.stringify(companies));
  }, [companies]);
  useEffect(() => {
    if (!initializedRef.current) return;
    if (selectedCompany) {
      localStorage.setItem('sidebar_selectedCompany', JSON.stringify(selectedCompany));
    }
  }, [selectedCompany]);
  useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem('sidebar_selectedBranches', JSON.stringify(selectedBranches));
  }, [selectedBranches]);
  useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem('sidebar_expandedMenus', JSON.stringify(expandedMenus));
  }, [expandedMenus]);
  useEffect(() => {
    if (!initializedRef.current) return;
    localStorage.setItem('sidebar_menuItems', JSON.stringify(menuItems));
  }, [menuItems]);

  // After companies are set (e.g., after API fetch), ensure selectedCompany is preserved if possible
  useEffect(() => {
    if (companies.length > 0) {
      setSelectedCompany(prev => {
        if (prev && companies.some(c => c.co_id === prev.co_id)) {
          return companies.find(c => c.co_id === prev.co_id) || companies[0];
        } else {
          setSelectedBranches(companies[0].branches.length > 0 ? [companies[0].branches[0].branch_id] : []);
          return companies[0];
        }
      });
    }
  }, [companies]);

  // Update availableMenus and parentMenus when company/branches change
  useEffect(() => {
    if (!selectedCompany || selectedBranches.length === 0) {
      setAvailableMenus([]);
      setParentMenus([]);
      return;
    }
    const allMenus: MenuItem[] = [];
    selectedCompany.branches
      .filter(branch => selectedBranches.includes(branch.branch_id))
      .forEach(branch => {
        branch.menus.forEach((menu: MenuItem) => {
          if (!allMenus.some(m => m.menu_id === menu.menu_id)) {
            allMenus.push(menu);
          }
        });
      });
    setAvailableMenus(allMenus);
    setParentMenus(allMenus.filter(menu => menu.menu_parent_id === null));
  }, [selectedCompany, selectedBranches]);

  // Handlers
  //
  // NOTE: Changing the company or branch used to do a full page reload via
  // `window.location.href = '/dashboardportal'` ("refresh data for the newly
  // selected company"). That hard refresh bounced the user off whatever page
  // they were on (e.g. a half-filled create form) back to the portal index —
  // the "page refreshing automatically and back to index page" complaint.
  // We now only update context state; the sidebar menus and any context-aware
  // page data recompute reactively, with NO page reload and NO navigation away.
  const handleCompanyChange = useCallback((companyId: number) => {
    const company = companies.find(c => c.co_id === companyId);
    if (company) {
      setSelectedCompany(company);
      const defaultBranches = company.branches.length > 0 ? [company.branches[0].branch_id] : [];
      setSelectedBranches(defaultBranches);
    }
  }, [companies]);

  const handleBranchChange = useCallback((branchIds: number[]) => {
    setSelectedBranches(branchIds);
  }, []);

  const normalisePath = useCallback((path: string) => normalisePortalPath(path), []);

  const actionThreshold = useCallback((action: string) => {
    const map: Record<string, number> = { view: 1, print: 2, create: 3, edit: 4 };
    return map[action.toLowerCase()] ?? 4;
  }, []);

  const hasMenuAccess = useCallback((path: string, action: string = 'view') => {
    const normalised = normalisePath(path);
    if (!normalised) {
      return false;
    }

    const segments = normalised.split('/');
    let level: number | undefined;

    const findLevelFromMenus = () => {
      let branchLevel: number | undefined;
      for (let i = segments.length; i > 0; i -= 1) {
        const candidate = segments.slice(0, i).join('/');
        const matches = availableMenus.filter(menu => normalisePath(menu.menu_path) === candidate);
        if (matches.length > 0) {
          const highest = matches.reduce((max, menu) => {
            const numeric = Number(menu.access_type_id);
            return Number.isFinite(numeric) && numeric > max ? numeric : max;
          }, -Infinity);
          if (Number.isFinite(highest)) {
            branchLevel = highest;
            break;
          }
        }
      }
      return branchLevel;
    };

    level = findLevelFromMenus();

    if (typeof level !== 'number') {
      for (let i = segments.length; i > 0; i -= 1) {
        const candidate = segments.slice(0, i).join('/');
        const candidateLevel = menuPermissions[candidate];
        if (typeof candidateLevel === 'number') {
          level = candidateLevel;
          break;
        }
      }
    }

    if (typeof level !== 'number') {
      return false;
    }
    return level >= actionThreshold(action);
  }, [actionThreshold, availableMenus, menuPermissions, normalisePath]);

  return (
    <SidebarContext.Provider value={{
      companies, setCompanies,
      selectedCompany, setSelectedCompany,
      selectedBranches, setSelectedBranches,
      expandedMenus, setExpandedMenus,
      availableMenus, setAvailableMenus,
      parentMenus, setParentMenus,
      menuItems, setMenuItems,
      menuPermissions, setMenuPermissions,
      hasMenuAccess,
      handleCompanyChange,
      handleBranchChange
    }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const useSidebarContext = () => {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebarContext must be used within SidebarProvider');
  return ctx;
};

/**
 * Safe version of useSidebarContext that returns null if not within SidebarProvider.
 * Use this in components that may be used both inside and outside of SidebarProvider.
 */
export const useSidebarContextSafe = () => {
  return useContext(SidebarContext);
};
