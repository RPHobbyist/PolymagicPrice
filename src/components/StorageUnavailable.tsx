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

/**
 * Shown instead of the app when the browser refuses access to local storage.
 *
 * Deliberately plain: no router, no UI kit, no context. This is the one screen that has to render
 * when nothing else can, so it depends on nothing but React and the stylesheet. Previously this
 * situation produced a blank white page.
 */
export const StorageUnavailable = () => (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-6">
        <div className="max-w-lg w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 text-slate-200">
            <h1 className="text-2xl font-bold text-white mb-3">
                PolymagicPrice cannot store data in this browser
            </h1>

            <p className="text-slate-400 leading-relaxed mb-5">
                The app keeps your quotes, machines and materials on your own device — it has no
                server to fall back on. This browser is refusing access to local storage, so there
                is nowhere to put them.
            </p>

            <p className="text-slate-300 font-semibold mb-2">This is usually one of:</p>
            <ul className="list-disc list-inside space-y-1.5 text-slate-400 mb-6">
                <li>Private or incognito browsing with site data disabled</li>
                <li>Cookies and site data blocked for this site</li>
                <li>A browser extension or workplace policy blocking local storage</li>
            </ul>

            <p className="text-slate-400 leading-relaxed mb-6">
                Allow site data for this address and reload, open it in a normal window, or use the
                desktop app, which stores everything locally with no browser restrictions.
            </p>

            <div className="flex flex-wrap gap-3">
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-400 transition-colors"
                >
                    Reload
                </button>
                <a
                    href="https://github.com/RPHobbyist/PolymagicPrice/releases"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 rounded-lg border border-slate-700 text-slate-200 font-semibold hover:bg-slate-800 transition-colors"
                >
                    Get the desktop app
                </a>
            </div>
        </div>
    </div>
);

export default StorageUnavailable;
