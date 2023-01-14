// @refresh reload
import { Suspense } from "solid-js";
import { Body, FileRoutes, ErrorBoundary, Routes, Html, Scripts } from "solid-start";

export default function Root() {
  return (
    <Html lang="en">
      <Body>
        <Suspense>
          <ErrorBoundary>
            <Routes>
              <FileRoutes />
            </Routes>
          </ErrorBoundary>
        </Suspense>
        <Scripts />
      </Body>
    </Html>
  );
}
