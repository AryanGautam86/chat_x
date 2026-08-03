import { createContext } from "react";

/**
 * Kept in its own module so the provider component and the useAuth hook can
 * share it without either file exporting a mix of components and non-components
 * (which disables fast refresh).
 */
export const AuthContext = createContext(null);

export default AuthContext;
