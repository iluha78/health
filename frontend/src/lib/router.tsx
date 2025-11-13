import {
  Children,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type AnchorHTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react";

const RouterContext = createContext<{ path: string; navigate: (to: string, options?: { replace?: boolean }) => void } | null>(
  null,
);
const ParamsContext = createContext<Record<string, string>>({});

const normalisePath = (path: string): string => {
  if (!path) {
    return "/";
  }
  if (!path.startsWith("/")) {
    return `/${path}`;
  }
  return path.replace(/\/+$/, "") || "/";
};

const splitPath = (path: string): string[] => normalisePath(path).split("/").filter(Boolean);

const matchPath = (pattern: string, path: string): Record<string, string> | null => {
  const patternParts = splitPath(pattern);
  const pathParts = splitPath(path);

  if (patternParts.length === 1 && patternParts[0] === "*") {
    return {};
  }

  if (patternParts.length === 0 && pathParts.length === 0) {
    return {};
  }

  if (patternParts.length !== pathParts.length) {
    return null;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < patternParts.length; index += 1) {
    const patternPart = patternParts[index];
    const pathPart = pathParts[index];
    if (patternPart.startsWith(":")) {
      const key = patternPart.slice(1);
      params[key] = decodeURIComponent(pathPart);
      continue;
    }
    if (patternPart !== pathPart) {
      return null;
    }
  }
  return params;
};

const getInitialPath = () => {
  if (typeof window === "undefined") {
    return "/";
  }
  return normalisePath(window.location.pathname);
};

export const BrowserRouter = ({ children }: { children: ReactNode }) => {
  const [path, setPath] = useState<string>(() => getInitialPath());

  const navigate = useCallback((to: string, options?: { replace?: boolean }) => {
    if (typeof window === "undefined") {
      setPath(normalisePath(to));
      return;
    }
    const target = normalisePath(to);
    if (options?.replace) {
      window.history.replaceState(null, "", target);
    } else {
      window.history.pushState(null, "", target);
    }
    setPath(target);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handlePop = () => {
      setPath(normalisePath(window.location.pathname));
    };
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  const value = useMemo(() => ({ path, navigate }), [path, navigate]);

  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>;
};

type RouteProps = {
  path: string;
  element: ReactElement;
};

export const Route = (_props: RouteProps) => null;

export const Routes = ({ children }: { children: ReactNode }) => {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error("Routes must be used within a BrowserRouter");
  }
  const childArray = Children.toArray(children);
  for (const child of childArray) {
    if (!child) {
      continue;
    }
    if (typeof child !== "object" || !("props" in child)) {
      continue;
    }
    const routeProps = (child as ReactElement<RouteProps>).props;
    const params = matchPath(routeProps.path, router.path);
    if (params) {
      return <ParamsContext.Provider value={params}>{routeProps.element}</ParamsContext.Provider>;
    }
  }
  return null;
};

type LinkProps = {
  to: string;
  replace?: boolean;
} & Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href">;

export const Link = ({ to, replace = false, onClick, ...rest }: LinkProps) => {
  const router = useContext(RouterContext);
  if (!router) {
    throw new Error("Link must be used within a BrowserRouter");
  }

  const handleClick: AnchorHTMLAttributes<HTMLAnchorElement>["onClick"] = event => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }
    event.preventDefault();
    router.navigate(to, { replace });
  };

  return <a {...rest} href={to} onClick={handleClick} />;
};

export const Navigate = ({ to, replace = false }: { to: string; replace?: boolean }) => {
  const router = useContext(RouterContext);
  useEffect(() => {
    if (!router) {
      return;
    }
    router.navigate(to, { replace });
  }, [replace, router, to]);
  return null;
};

export const useParams = <T extends Record<string, string> = Record<string, string>>() => {
  return useContext(ParamsContext) as T;
};
