import { renderToStringAsync, isServer, createComponent, Assets, ssr, ssrHydrationKey, ssrAttribute, escape, HydrationScript, NoHydration } from 'solid-js/web';
import { createContext, createSignal, onMount, onCleanup, runWithOwner, createMemo, getOwner, useContext, createComponent as createComponent$1, useTransition, on, untrack, resetErrorBoundaries, createRenderEffect, createRoot, Show, lazy, ErrorBoundary as ErrorBoundary$1, Suspense, sharedConfig, mergeProps, For } from 'solid-js';
import { keyframes, styled } from 'solid-styled-components';

function renderAsync(fn, options) {
  return () => async (context) => {
    let markup = await renderToStringAsync(() => fn(context), options);
    if (context.routerContext.url) {
      return Response.redirect(new URL(context.routerContext.url, context.request.url), 302);
    }
    context.responseHeaders.set("Content-Type", "text/html");
    return new Response(markup, {
      status: 200,
      headers: context.responseHeaders
    });
  };
}

const MetaContext = createContext();
const cascadingTags = ["title", "meta"];

const MetaProvider = props => {
  const indices = new Map(),
        [tags, setTags] = createSignal({});
  onMount(() => {
    const ssrTags = document.head.querySelectorAll(`[data-sm=""]`); // `forEach` on `NodeList` is not supported in Googlebot, so use a workaround

    Array.prototype.forEach.call(ssrTags, ssrTag => ssrTag.parentNode.removeChild(ssrTag));
  });
  const actions = {
    addClientTag: (tag, name) => {
      // consider only cascading tags
      if (cascadingTags.indexOf(tag) !== -1) {
        setTags(tags => {
          const names = tags[tag] || [];
          return { ...tags,
            [tag]: [...names, name]
          };
        }); // track indices synchronously

        const index = indices.has(tag) ? indices.get(tag) + 1 : 0;
        indices.set(tag, index);
        return index;
      }

      return -1;
    },
    shouldRenderTag: (tag, index) => {
      if (cascadingTags.indexOf(tag) !== -1) {
        const names = tags()[tag]; // check if the tag is the last one of similar

        return names && names.lastIndexOf(names[index]) === index;
      }

      return true;
    },
    removeClientTag: (tag, index) => {
      setTags(tags => {
        const names = tags[tag];

        if (names) {
          names[index] = null;
          return { ...tags,
            [tag]: names
          };
        }

        return tags;
      });
    }
  };

  if (isServer) {
    actions.addServerTag = tagDesc => {
      const {
        tags = []
      } = props; // tweak only cascading tags

      if (cascadingTags.indexOf(tagDesc.tag) !== -1) {
        const index = tags.findIndex(prev => {
          const prevName = prev.props.name || prev.props.property;
          const nextName = tagDesc.props.name || tagDesc.props.property;
          return prev.tag === tagDesc.tag && prevName === nextName;
        });

        if (index !== -1) {
          tags.splice(index, 1);
        }
      }

      tags.push(tagDesc);
    };

    if (Array.isArray(props.tags) === false) {
      throw Error("tags array should be passed to <MetaProvider /> in node");
    }
  }

  return createComponent(MetaContext.Provider, {
    value: actions,

    get children() {
      return props.children;
    }

  });
};
function renderTags(tags) {
  return tags.map(tag => {
    const keys = Object.keys(tag.props);
    const props = keys.map(k => k === "children" ? "" : ` ${k}="${tag.props[k]}"`).join("");
    return tag.props.children ? `<${tag.tag} data-sm=""${props}>${// Tags might contain multiple text children:
    //   <Title>example - {myCompany}</Title>
    Array.isArray(tag.props.children) ? tag.props.children.join("") : tag.props.children}</${tag.tag}>` : `<${tag.tag} data-sm=""${props}/>`;
  }).join("");
}

function bindEvent(target, type, handler) {
    target.addEventListener(type, handler);
    return () => target.removeEventListener(type, handler);
}
function intercept([value, setValue], get, set) {
    return [get ? () => get(value()) : value, set ? (v) => setValue(set(v)) : setValue];
}
function querySelector(selector) {
    // Guard against selector being an invalid CSS selector
    try {
        return document.querySelector(selector);
    }
    catch (e) {
        return null;
    }
}
function scrollToHash(hash, fallbackTop) {
    const el = querySelector(`a#${hash}`);
    if (el) {
        el.scrollIntoView();
    }
    else if (fallbackTop) {
        window.scrollTo(0, 0);
    }
}
function createIntegration(get, set, init, utils) {
    let ignore = false;
    const wrap = (value) => (typeof value === "string" ? { value } : value);
    const signal = intercept(createSignal(wrap(get()), { equals: (a, b) => a.value === b.value }), undefined, next => {
        !ignore && set(next);
        return next;
    });
    init &&
        onCleanup(init((value = get()) => {
            ignore = true;
            signal[1](wrap(value));
            ignore = false;
        }));
    return {
        signal,
        utils
    };
}
function normalizeIntegration(integration) {
    if (!integration) {
        return {
            signal: createSignal({ value: "" })
        };
    }
    else if (Array.isArray(integration)) {
        return {
            signal: integration
        };
    }
    return integration;
}
function staticIntegration(obj) {
    return {
        signal: [() => obj, next => Object.assign(obj, next)]
    };
}
function pathIntegration() {
    return createIntegration(() => ({
        value: window.location.pathname + window.location.search + window.location.hash,
        state: history.state
    }), ({ value, replace, scroll, state }) => {
        if (replace) {
            window.history.replaceState(state, "", value);
        }
        else {
            window.history.pushState(state, "", value);
        }
        scrollToHash(window.location.hash.slice(1), scroll);
    }, notify => bindEvent(window, "popstate", () => notify()), {
        go: delta => window.history.go(delta)
    });
}

const hasSchemeRegex = /^(?:[a-z0-9]+:)?\/\//i;
const trimPathRegex = /^\/+|\/+$/g;
function normalize(path, omitSlash = false) {
    const s = path.replace(trimPathRegex, "");
    return s ? (omitSlash || /^[?#]/.test(s) ? s : "/" + s) : "";
}
function resolvePath(base, path, from) {
    if (hasSchemeRegex.test(path)) {
        return undefined;
    }
    const basePath = normalize(base);
    const fromPath = from && normalize(from);
    let result = "";
    if (!fromPath || path.startsWith("/")) {
        result = basePath;
    }
    else if (fromPath.toLowerCase().indexOf(basePath.toLowerCase()) !== 0) {
        result = basePath + fromPath;
    }
    else {
        result = fromPath;
    }
    return (result || '/') + normalize(path, !result);
}
function invariant(value, message) {
    if (value == null) {
        throw new Error(message);
    }
    return value;
}
function joinPaths(from, to) {
    return normalize(from).replace(/\/*(\*.*)?$/g, "") + normalize(to);
}
function extractSearchParams(url) {
    const params = {};
    url.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return params;
}
function urlDecode(str, isQuery) {
    return decodeURIComponent(isQuery ? str.replace(/\+/g, ' ') : str);
}
function createMatcher(path, partial) {
    const [pattern, splat] = path.split("/*", 2);
    const segments = pattern.split("/").filter(Boolean);
    const len = segments.length;
    return (location) => {
        const locSegments = location.split("/").filter(Boolean);
        const lenDiff = locSegments.length - len;
        if (lenDiff < 0 || (lenDiff > 0 && splat === undefined && !partial)) {
            return null;
        }
        const match = {
            path: len ? "" : "/",
            params: {}
        };
        for (let i = 0; i < len; i++) {
            const segment = segments[i];
            const locSegment = locSegments[i];
            if (segment[0] === ":") {
                match.params[segment.slice(1)] = locSegment;
            }
            else if (segment.localeCompare(locSegment, undefined, { sensitivity: "base" }) !== 0) {
                return null;
            }
            match.path += `/${locSegment}`;
        }
        if (splat) {
            match.params[splat] = lenDiff ? locSegments.slice(-lenDiff).join("/") : "";
        }
        return match;
    };
}
function scoreRoute(route) {
    const [pattern, splat] = route.pattern.split("/*", 2);
    const segments = pattern.split("/").filter(Boolean);
    return segments.reduce((score, segment) => score + (segment.startsWith(":") ? 2 : 3), segments.length - (splat === undefined ? 0 : 1));
}
function createMemoObject(fn) {
    const map = new Map();
    const owner = getOwner();
    return new Proxy({}, {
        get(_, property) {
            if (!map.has(property)) {
                runWithOwner(owner, () => map.set(property, createMemo(() => fn()[property])));
            }
            return map.get(property)();
        },
        getOwnPropertyDescriptor() {
            return {
                enumerable: true,
                configurable: true
            };
        },
        ownKeys() {
            return Reflect.ownKeys(fn());
        }
    });
}

const MAX_REDIRECTS = 100;
const RouterContextObj = createContext();
const RouteContextObj = createContext();
const useRouter = () => invariant(useContext(RouterContextObj), "Make sure your app is wrapped in a <Router />");
let TempRoute;
const useRoute = () => TempRoute || useContext(RouteContextObj) || useRouter().base;
function createRoute(routeDef, base = "", fallback) {
    const { path: originalPath, component, data, children } = routeDef;
    const isLeaf = !children || (Array.isArray(children) && !children.length);
    const path = joinPaths(base, originalPath);
    const pattern = isLeaf ? path : path.split("/*", 1)[0];
    return {
        originalPath,
        pattern,
        element: component
            ? () => createComponent$1(component, {})
            : () => {
                const { element } = routeDef;
                return element === undefined && fallback
                    ? createComponent$1(fallback, {})
                    : element;
            },
        preload: routeDef.component
            ? component.preload
            : routeDef.preload,
        data,
        matcher: createMatcher(pattern, !isLeaf)
    };
}
function createBranch(routes, index = 0) {
    return {
        routes,
        score: scoreRoute(routes[routes.length - 1]) * 10000 - index,
        matcher(location) {
            const matches = [];
            for (let i = routes.length - 1; i >= 0; i--) {
                const route = routes[i];
                const match = route.matcher(location);
                if (!match) {
                    return null;
                }
                matches.unshift({
                    ...match,
                    route
                });
            }
            return matches;
        }
    };
}
function createBranches(routeDef, base = "", fallback, stack = [], branches = []) {
    const routeDefs = Array.isArray(routeDef) ? routeDef : [routeDef];
    for (let i = 0, len = routeDefs.length; i < len; i++) {
        const def = routeDefs[i];
        if (def && typeof def === "object" && def.hasOwnProperty("path")) {
            const route = createRoute(def, base, fallback);
            stack.push(route);
            if (def.children) {
                createBranches(def.children, route.pattern, fallback, stack, branches);
            }
            else {
                const branch = createBranch([...stack], branches.length);
                branches.push(branch);
            }
            stack.pop();
        }
    }
    // Stack will be empty on final return
    return stack.length ? branches : branches.sort((a, b) => b.score - a.score);
}
function getRouteMatches$1(branches, location) {
    for (let i = 0, len = branches.length; i < len; i++) {
        const match = branches[i].matcher(location);
        if (match) {
            return match;
        }
    }
    return [];
}
function createLocation(path, state) {
    const origin = new URL("http://sar");
    const url = createMemo(prev => {
        const path_ = path();
        try {
            return new URL(path_, origin);
        }
        catch (err) {
            console.error(`Invalid path ${path_}`);
            return prev;
        }
    }, origin, {
        equals: (a, b) => a.href === b.href
    });
    const pathname = createMemo(() => urlDecode(url().pathname));
    const search = createMemo(() => urlDecode(url().search, true));
    const hash = createMemo(() => urlDecode(url().hash));
    const key = createMemo(() => "");
    return {
        get pathname() {
            return pathname();
        },
        get search() {
            return search();
        },
        get hash() {
            return hash();
        },
        get state() {
            return state();
        },
        get key() {
            return key();
        },
        query: createMemoObject(on(search, () => extractSearchParams(url())))
    };
}
function createRouterContext(integration, base = "", data, out) {
    const { signal: [source, setSource], utils = {} } = normalizeIntegration(integration);
    const parsePath = utils.parsePath || (p => p);
    const renderPath = utils.renderPath || (p => p);
    const basePath = resolvePath("", base);
    const output = isServer && out
        ? Object.assign(out, {
            matches: [],
            url: undefined
        })
        : undefined;
    if (basePath === undefined) {
        throw new Error(`${basePath} is not a valid base path`);
    }
    else if (basePath && !source().value) {
        setSource({ value: basePath, replace: true, scroll: false });
    }
    const [isRouting, start] = useTransition();
    const [reference, setReference] = createSignal(source().value);
    const [state, setState] = createSignal(source().state);
    const location = createLocation(reference, state);
    const referrers = [];
    const baseRoute = {
        pattern: basePath,
        params: {},
        path: () => basePath,
        outlet: () => null,
        resolvePath(to) {
            return resolvePath(basePath, to);
        }
    };
    if (data) {
        try {
            TempRoute = baseRoute;
            baseRoute.data = data({
                data: undefined,
                params: {},
                location,
                navigate: navigatorFactory(baseRoute)
            });
        }
        finally {
            TempRoute = undefined;
        }
    }
    function navigateFromRoute(route, to, options) {
        // Untrack in case someone navigates in an effect - don't want to track `reference` or route paths
        untrack(() => {
            if (typeof to === "number") {
                if (!to) ;
                else if (utils.go) {
                    utils.go(to);
                }
                else {
                    console.warn("Router integration does not support relative routing");
                }
                return;
            }
            const { replace, resolve, scroll, state: nextState } = {
                replace: false,
                resolve: true,
                scroll: true,
                ...options
            };
            const resolvedTo = resolve ? route.resolvePath(to) : resolvePath("", to);
            if (resolvedTo === undefined) {
                throw new Error(`Path '${to}' is not a routable path`);
            }
            else if (referrers.length >= MAX_REDIRECTS) {
                throw new Error("Too many redirects");
            }
            const current = reference();
            if (resolvedTo !== current || nextState !== state()) {
                if (isServer) {
                    if (output) {
                        output.url = resolvedTo;
                    }
                    setSource({ value: resolvedTo, replace, scroll, state: nextState });
                }
                else {
                    const len = referrers.push({ value: current, replace, scroll, state: state() });
                    start(() => {
                        setReference(resolvedTo);
                        setState(nextState);
                        resetErrorBoundaries();
                    }).then(() => {
                        if (referrers.length === len) {
                            navigateEnd({
                                value: resolvedTo,
                                state: nextState
                            });
                        }
                    });
                }
            }
        });
    }
    function navigatorFactory(route) {
        // Workaround for vite issue (https://github.com/vitejs/vite/issues/3803)
        route = route || useContext(RouteContextObj) || baseRoute;
        return (to, options) => navigateFromRoute(route, to, options);
    }
    function navigateEnd(next) {
        const first = referrers[0];
        if (first) {
            if (next.value !== first.value || next.state !== first.state) {
                setSource({
                    ...next,
                    replace: first.replace,
                    scroll: first.scroll
                });
            }
            referrers.length = 0;
        }
    }
    createRenderEffect(() => {
        const { value, state } = source();
        // Untrack this whole block so `start` doesn't cause Solid's Listener to be preserved
        untrack(() => {
            if (value !== reference()) {
                start(() => {
                    setReference(value);
                    setState(state);
                });
            }
        });
    });
    if (!isServer) {
        function handleAnchorClick(evt) {
            if (evt.defaultPrevented ||
                evt.button !== 0 ||
                evt.metaKey ||
                evt.altKey ||
                evt.ctrlKey ||
                evt.shiftKey)
                return;
            const a = evt
                .composedPath()
                .find(el => el instanceof Node && el.nodeName.toUpperCase() === "A");
            if (!a)
                return;
            const isSvg = a instanceof SVGAElement;
            const href = isSvg ? a.href.baseVal : a.href;
            const target = isSvg ? a.target.baseVal : a.target;
            if (target || (!href && !a.hasAttribute("state")))
                return;
            const rel = (a.getAttribute("rel") || "").split(/\s+/);
            if (a.hasAttribute("download") || (rel && rel.includes("external")))
                return;
            const url = isSvg ? new URL(href, document.baseURI) : new URL(href);
            const pathname = urlDecode(url.pathname);
            if (url.origin !== window.location.origin ||
                (basePath && pathname && !pathname.toLowerCase().startsWith(basePath.toLowerCase())))
                return;
            const to = parsePath(pathname + urlDecode(url.search, true) + urlDecode(url.hash));
            const state = a.getAttribute("state");
            evt.preventDefault();
            navigateFromRoute(baseRoute, to, {
                resolve: false,
                replace: a.hasAttribute("replace"),
                scroll: !a.hasAttribute("noscroll"),
                state: state && JSON.parse(state)
            });
        }
        document.addEventListener("click", handleAnchorClick);
        onCleanup(() => document.removeEventListener("click", handleAnchorClick));
    }
    return {
        base: baseRoute,
        out: output,
        location,
        isRouting,
        renderPath,
        parsePath,
        navigatorFactory
    };
}
function createRouteContext(router, parent, child, match) {
    const { base, location, navigatorFactory } = router;
    const { pattern, element: outlet, preload, data } = match().route;
    const path = createMemo(() => match().path);
    const params = createMemoObject(() => match().params);
    preload && preload();
    const route = {
        parent,
        pattern,
        get child() {
            return child();
        },
        path,
        params,
        data: parent.data,
        outlet,
        resolvePath(to) {
            return resolvePath(base.path(), to, path());
        }
    };
    if (data) {
        try {
            TempRoute = route;
            route.data = data({ data: parent.data, params, location, navigate: navigatorFactory(route) });
        }
        finally {
            TempRoute = undefined;
        }
    }
    return route;
}

const Router = props => {
  const {
    source,
    url,
    base,
    data,
    out
  } = props;
  const integration = source || (isServer ? staticIntegration({
    value: url || ""
  }) : pathIntegration());
  const routerState = createRouterContext(integration, base, data, out);
  return createComponent(RouterContextObj.Provider, {
    value: routerState,

    get children() {
      return props.children;
    }

  });
};
const Routes$1 = props => {
  const router = useRouter();
  const parentRoute = useRoute();
  const branches = createMemo(() => createBranches(props.children, joinPaths(parentRoute.pattern, props.base || ""), Outlet));
  const matches = createMemo(() => getRouteMatches$1(branches(), router.location.pathname));

  if (router.out) {
    router.out.matches.push(matches().map(({
      route,
      path,
      params
    }) => ({
      originalPath: route.originalPath,
      pattern: route.pattern,
      path,
      params
    })));
  }

  const disposers = [];
  let root;
  const routeStates = createMemo(on(matches, (nextMatches, prevMatches, prev) => {
    let equal = prevMatches && nextMatches.length === prevMatches.length;
    const next = [];

    for (let i = 0, len = nextMatches.length; i < len; i++) {
      const prevMatch = prevMatches && prevMatches[i];
      const nextMatch = nextMatches[i];

      if (prev && prevMatch && nextMatch.route.pattern === prevMatch.route.pattern) {
        next[i] = prev[i];
      } else {
        equal = false;

        if (disposers[i]) {
          disposers[i]();
        }

        createRoot(dispose => {
          disposers[i] = dispose;
          next[i] = createRouteContext(router, next[i - 1] || parentRoute, () => routeStates()[i + 1], () => matches()[i]);
        });
      }
    }

    disposers.splice(nextMatches.length).forEach(dispose => dispose());

    if (prev && equal) {
      return prev;
    }

    root = next[0];
    return next;
  }));
  return createComponent(Show, {
    get when() {
      return routeStates() && root;
    },

    children: route => createComponent(RouteContextObj.Provider, {
      value: route,

      get children() {
        return route.outlet();
      }

    })
  });
};
const useRoutes = (routes, base) => {
  return () => createComponent(Routes$1, {
    base: base,
    children: routes
  });
};
const Outlet = () => {
  const route = useRoute();
  return createComponent(Show, {
    get when() {
      return route.child;
    },

    children: child => createComponent(RouteContextObj.Provider, {
      value: child,

      get children() {
        return child.outlet();
      }

    })
  });
};

const StartContext = createContext({});
function StartProvider(props) {
  const [request, setRequest] = createSignal(new Request(isServer ? props.context.request.url : window.location.pathname)); // TODO: throw error if values are used on client for anything more than stubbing
  // OR replace with actual request that updates with the current URL

  return createComponent(StartContext.Provider, {
    get value() {
      return props.context || {
        get request() {
          return request();
        },

        get responseHeaders() {
          return new Headers();
        },

        get tags() {
          return [];
        },

        get manifest() {
          return {};
        },

        get routerContext() {
          return {};
        },

        setStatusCode(code) {},

        setHeader(name, value) {}

      };
    },

    get children() {
      return props.children;
    }

  });
}

const _tmpl$$6 = ["<link", " rel=\"stylesheet\"", ">"],
      _tmpl$2$1 = ["<link", " rel=\"modulepreload\"", ">"];

function getAssetsFromManifest(manifest, routerContext) {
  const match = routerContext.matches.reduce((memo, m) => {
    memo.push(...(manifest[mapRouteToFile(m)] || []));
    return memo;
  }, []);
  const links = match.reduce((r, src) => {
    r[src.href] = src.type === "style" ? ssr(_tmpl$$6, ssrHydrationKey(), ssrAttribute("href", escape(src.href, true), false)) : ssr(_tmpl$2$1, ssrHydrationKey(), ssrAttribute("href", escape(src.href, true), false));
    return r;
  }, {});
  return Object.values(links);
}

function mapRouteToFile(matches) {
  return matches.map(h => h.originalPath.replace(/:(\w+)/, (f, g) => `[${g}]`).replace(/\*(\w+)/, (f, g) => `[...${g}]`)).join("");
}
/**
 * Links are used to load assets for the server.
 * @returns {JSXElement}
 */


function Links() {
  const context = useContext(StartContext);
  return createComponent(Assets, {
    get children() {
      return getAssetsFromManifest(context.manifest, context.routerContext);
    }

  });
}

function Meta() {
  const context = useContext(StartContext); // @ts-expect-error The ssr() types do not match the Assets child types

  return createComponent(Assets, {
    get children() {
      return ssr(renderTags(context.tags));
    }

  });
}

/// <reference path="../server/types.tsx" />
const routes = [{
  component: lazy(() => Promise.resolve().then(function () { return ____404_; })),
  path: "/*404"
}, {
  component: lazy(() => Promise.resolve().then(function () { return index; })),
  path: "/"
}]; // console.log(routes);

/**
 * Routes are the file system based routes, used by Solid App Router to show the current page according to the URL.
 */

const Routes = useRoutes(routes);

const _tmpl$$5 = ["<script", " type=\"module\" async", "></script>"];

function getFromManifest(manifest) {
  const match = manifest["*"];
  const entry = match.find(src => src.type === "script");
  return ssr(_tmpl$$5, ssrHydrationKey(), ssrAttribute("src", escape(entry.href, true), false));
}

function Scripts() {
  const context = useContext(StartContext);
  return [createComponent(HydrationScript, {}), createComponent(NoHydration, {
    get children() {
      return isServer && (getFromManifest(context.manifest));
    }

  })];
}

const _tmpl$$4 = ["<div", " style=\"", "\"><div style=\"", "\"><p style=\"", "\" id=\"error-message\">", "</p><button id=\"reset-errors\" style=\"", "\">Clear errors and retry</button><pre style=\"", "\">", "</pre></div></div>"];
function ErrorBoundary(props) {
  return createComponent(ErrorBoundary$1, {
    fallback: e => {
      return createComponent(Show, {
        get when() {
          return !props.fallback;
        },

        get fallback() {
          return props.fallback(e);
        },

        get children() {
          return createComponent(ErrorMessage, {
            error: e
          });
        }

      });
    },

    get children() {
      return props.children;
    }

  });
}

function ErrorMessage(props) {
  return ssr(_tmpl$$4, ssrHydrationKey(), "padding:" + "16px", "background-color:" + "rgba(252, 165, 165)" + (";color:" + "rgb(153, 27, 27)") + (";border-radius:" + "5px") + (";overflow:" + "scroll") + (";padding:" + "16px") + (";margin-bottom:" + "8px"), "font-weight:" + "bold", escape(props.error.message), "color:" + "rgba(252, 165, 165)" + (";background-color:" + "rgb(153, 27, 27)") + (";border-radius:" + "5px") + (";padding:" + "4px 8px"), "margin-top:" + "8px" + (";width:" + "100%"), escape(props.error.stack));
}

const _tmpl$$3 = ["<head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">", "", "</head>"],
      _tmpl$2 = ["<html", " lang=\"en\">", "<body><!--#-->", "<!--/--><!--#-->", "<!--/--></body></html>"];
function Root() {
  return ssr(_tmpl$2, ssrHydrationKey(), NoHydration({
    get children() {
      return ssr(_tmpl$$3, escape(createComponent(Meta, {})), escape(createComponent(Links, {})));
    }

  }), escape(createComponent(ErrorBoundary, {
    get children() {
      return createComponent(Suspense, {
        get children() {
          return createComponent(Routes, {});
        }

      });
    }

  })), escape(createComponent(Scripts, {})));
}

const api = [
  {
    get: "skip",
    path: "/*404"
  },
  {
    get: "skip",
    path: "/"
  }
];
function routeToMatchRoute(route) {
  const segments = route.path.split("/").filter(Boolean);
  const params = [];
  const matchSegments = [];
  let score = route.path.endsWith("/") ? 4 : 0;
  let wildcard = false;
  for (const [index, segment] of segments.entries()) {
    if (segment[0] === ":") {
      const name = segment.slice(1);
      score += 3;
      params.push({
        type: ":",
        name,
        index
      });
      matchSegments.push(null);
    } else if (segment[0] === "*") {
      params.push({
        type: "*",
        name: segment.slice(1),
        index
      });
      wildcard = true;
    } else {
      score += 4;
      matchSegments.push(segment);
    }
  }
  return {
    ...route,
    score,
    params,
    matchSegments,
    wildcard
  };
}
function getRouteMatches(routes, path, method) {
  const segments = path.split("/").filter(Boolean);
  routeLoop:
    for (const route of routes) {
      const matchSegments = route.matchSegments;
      if (segments.length < matchSegments.length || !route.wildcard && segments.length > matchSegments.length) {
        continue;
      }
      for (let index = 0; index < matchSegments.length; index++) {
        const match = matchSegments[index];
        if (!match) {
          continue;
        }
        if (segments[index] !== match) {
          continue routeLoop;
        }
      }
      const handler = route[method];
      if (handler === "skip" || handler === void 0) {
        return;
      }
      const params = {};
      for (const { type, name, index } of route.params) {
        if (type === ":") {
          params[name] = segments[index];
        } else {
          params[name] = segments.slice(index).join("/");
        }
      }
      return { handler, params };
    }
}
const allRoutes = api.map(routeToMatchRoute).sort((a, b) => b.score - a.score);
function getApiHandler(url, method) {
  return getRouteMatches(allRoutes, url.pathname, method.toLowerCase());
}

class FormError extends Error {
  constructor(message, {
    fieldErrors = {},
    form,
    fields,
    stack
  } = {}) {
    super(message);
    this.formError = message;
    this.name = "FormError";
    this.fields = fields || Object.fromEntries(typeof form !== "undefined" ? form.entries() : []) || {};
    this.fieldErrors = fieldErrors;

    if (stack) {
      this.stack = stack;
    }
  }

}

const XSolidStartLocationHeader = "x-solidstart-location";
const LocationHeader = "Location";
const ContentTypeHeader = "content-type";
const XSolidStartResponseTypeHeader = "x-solidstart-response-type";
const XSolidStartContentTypeHeader = "x-solidstart-content-type";
const XSolidStartOrigin = "x-solidstart-origin";
const JSONResponseType = "application/json";
const redirectStatusCodes = /* @__PURE__ */ new Set([204, 301, 302, 303, 307, 308]);
function isRedirectResponse(response) {
  return response && response instanceof Response && redirectStatusCodes.has(response.status);
}
class ResponseError extends Error {
  constructor(response) {
    let message = JSON.stringify({
      $type: "response",
      status: response.status,
      message: response.statusText,
      headers: [...response.headers.entries()]
    });
    super(message);
    this.name = "ResponseError";
    this.status = response.status;
    this.headers = new Map([...response.headers.entries()]);
    this.url = response.url;
    this.ok = response.ok;
    this.statusText = response.statusText;
    this.redirected = response.redirected;
    this.bodyUsed = false;
    this.type = response.type;
    this.response = () => response;
  }
  clone() {
    return this.response();
  }
  get body() {
    return this.response().body;
  }
  async arrayBuffer() {
    return await this.response().arrayBuffer();
  }
  async blob() {
    return await this.response().blob();
  }
  async formData() {
    return await this.response().formData();
  }
  async text() {
    return await this.response().text();
  }
  async json() {
    return await this.response().json();
  }
}
function respondWith(request, data, responseType) {
  if (data instanceof ResponseError) {
    data = data.clone();
  }
  if (data instanceof Response) {
    if (isRedirectResponse(data) && request.headers.get(XSolidStartOrigin) === "client") {
      let headers = new Headers(data.headers);
      headers.set(XSolidStartOrigin, "server");
      headers.set(XSolidStartLocationHeader, data.headers.get(LocationHeader));
      headers.set(XSolidStartResponseTypeHeader, responseType);
      headers.set(XSolidStartContentTypeHeader, "response");
      return new Response(null, {
        status: 204,
        headers
      });
    } else {
      data.headers.set(XSolidStartResponseTypeHeader, responseType);
      data.headers.set(XSolidStartContentTypeHeader, "response");
      return data;
    }
  } else if (data instanceof FormError) {
    return new Response(JSON.stringify({
      error: {
        message: data.message,
        stack: data.stack,
        formError: data.formError,
        fields: data.fields,
        fieldErrors: data.fieldErrors
      }
    }), {
      status: 400,
      headers: {
        [XSolidStartResponseTypeHeader]: responseType,
        [XSolidStartContentTypeHeader]: "form-error"
      }
    });
  } else if (data instanceof Error) {
    return new Response(JSON.stringify({
      error: {
        message: data.message,
        stack: data.stack,
        status: data.status
      }
    }), {
      status: data.status || 500,
      headers: {
        [XSolidStartResponseTypeHeader]: responseType,
        [XSolidStartContentTypeHeader]: "error"
      }
    });
  } else if (typeof data === "object" || typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: {
        [ContentTypeHeader]: "application/json",
        [XSolidStartResponseTypeHeader]: responseType,
        [XSolidStartContentTypeHeader]: "json"
      }
    });
  }
  return new Response("null", {
    status: 200,
    headers: {
      [ContentTypeHeader]: "application/json",
      [XSolidStartContentTypeHeader]: "json",
      [XSolidStartResponseTypeHeader]: responseType
    }
  });
}

const server = (fn) => {
  throw new Error("Should be compiled away");
};
async function parseRequest(request) {
  let contentType = request.headers.get(ContentTypeHeader);
  let name = new URL(request.url).pathname, args = [];
  if (contentType) {
    if (contentType === JSONResponseType) {
      let text = await request.text();
      try {
        args = JSON.parse(text, (key, value) => {
          if (!value) {
            return value;
          }
          if (value.$type === "headers") {
            let headers = new Headers();
            request.headers.forEach((value2, key2) => headers.set(key2, value2));
            value.values.forEach(([key2, value2]) => headers.set(key2, value2));
            return headers;
          }
          if (value.$type === "request") {
            return new Request(value.url, {
              method: value.method,
              headers: value.headers
            });
          }
          return value;
        });
      } catch (e) {
        throw new Error(`Error parsing request body: ${text}`);
      }
    } else if (contentType.includes("form")) {
      let formData = await request.formData();
      args = [formData];
    }
  }
  return [name, args];
}
async function handleServerRequest(ctx) {
  const url = new URL(ctx.request.url);
  if (server.hasHandler(url.pathname)) {
    try {
      let [name, args] = await parseRequest(ctx.request);
      let handler = server.getHandler(name);
      if (!handler) {
        throw {
          status: 404,
          message: "Handler Not Found for " + name
        };
      }
      const data = await handler.call(ctx, ...Array.isArray(args) ? args : [args]);
      return respondWith(ctx.request, data, "return");
    } catch (error) {
      return respondWith(ctx.request, error, "throw");
    }
  }
  return null;
}
const handlers = /* @__PURE__ */ new Map();
server.createHandler = (_fn, hash) => {
  let fn = function(...args) {
    let ctx;
    if (typeof this === "object" && this.request instanceof Request) {
      ctx = this;
    } else if (sharedConfig.context && sharedConfig.context.requestContext) {
      ctx = sharedConfig.context.requestContext;
    } else {
      ctx = {
        request: new URL(hash, "http://localhost:3000").href,
        responseHeaders: new Headers()
      };
    }
    const execute = async () => {
      try {
        let e = await _fn.call(ctx, ...args);
        return e;
      } catch (e) {
        if (/[A-Za-z]+ is not defined/.test(e.message)) {
          const error = new Error(e.message + "\n You probably are using a variable defined in a closure in your server function.");
          error.stack = e.stack;
          throw error;
        }
        throw e;
      }
    };
    return execute();
  };
  fn.url = hash;
  fn.action = function(...args) {
    return fn.call(this, ...args);
  };
  return fn;
};
server.registerHandler = function(route, handler) {
  handlers.set(route, handler);
};
server.getHandler = function(route) {
  return handlers.get(route);
};
server.hasHandler = function(route) {
  return handlers.has(route);
};
server.fetch = async function(route, init) {
  let url = new URL(route, "http://localhost:3000");
  const request = new Request(url.href, init);
  const handler = getApiHandler(url, request.method);
  const response = await handler.handler({ request }, handler.params);
  return response;
};

const inlineServerFunctions = ({ forward }) => {
  return async (ctx) => {
    const url = new URL(ctx.request.url);
    if (server.hasHandler(url.pathname)) {
      let contentType = ctx.request.headers.get("content-type");
      let origin = ctx.request.headers.get("x-solidstart-origin");
      let formRequestBody;
      if (contentType != null && contentType.includes("form") && !(origin != null && origin.includes("client"))) {
        let [read1, read2] = ctx.request.body.tee();
        formRequestBody = new Request(ctx.request.url, {
          body: read2,
          headers: ctx.request.headers,
          method: ctx.request.method
        });
        ctx.request = new Request(ctx.request.url, {
          body: read1,
          headers: ctx.request.headers,
          method: ctx.request.method
        });
      }
      const serverResponse = await handleServerRequest(ctx);
      let responseContentType = serverResponse.headers.get("x-solidstart-content-type");
      if (formRequestBody && responseContentType !== null && responseContentType.includes("error")) {
        const formData = await formRequestBody.formData();
        let entries = [...formData.entries()];
        return new Response(null, {
          status: 302,
          headers: {
            Location: new URL(ctx.request.headers.get("referer")).pathname + "?form=" + encodeURIComponent(JSON.stringify({
              url: url.pathname,
              entries,
              ...await serverResponse.json()
            }))
          }
        });
      }
      return serverResponse;
    }
    const response = await forward(ctx);
    if (ctx.responseHeaders.get("x-solidstart-status-code")) {
      return new Response(response.body, {
        status: parseInt(ctx.responseHeaders.get("x-solidstart-status-code")),
        headers: response.headers
      });
    }
    return response;
  };
};

const apiRoutes = ({ forward }) => {
  return async (ctx) => {
    let apiHandler = getApiHandler(new URL(ctx.request.url), ctx.request.method);
    if (apiHandler) {
      return await apiHandler.handler(ctx, apiHandler.params);
    }
    return await forward(ctx);
  };
};

const rootData = Object.values({})[0];
const dataFn = rootData ? rootData.default : undefined;
/** Function responsible for listening for streamed [operations]{@link Operation}. */

/** This composes an array of Exchanges into a single ExchangeIO function */
const composeMiddleware = exchanges => ({
  ctx,
  forward
}) => exchanges.reduceRight((forward, exchange) => exchange({
  ctx: ctx,
  forward
}), forward);
function createHandler(...exchanges) {
  const exchange = composeMiddleware([apiRoutes, inlineServerFunctions, ...exchanges]);
  return async request => {
    return await exchange({
      ctx: {
        request
      },
      // fallbackExchange
      forward: async op => {
        return new Response(null, {
          status: 404
        });
      }
    })(request);
  };
}
const docType = ssr("<!DOCTYPE html>");
var StartServer = (({
  context
}) => {
  let pageContext = context;
  pageContext.routerContext = {};
  pageContext.tags = [];

  pageContext.setStatusCode = code => {
    pageContext.responseHeaders.set("x-solidstart-status-code", code.toString());
  };

  pageContext.setHeader = (name, value) => {
    pageContext.responseHeaders.set(name, value.toString());
  }; // @ts-expect-error


  sharedConfig.context.requestContext = context;
  const parsed = new URL(context.request.url);
  const path = parsed.pathname + parsed.search;
  return createComponent(StartProvider, {
    context: pageContext,

    get children() {
      return createComponent(MetaProvider, {
        get tags() {
          return pageContext.tags;
        },

        get children() {
          return createComponent(Router, {
            url: path,

            get out() {
              return pageContext.routerContext;
            },

            data: dataFn,

            get children() {
              return [docType, createComponent(Root, {})];
            }

          });
        }

      });
    }

  });
});

var entryServer = createHandler(renderAsync(context => createComponent(StartServer, {
  context: context
})));

const _tmpl$$2 = ["<main", "><h1>Page Not Found</h1><p>Visit <a href=\"https://solidjs.com\" target=\"_blank\">solidjs.com</a> to learn how to build Solid apps.</p></main>"];
function NotFound() {
  return ssr(_tmpl$$2, ssrHydrationKey());
}

var ____404_ = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  'default': NotFound
}, Symbol.toStringTag, { value: 'Module' }));

const _tmpl$$1 = ["<div", " class=\"particle\"><div style=\"", "\"></div></div>"];

const FORCE = 0.5; // 0-1 roughly the vertical force at which particles initially explode

const SIZE = 12; // max height for particle rectangles, diameter for particle circles

const FLOOR_HEIGHT = 800; // pixels the particles will fall from initial explosion point

const FLOOR_WIDTH = 1600; // horizontal spread of particles in pixels

const PARTICLE_COUNT = 150;
const DURATION = 3500;
const COLORS = ['#FFC700', '#FF0000', '#2E3191', '#41BBC7'];

const createParticles = (count, colors) => {
  const increment = 360 / count;
  return Array.from({
    length: count
  }, (_, i) => ({
    color: colors[i % colors.length],
    degree: i * increment
  }));
};

const isUndefined = value => typeof value === 'undefined';

const error = message => {
  console.error(message);
};

function validate(particleCount, duration, colors, particleSize, force, stageHeight, stageWidth, particlesShape) {
  const isSafeInteger = Number.isSafeInteger;

  if (!isUndefined(particleCount) && isSafeInteger(particleCount) && particleCount < 0) {
    error('particleCount must be a positive integer');
    return false;
  }

  if (!isUndefined(duration) && isSafeInteger(duration) && duration < 0) {
    error('duration must be a positive integer');
    return false;
  }

  if (!isUndefined(particlesShape) && !['mix', 'circles', 'rectangles'].includes(particlesShape)) {
    error('particlesShape should be either "mix" or "circles" or "rectangle"');
    return false;
  }

  if (!isUndefined(colors) && !Array.isArray(colors)) {
    error('colors must be an array of strings');
    return false;
  }

  if (!isUndefined(particleSize) && isSafeInteger(particleSize) && particleSize < 0) {
    error('particleSize must be a positive integer');
    return false;
  }

  if (!isUndefined(force) && isSafeInteger(force) && (force < 0 || force > 1)) {
    error('force must be a positive integer and should be within 0 and 1');
    return false;
  }

  if (!isUndefined(stageHeight) && typeof stageHeight === 'number' && isSafeInteger(stageHeight) && stageHeight < 0) {
    error('floorHeight must be a positive integer');
    return false;
  }

  if (!isUndefined(stageWidth) && typeof stageWidth === 'number' && isSafeInteger(stageWidth) && stageWidth < 0) {
    error('floorWidth must be a positive integer');
    return false;
  }

  return true;
}

const ConfettiExplosion = inProps => {
  let props = mergeProps({
    particleCount: PARTICLE_COUNT,
    duration: DURATION,
    colors: COLORS,
    particleSize: SIZE,
    force: FORCE,
    stageHeight: FLOOR_HEIGHT,
    stageWidth: FLOOR_WIDTH,
    shouldDestroyAfterDone: true,
    particlesShape: 'mix'
  }, inProps);
  const [isVisible, setVisible] = createSignal(true);
  const isValid = createMemo(() => validate(props.particleCount, props.duration, props.colors, props.particleSize, props.force, props.stageHeight, props.stageWidth, props.particlesShape));
  const particles = createMemo(() => createParticles(props.particleCount, props.colors));
  onMount(() => {
    const timeoutId = setTimeout(() => {
      if (props.shouldDestroyAfterDone) {
        setVisible(false);
      }
    }, props.duration);
    onCleanup(() => clearTimeout(timeoutId));
  });
  return createComponent(Show, {
    get when() {
      return isVisible() && isValid();
    },

    get children() {
      return createComponent(Confetti, {
        "class": "container",

        get style() {
          return {
            '--floor-height': `${props.stageHeight}px`
          };
        },

        get children() {
          return createComponent(For, {
            get each() {
              return particles();
            },

            children: particle => ssr(_tmpl$$1, ssrHydrationKey(), "--bgcolor:" + escape(particle.color, true))
          });
        }

      });
    }

  });
};

const yAxis = keyframes`
  to {
    transform: translate3d(0, var(--floor-height), 0);
  }
`;
const xAxis = keyframes`
  to {
    transform: translate3d(var(--x-landing-point), 0, 0);
  }
`;
const rotation = keyframes`
  to {
    transform: rotate3d(var(--rotation), 360deg);
  }
`;
const Confetti = styled('div')`
  width: 0;
  height: 0;
  overflow: visible;
  position: relative;
  transform: translate3d(var(--x, 0), var(--y, 0), 0);
  z-index: 1200;
  .particle {
    animation: ${xAxis} var(--duration-chaos) forwards
      cubic-bezier(var(--x1), var(--x2), var(--x3), var(--x4));
    div {
      position: absolute;
      top: 0;
      left: 0;
      animation: ${yAxis} var(--duration-chaos) forwards
        cubic-bezier(var(--y1), var(--y2), var(--y3), var(--y4));
      width: var(--width);
      height: var(--height);
      &:before {
        display: block;
        height: 100%;
        width: 100%;
        content: '';
        background-color: var(--bgcolor);
        animation: ${rotation} var(--rotation-duration) infinite linear;
        border-radius: var(--border-radius);
      }
    }
  }
`;

const _tmpl$ = ["<div", " style=\"", "\">", "</div>"];

const App = () => ssr(_tmpl$, ssrHydrationKey(), "display:" + "flex" + (";position:" + "fixed") + (";height:" + "100vh") + (";width:" + "100vw") + (";justify-content:" + "center") + (";text-align:" + "center") + (";align-items:" + "center"), escape(createComponent(ConfettiExplosion, {
  particleSize: 20,
  particlesShape: "circles",
  particleCount: 300
})));

var index = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  'default': App
}, Symbol.toStringTag, { value: 'Module' }));

export { entryServer as default };
