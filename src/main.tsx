/*
 * PolymagicPrice
 * Copyright (C) 2025 Rp Hobbyist
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// Trusted Types Default Policy is now registered via inline script in index.html for maximum early availability

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { StorageUnavailable } from "./components/StorageUnavailable";

import { initializeDefaults } from "./lib/core/sessionStorage";

// Disable right-click context menu globally
document.addEventListener('contextmenu', (event) => event.preventDefault());

/**
 * Seed storage, then mount.
 *
 * This call used to sit bare, above `createRoot`, and its first act is to touch `localStorage`.
 * Where a browser refuses that outright — site data blocked, some private-browsing modes, certain
 * enterprise policies — it threw before React existed, and the user was left looking at a blank
 * white page: no error screen, because the boundary below had not mounted yet.
 *
 * Everything this app does is local-first, so if it cannot keep data on the device it should say
 * so in words rather than appear broken.
 */
const root = createRoot(document.getElementById("root")!);

let storageReady = false;
try {
  storageReady = initializeDefaults();
} catch (err) {
  console.error("[Startup] Could not initialise local storage.", err);
}

if (storageReady) {
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
} else {
  root.render(<StorageUnavailable />);
}
