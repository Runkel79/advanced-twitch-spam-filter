// ==UserScript==
// @name         Twitch Spam Filter EN
// @namespace    https://github.com/Runkel79/advanced-twitch-spam-filter
// @version      1.24
// @description  Advanced Twitch chat spam filter with debug overlay, whitelist, and Ignore Replies.
// @match        https://www.twitch.tv/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

/*
================================================================================
                           TWITCH SPAM FILTER - USAGE
================================================================================

This script automatically filters spam messages in Twitch chat based on
various detection methods. It detects:

• Too many emotes per message
• Too high emote density (percentage display in debug window)
• Emote series (same emotes in a row)
• Emote trains (same emote combinations from multiple users)
• ASCII/Braille art
• Repeated messages (exact and similar)
• Copy/paste spam between different users
• All uppercase text
• Excessive character repetition (e.g., "GYATTTTT")

================================================================================
                                USAGE
================================================================================

F9 KEY:
- Toggles the debug overlay on/off
- Useful for quick show/hide during streaming

DRAG & DROP:
- The debug overlay can be moved with the mouse
- Click and drag it to the desired position on screen

DEBUG OVERLAY FUNCTIONS:
• Shows all filtered messages in real-time
• Detailed information about filter rules and thresholds
• Color highlighting: Green = set value, Red = reached value
• Buttons to turn filter and marking on/off
• Minimizable for better overview
• Counter for processed messages

IGNORE REPLIES:
- When enabled, messages that are threaded replies (e.g., "Replying to …") are skipped by the filter
- Helps keep threaded conversations intact and avoids over-filtering
- Toggle via the overlay button: "Ignore Replies"

PRIVILEGED USERS (automatic detection):
- Messages from moderators, the broadcaster (channel owner), VIPs, staff/partners/verified accounts, whitelisted users, and common/verified bots are never filtered
- Detection relies on robust Twitch DOM signals (user-type attributes, badges, and channel match) plus your `WHITELIST`
- Such messages are skipped by the filter and shown as "whitelisted" in the debug overlay

================================================================================
                                SETTINGS
================================================================================

All settings are located further down in the script in the
"SETTINGS (adjustable)" section. Each setting has a detailed explanation
with examples and recommended values directly above it.

IMPORTANT SETTINGS:
• WHITELIST: Add your channel name and trusted users here
• MAX_EMOTES: Maximum emotes per message (default: 6)
• EMOTE_DENSITY_THRESHOLD: Emote density threshold (default: 0.6 = 60%)
• SIMILARITY_THRESHOLD: Similarity threshold (default: 0.85)

================================================================================
*/

(function() {
    'use strict';

    // Avoid double instance
    if (window.__tsf_installed) return;
    window.__tsf_installed = true;

    /*********************
     * SETTINGS (adjustable)
     *********************/
    
    /*
     * MAX_EMOTES = 6
     * - What it does: Limits the maximum number of emotes per message
     * - Example: A message with 7 emotes will be detected as spam
     * - Recommended: 4-8 (6 is a good middle value)
     */
    const MAX_EMOTES = 6;

    /*
     * EMOTE_DENSITY_THRESHOLD = 0.6
     * - What it does: Detects messages with too high emote ratio
     * - Example: At 0.6 = 60% means: If more than 60% of the message consists of emotes, it's considered spam
     * - Example: "Hello 👋😊🎉" (3 emotes, 1 word) = 75% emotes → spam
     * - Recommended: 0.5-0.7 (0.6 is balanced)
     */
    const EMOTE_DENSITY_THRESHOLD = 0.6;

    /*
     * MAX_SAME_EMOTE_RUN = 3
     * - What it does: Detects series of the same emote
     * - Example: "😂😂😂😂" (4 same emotes) → spam
     * - Example: "😂😊😂😊😂" (5 different emotes) → OK
     * - Recommended: 2-4 (3 is a good middle value)
     */
    const MAX_SAME_EMOTE_RUN = 3;

    /*
     * GLOBAL_EMOTE_SIGNATURE_WINDOW_MS = 10000
     * - What it does: Time window in milliseconds for emote train detection
     * - Example: 10000 = 10 seconds. If multiple users post the same emote combination within 10 seconds, it's detected as spam
     * - Recommended: 5000-15000 (10000 = 10 seconds is balanced)
     */
    const GLOBAL_EMOTE_SIGNATURE_WINDOW_MS = 10000;

    /*
     * GLOBAL_EMOTE_TRAIN_THRESHOLD = 3
     * - What it does: Number of different users who must post the same emote combination before it's detected as emote train
     * - Example: At 3: If 3 different users post "😂😊🎉" within 10 seconds, it's detected as spam
     * - Recommended: 2-4 (3 is a good middle value)
     */
    const GLOBAL_EMOTE_TRAIN_THRESHOLD = 3;

    /*
     * ENABLE_ART_SPAM_DETECTION = true
     * - What it does: Activates/deactivates detection of Braille and ASCII art
     * - Recommended: true (for better spam protection)
     */
    const ENABLE_ART_SPAM_DETECTION = true;

    /*
     * ART_SPAM_MIN_LENGTH = 20
     * - What it does: Minimum text length from which Braille/ASCII art is checked
     * - Example: Short texts like "Hi" are not checked for art spam
     * - Recommended: 15-30 (20 is a good middle value)
     */
    const ART_SPAM_MIN_LENGTH = 20;

    /*
     * ART_SPAM_MIN_RATIO = 0.35
     * - What it does: Ratio of art characters from which a message is considered spam
     * - Example: At 0.35 = 35%: If more than 35% of characters are Braille/ASCII art, it's detected as spam
     * - Recommended: 0.3-0.5 (0.35 is balanced)
     */
    const ART_SPAM_MIN_RATIO = 0.35;

    /*
     * ART_SPAM_MIN_LINES = 2
     * - What it does: Alternative heuristic for multi-line messages
     * - Example: At 2 lines, a lower art character density is accepted
     * - Recommended: 2-3 (2 is a good middle value)
     */
    const ART_SPAM_MIN_LINES = 2;

    /*
     * ART_SPAM_MIN_RATIO_WITH_LINES = 0.2
     * - What it does: Art character density threshold for multi-line messages
     * - Example: At 2+ lines, only 20% art characters are sufficient for spam detection
     * - Recommended: 0.15-0.3 (0.2 is balanced)
     */
    const ART_SPAM_MIN_RATIO_WITH_LINES = 0.2;

    /*
     * TEXT_MIN_LENGTH = 6
     * - What it does: Minimum text length from which spam detection is activated
     * - Example: Short messages like "Hi" or "GG" are not checked
     * - Recommended: 4-8 (6 is a good middle value)
     */
    const TEXT_MIN_LENGTH = 6;

    /*
     * PER_USER_REPEAT_WINDOW_MS = 60000
     * - What it does: Time window in milliseconds for detecting repetitions from the same user
     * - Example: 60000 = 60 seconds. If a user posts the same message multiple times within 60 seconds, it's detected as spam
     * - Recommended: 30000-120000 (60000 = 1 minute is balanced)
     */
    const PER_USER_REPEAT_WINDOW_MS = 60000;

    /*
     * PER_USER_EXACT_REPEAT_THRESHOLD = 3
     * - What it does: Number of exact repetitions from which it's considered spam
     * - Example: At 3: A user may post the same message 2x, on the 3rd time it's detected as spam
     * - Recommended: 2-4 (3 is a good middle value)
     */
    const PER_USER_EXACT_REPEAT_THRESHOLD = 3;

    /*
     * PER_USER_SIMILAR_REPEAT_THRESHOLD = 3
     * - What it does: Number of similar repetitions from which it's considered spam
     * - Example: At 3: A user may post similar messages 2x, on the 3rd time it's detected as spam
     * - Recommended: 2-4 (3 is a good middle value)
     */
    const PER_USER_SIMILAR_REPEAT_THRESHOLD = 3;

    /*
     * GLOBAL_COPY_PASTE_WINDOW_MS = 8000
     * - What it does: Time window in milliseconds for global copy/paste detection
     * - Example: 8000 = 8 seconds. If different users post the same message within 8 seconds, it's detected as copy/paste spam
     * - Recommended: 5000-15000 (8000 = 8 seconds is balanced)
     */
    const GLOBAL_COPY_PASTE_WINDOW_MS = 8000;

    /*
     * GLOBAL_COPY_PASTE_MIN_LENGTH = 6
     * - What it does: Minimum text length for global copy/paste detection
     * - Example: Short messages like "Hi" are not checked for copy/paste
     * - Recommended: 4-8 (6 is a good middle value)
     */
    const GLOBAL_COPY_PASTE_MIN_LENGTH = 6;

    /*
     * SIMILARITY_THRESHOLD = 0.85
     * - What it does: Threshold for similarity detection (0.0 to 1.0)
     * - Example: At 0.85: Texts with 85% similarity are recognized as "similar"
     * - Example: "Hello World" and "Hello World!" are very similar
     * - Recommended: 0.8-0.9 (0.85 is a good middle value)
     */
    const SIMILARITY_THRESHOLD = 0.85;

    /*
     * ENABLE_UPPERCASE_FILTER = true
     * - What it does: Activates/deactivates filter for all uppercase text
     * - Example: "HELLO WORLD", "WOW AMAZING" are detected as spam
     * - Recommended: true (for better spam protection)
     */
    const ENABLE_UPPERCASE_FILTER = true;

    /*
     * ENABLE_REPETITION_FILTER = true
     * - What it does: Activates/deactivates filter for repeated characters
     * - Example: "GYATTTTT", "NOOOOO", "REEEEEEEE", "777777" are detected as spam
     * - Recommended: true (for better spam protection)
     */
    const ENABLE_REPETITION_FILTER = true;

    /*
     * MAX_CHAR_REPETITION = 4
     * - What it does: Maximum number of same characters in a row
     * - Example: At 4: "AAAAA" (5x A) is detected as spam, "AAAA" (4x A) is OK
     * - Recommended: 3-5 (4 is a good middle value)
     */
    const MAX_CHAR_REPETITION = 4;

    /*
     * WHITELIST = ["streamername", "vampire_laugh"]
     * - What it does: List of usernames that are never filtered
     * - Example: ["yourname", "moderator1", "vip_user"]
     * - IMPORTANT: Replace "streamername" with your actual channel name!
     * - Recommended: Add moderators, VIPs and trusted users here
     */
    const WHITELIST = [
        "streamername", // <-- enter your channel name here (without @)
        "example_name2"
    ];
    const KNOWN_BOTS = [
        // common bots on Twitch (automatically privileged)
        "nightbot",
        "streamelements",
        "moobot",
        "streamlabs",
        "fossabot",
        "soundalerts",
        "wizebot",
        "coebot",
        "stay_hydrated_bot",
        "anotherttvviewer"
    ];
    const STORAGE_KEY_FILTER = "tsf_filter_enabled_v1.14";
    const STORAGE_KEY_MARK = "tsf_mark_enabled_v1.14";
    const STORAGE_KEY_IGNORE_REPLIES = "tsf_ignore_replies_v1.20";
    // Debug verbosity for Emote-Train intermediate events
    const DEBUG_VERBOSE_EMOTE_TRAIN = false;
    const LEGACY_STORAGE_KEYS_FILTER = ["tsf_filter_enabled_v1.13","tsf_filter_enabled_v1.12","tsf_filter_enabled_v1.11","tsf_filter_enabled_v1.10","tsf_filter_enabled_v1.9","tsf_filter_enabled_v1.8","tsf_filter_enabled_v1.7"];
    const LEGACY_STORAGE_KEYS_MARK = ["tsf_mark_enabled_v1.13","tsf_mark_enabled_v1.12","tsf_mark_enabled_v1.11","tsf_mark_enabled_v1.10","tsf_mark_enabled_v1.9","tsf_mark_enabled_v1.8"]; // may not be present

    // filterEnabled is persisted (sync between menu & overlay)
    function readPersistedBool(currentKey, legacyKeys, defaultValue) {
        let v = localStorage.getItem(currentKey);
        if (v === null) {
            for (const k of legacyKeys) {
                const lv = localStorage.getItem(k);
                if (lv !== null) { v = lv; localStorage.setItem(currentKey, lv); break; }
            }
        }
        return v === null ? defaultValue : v === "true";
    }

    let filterEnabled = readPersistedBool(STORAGE_KEY_FILTER, LEGACY_STORAGE_KEYS_FILTER, true);
    let markEnabled = readPersistedBool(STORAGE_KEY_MARK, LEGACY_STORAGE_KEYS_MARK, true);
    let ignoreRepliesEnabled = readPersistedBool(STORAGE_KEY_IGNORE_REPLIES, [], true);

    /*********************
     * Debug Overlay (top right) — just as you liked it
     *********************/
    function createDebugOverlay() {
        const overlay = document.createElement("div");
        overlay.id = "tsf-debug-overlay";
        Object.assign(overlay.style, {
            position: "fixed",
            top: "12px",
            right: "12px",
            width: "500px",            // ~3x the old small size
            height: "360px",
            background: "rgba(0,0,0,0.75)",
            color: "#fff",
            fontSize: "12px",
            fontFamily: "monospace",
            padding: "8px",
            borderRadius: "8px",
            zIndex: 2147483647,
            overflow: "auto",
            boxShadow: "0 2px 12px rgba(0,0,0,0.6)",
            cursor: "default"
        });

        overlay.innerHTML = `
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <div style="font-weight:700">Twitch Spam Filter</div>
                <div style="display:flex;align-items:center;gap:8px">
                    <div style="font-size:10px;color:#aaa">
                        <span id="tsf-counter-total">0</span> messages processed
                    </div>
                    <div style="font-size:11px;opacity:0.9">v1.24</div>
                </div>
            </div>
            <div style="display:flex;gap:6px;margin-bottom:6px;flex-wrap:wrap">
                <button id="tsf-overlay-toggle-filter" style="flex:1;padding:5px;cursor:pointer">Filter: ${filterEnabled ? 'ON' : 'OFF'}</button>
                <button id="tsf-overlay-toggle-mark" style="flex:1;padding:5px;cursor:pointer">Marking: ${markEnabled ? 'ON' : 'OFF'}</button>
                <button id="tsf-overlay-toggle-ignore-replies" style="flex:1;padding:5px;cursor:pointer">Ignore Replies: ${ignoreRepliesEnabled ? 'ON' : 'OFF'}</button>
                <button id="tsf-overlay-min" title="Minimize" style="padding:5px;cursor:pointer">▾</button>
            </div>
            <div id="tsf-overlay-log" style="font-size:11px;color:#ddd;max-height:260px;overflow:auto;white-space:pre-wrap;-webkit-user-select:text;user-select:text;cursor:text"></div>
            <div id="tsf-overlay-note" style="font-size:10px;color:#bbb;margin-top:6px">F9 = Overlay On/Off | Drag = move</div>
        `;

        document.body.appendChild(overlay);
        // Default: hide overlay; F9 toggles on/off
        overlay.style.display = 'none';

        // Drag support
        makeDraggable(overlay);

        const btnFilter = document.getElementById("tsf-overlay-toggle-filter");
        const btnMark = document.getElementById("tsf-overlay-toggle-mark");
        const minBtn = document.getElementById("tsf-overlay-min");
        const btnIgnoreReplies = document.getElementById("tsf-overlay-toggle-ignore-replies");
        const log = document.getElementById("tsf-overlay-log");

        btnFilter.addEventListener("click", () => {
            filterEnabled = !filterEnabled;
            localStorage.setItem(STORAGE_KEY_FILTER, filterEnabled);
            btnFilter.textContent = `Filter: ${filterEnabled ? 'ON' : 'OFF'}`;
            addLog(`Overlay-Filter -> ${filterEnabled ? 'ON' : 'OFF'}`);
        });

        btnMark.addEventListener("click", () => {
            markEnabled = !markEnabled;
            localStorage.setItem(STORAGE_KEY_MARK, markEnabled);
            btnMark.textContent = `Marking: ${markEnabled ? 'ON' : 'OFF'}`;
            addLog(`Overlay-Marking -> ${markEnabled ? 'ON' : 'OFF'}`);
        });

        if (btnIgnoreReplies) {
            btnIgnoreReplies.addEventListener("click", () => {
                ignoreRepliesEnabled = !ignoreRepliesEnabled;
                localStorage.setItem(STORAGE_KEY_IGNORE_REPLIES, ignoreRepliesEnabled);
                btnIgnoreReplies.textContent = `Ignore Replies: ${ignoreRepliesEnabled ? 'ON' : 'OFF'}`;
                addLog(`Ignore Replies -> ${ignoreRepliesEnabled ? 'ON' : 'OFF'}`);
            });
        }

        let minimized = false;
        minBtn.addEventListener("click", () => {
            minimized = !minimized;
            if (minimized) {
                overlay.style.height = "34px";
                overlay.style.overflow = "hidden";
                minBtn.textContent = "▸";
                minBtn.title = "Expand";
                // Ensure minimize button stays visible
                minBtn.style.position = 'absolute';
                minBtn.style.top = '8px';
                minBtn.style.right = '8px';
            } else {
                overlay.style.height = "360px";
                overlay.style.overflow = "auto";
                minBtn.textContent = "▾";
                minBtn.title = "Minimize";
                // Reset button position
                minBtn.style.position = '';
                minBtn.style.top = '';
                minBtn.style.right = '';
            }
        });

        let logLines = 0;
        function addLog(line, isWhitelist=false) {
            const html = isWhitelist
                ? `<span style="color:#ffd54a">${line} (whitelisted)</span>`
                : line;
            log.insertAdjacentHTML('afterbegin', `${html}<br>`);
            logLines++;
            // Trim by removing lastChild nodes to cap DOM size
            const MAX_LINES = 800;
            while (logLines > MAX_LINES && log.lastChild) {
                log.removeChild(log.lastChild);
                logLines--;
            }
        }
        
        function updateCounter() {
            const counter = document.getElementById('tsf-counter-total');
            if (counter) {
                const current = parseInt(counter.textContent) || 0;
                counter.textContent = current + 1;
            }
        }

        return { overlay, addLog, updateCounter };
    }

    function makeDraggable(el) {
        let dragging = false, ox = 0, oy = 0;
        el.addEventListener('mousedown', (e) => {
            // don't drag when clicking on buttons/inputs or inside the log (allow text selection)
            if (e.target && (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.tagName === 'INPUT')) return;
            if (e.target && (e.target.closest && e.target.closest('#tsf-overlay-log'))) return;
            dragging = true;
            ox = e.clientX - el.offsetLeft;
            oy = e.clientY - el.offsetTop;
            el.style.cursor = 'grabbing';
        });
        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            el.style.left = Math.max(0, e.clientX - ox) + 'px';
            el.style.top = Math.max(0, e.clientY - oy) + 'px';
            el.style.right = 'auto';
            el.style.bottom = 'auto';
            el.style.position = 'fixed';
        });
        window.addEventListener('mouseup', () => {
            dragging = false;
            el.style.cursor = 'default';
        });
        // F9 to toggle overlay visibility
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                el.style.display = (el.style.display === 'none') ? '' : 'none';
            }
        });
    }



    const dbg = createDebugOverlay();

    /*********************
     * Helper functions
     *********************/
    function safeText(node) { return node && node.textContent ? node.textContent.trim() : ""; }
    // Try to get the message-only container (without username/badges)
    function getMessageContainer(node) {
        if (!node || !node.querySelector) return node;
        return node.querySelector('.message, [data-test-selector="message"]') || node;
    }

    // Try to read login from node
    function getUserLoginFromNode(node) {
        if (!node) return null;
        let el = node.querySelector && (node.querySelector('[data-a-user]') || node.querySelector('[data-user]'));
        if (el) {
            const v = el.getAttribute('data-a-user') || el.getAttribute('data-user');
            if (v) return v.toLowerCase();
        }
        // fallback: display name
        const nameEl = node.querySelector && (node.querySelector('.chat-author__display-name') || node.querySelector('.chat-line__username') || node.querySelector('[data-test-selector="chat-message-username"]'));
        if (nameEl) return safeText(nameEl).toLowerCase();
        return null;
    }

    // Detect if a chat line is a "Replying to" message (heuristics over Twitch DOM)
    function isReplyMessage(node) {
        try {
            if (!node || !node.querySelector) return false;
            const replySelectors = [
                '[data-a-target="chat-message-reply"]',
                '[data-a-target="chat-message-reply-link"]',
                '[data-test-selector="chat-message-reply"]',
                '.chat-line__reply',
                '.reply-line',
                '[aria-label*="replying to" i]',
                '[aria-label*="antwort" i]'
            ];
            for (const sel of replySelectors) {
                if (node.querySelector(sel)) return true;
            }
            // Fallback: visible text snippet like "Replying to"
            const textProbe = (node.innerText || '').toLowerCase();
            if (textProbe.startsWith('replying to ') || textProbe.includes('\nreplying to ')) return true;
            if (textProbe.startsWith('antwort an ') || textProbe.includes('\nantwort an ')) return true;
            return false;
        } catch (_) {
            return false;
        }
    }

    function looksLikeBot(nameOrLogin) {
        if (!nameOrLogin) return false;
        const s = nameOrLogin.toLowerCase();
        if (KNOWN_BOTS.includes(s)) return true;
        return /\b(bot|auto|daemon|service)\b/.test(s) || /\w+bot$/.test(s);
    }

    // Check if user is privileged (Mod/Streamer/VIP/Staff) — then don't filter
    const privilegedLoginCache = new Set();

    function getChannelLogin() {
        return (location.pathname.split('/')[1] || '').toLowerCase();
    }

    function isPrivileged(node) {
        try {
            if (!node) return false;
            const root = (node.closest && (node.closest('.chat-line__message-container') || node.closest('[data-test-selector="chat-line"]') || node.closest('.chat-line__message') || node.closest('.chat-line__message-wrapper'))) || node;
            // resolve login early for caching and list checks
            const login = getUserLoginFromNode(root);
            if (login && privilegedLoginCache.has(login)) return true;
            // data attributes (robust)
            const attr = root.querySelector && (root.querySelector('[data-a-user-type]') || root.querySelector('[data-user-type]'));
            if (attr) {
                const t = (attr.getAttribute('data-a-user-type') || attr.getAttribute('data-user-type') || '').toLowerCase();
                if (['mod','moderator','broadcaster','vip','staff','partner','verified'].includes(t)) {
                    if (login) privilegedLoginCache.add(login);
                    return true;
                }
            }
            // Badges (schneller Pfad): Twitch/FFZ Badges mit data-badge-Attribut
            const fastBadges = root.querySelectorAll && root.querySelectorAll('.chat-line__message--badges [data-badge], [data-badge]');
            for (let b of fastBadges || []) {
                const badgeType = (b.getAttribute && (b.getAttribute('data-badge') || '')).toLowerCase();
                if (['moderator','broadcaster','vip','staff','partner','verified','bot-badge'].some(x => badgeType.includes(x))) {
                    if (login) privilegedLoginCache.add(login);
                    return true;
                }
            }
            // Badges (Fallback alt/title/aria-label)
            const badges = root.querySelectorAll && root.querySelectorAll('img, svg, span');
            for (let b of badges || []) {
                const alt = (b.getAttribute && b.getAttribute('alt')) || '';
                const title = (b.getAttribute && b.getAttribute('title')) || '';
                const aria = (b.getAttribute && b.getAttribute('aria-label')) || '';
                const txt = (alt + ' ' + title + ' ' + aria).toLowerCase();
                if (
                    txt.includes('moderator') ||
                    txt.includes('broadcaster') ||
                    txt.includes('vip') ||
                    txt.includes('streamer') ||
                    txt.includes('owner') ||
                    txt.includes('staff') ||
                    txt.includes('partner') ||
                    txt.includes('verified') ||
                    // recognized badge descriptions for bots (incl. Verified Bot)
                    txt.includes('verified bot') ||
                    txt.includes('verifizierter bot') ||
                    (txt.includes('bot') && (txt.includes('badge') || txt.includes('verifiziert') || txt.includes('verified')))
                ) {
                    if (login) privilegedLoginCache.add(login);
                    return true;
                }
            }
            // login == channel owner
            const channelLogin = getChannelLogin();
            if (login && channelLogin && login === channelLogin) {
                privilegedLoginCache.add(login);
                return true;
            }
            // whitelist or bot heuristic
            if (login && (WHITELIST.includes(login) || KNOWN_BOTS.includes(login) || looksLikeBot(login))) {
                privilegedLoginCache.add(login);
                return true;
            }
            return false;
        } catch (e) {
            dbg.addLog('isPrivileged error: ' + (e && e.message ? e.message : e));
            return false;
        }
    }

    /*********************
     * Spam detection (as in v1.6, minimally adapted)
     *********************/
    const recentMessages = {}; // per user
    let recentGlobal = [];     // for copy/paste detection
    let recentGlobalEmoteSignatures = []; // for emote-train detection
    let lastSimilarDebug = null; // debug info for similar message triggers

    function extractTextAndEmotes(node) {
        const base = getMessageContainer(node);
        // count <img> emotes within the message container
        const imgs = base.querySelectorAll ? base.querySelectorAll('img') : [];
        let emoteCount = 0;
        const emoteCodes = [];
        for (let img of imgs) {
            const cls = (img.className || '').toLowerCase();
            const alt = (img.getAttribute && (img.getAttribute('alt') || img.getAttribute('title') || '')).toLowerCase();
            const parentCls = (img.parentElement && img.parentElement.className) ? img.parentElement.className.toLowerCase() : '';
            if (/emot|emoji|bttv|7tv|ffz|cheer|emote/.test(cls + parentCls + alt)) {
                emoteCount++;
                // Prefer robust identifiers from extensions/providers
                const provider = (img.getAttribute && (img.getAttribute('data-provider') || '')) || '';
                const dataId = (img.getAttribute && (img.getAttribute('data-id') || img.getAttribute('data-emote-id') || '')) || '';
                const dataName = (img.getAttribute && (img.getAttribute('data-name') || img.getAttribute('data-emote-name') || '')) || '';
                // Normalize emote code: prefer provider:id, then provider:name, then alt, finally src filename
                let code = '';
                if (provider && dataId) {
                    code = `${provider}:${dataId}`.toLowerCase();
                } else if (provider && dataName) {
                    code = `${provider}:${dataName}`.toLowerCase();
                } else if (dataId) {
                    code = dataId.toLowerCase();
                } else if (dataName) {
                    code = dataName.toLowerCase();
                } else if (alt && alt.trim()) {
                    code = alt.replace(/\s+/g, ' ').trim().toLowerCase();
                } else {
                    const srcParts = (img.src || '').split('/');
                    const filename = srcParts[srcParts.length - 1] || '';
                    code = filename.split('.')[0].toLowerCase();
                }
                // Add code preserving order and duplicates (needed for run-length & signature)
                if (code) {
                    emoteCodes.push(code);
                }
            }
        }
        // Prefer concatenating text fragments inside the message
        let text = '';
        if (base.querySelectorAll) {
            const parts = base.querySelectorAll('[data-a-target="chat-message-text"], .text-fragment, .link-fragment');
            if (parts && parts.length) {
                text = Array.from(parts).map(el => el.textContent || '').join(' ').trim();
            }
        }
        if (!text) text = safeText(base) || '';
        return { text, emoteCount, emoteCodes };
    }

    // ---------- Similarity detection ----------
    function createBigrams(input) {
        const s = (input || '').toLowerCase();
        const cleaned = s
            .normalize('NFKD')
            .replace(/[^\p{Letter}\p{Number}\s]/gu, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned.length < 2) return [];
        const grams = [];
        for (let i = 0; i < cleaned.length - 1; i++) {
            grams.push(cleaned.slice(i, i + 2));
        }
        return grams;
    }

    function diceCoefficient(a, b) {
        if (!a || !b) return 0;
        if (a === b) return 1;
        const A = createBigrams(a);
        const B = createBigrams(b);
        if (!A.length || !B.length) return 0;
        const mapA = new Map();
        for (const g of A) mapA.set(g, (mapA.get(g) || 0) + 1);
        let intersection = 0;
        const mapB = new Map();
        for (const g of B) mapB.set(g, (mapB.get(g) || 0) + 1);
        for (const [g, cntA] of mapA) {
            const cntB = mapB.get(g) || 0;
            intersection += Math.min(cntA, cntB);
        }
        return (2 * intersection) / (A.length + B.length);
    }

    function similarityScore(a, b) {
        if (!a || !b) return 0;
        if (a === b) return 1;
        const cleanA = removeEmotes(a);
        const cleanB = removeEmotes(b);
        if (!cleanA || !cleanB) return 0;
        if (cleanA === cleanB) return 1;
        return diceCoefficient(cleanA, cleanB);
    }

    // For inputs that are already cleaned (lowercased, punctuation stripped, emotes removed)
    function similarityScoreClean(cleanA, cleanB) {
        if (!cleanA || !cleanB) return 0;
        if (cleanA === cleanB) return 1;
        return diceCoefficient(cleanA, cleanB);
    }

    function areTextsSimilar(a, b) {
        if (!a || !b) return false;
        if (a === b) return true;
        if (Math.min(a.length, b.length) < 6) return false;
        return similarityScore(a, b) >= SIMILARITY_THRESHOLD;
    }
    
    // Helper function to remove emotes from text
    function removeEmotes(text) {
        if (!text) return '';
        // Remove emoji-like characters (simple heuristic)
        // Unicode ranges for emojis, symbols, etc.
        return text
            .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
            .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Various symbols and pictograms
            .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and map symbols
            .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Flags
            .replace(/[\u{2600}-\u{26FF}]/gu, '')   // Various symbols
            .replace(/[\u{2700}-\u{27BF}]/gu, '')   // Dingbats
            .replace(/[\u{FE00}-\u{FE0F}]/gu, '')   // Variation selectors
            .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental symbols and pictograms
            .replace(/[\u{1F018}-\u{1F270}]/gu, '') // Various symbols
            .replace(/\s+/g, ' ') // Multiple spaces to one
            .trim();
    }

    function mostCommonRunLength(codes) {
        if (!codes || codes.length === 0) return 0;
        let best = 1, run = 1;
        for (let i = 1; i < codes.length; i++) {
            if (codes[i] === codes[i - 1]) {
                run++;
                if (run > best) best = run;
            } else {
                run = 1;
            }
        }
        return best;
    }

    function emoteSignature(codes) {
        // signature with limited length so performance stays good
        // Normalize codes to ensure consistent comparison
        const normalized = (codes || [])
            .filter(c => c && c.trim()) // Remove empty codes
            .slice(0, 12)
            .map(c => c.toLowerCase().trim()); // Ensure lowercase and trimmed
        return normalized.join('|');
    }

    // Helper function for uppercase filter
    function isAllUppercase(text) {
        if (!text || text.length < 3) return false;
        const letters = text.replace(/[^a-zA-Z]/g, ''); // Only letters
        if (letters.length === 0) return false;
        return letters === letters.toUpperCase();
    }

    // Helper function for repeated characters
    function hasExcessiveRepetition(text) {
        if (!text || text.length < 3) return false;
        let maxRepetition = 1;
        let currentRepetition = 1;
        
        for (let i = 1; i < text.length; i++) {
            if (text[i] === text[i-1]) {
                currentRepetition++;
                maxRepetition = Math.max(maxRepetition, currentRepetition);
            } else {
                currentRepetition = 1;
            }
        }
        
        return maxRepetition > MAX_CHAR_REPETITION;
    }

    function checkForSpamDetailed(user, text, emoteCount, emoteCodes) {
        const now = Date.now();
        if (!user) user = 'unknown';
        // 1) user whitelist / privileged check handled before calling this function

        // 2) emote limit
        if (emoteCount > MAX_EMOTES) {
            dbg.addLog(`Emote limit exceeded: ${emoteCount}/${MAX_EMOTES}`);
            return `Too many emotes (Limit: <span style=\"color: #00ff00\">${MAX_EMOTES}</span> | Reached: <span style=\"color: #ff0000\">${emoteCount}</span>)`;
        }
        // 2a) Emote density
        const wordCount = (text.trim().match(/\S+/g) || []).length;
        const tokensTotal = wordCount + emoteCount;
        if (tokensTotal >= 3) {
            const emoteDensity = emoteCount / tokensTotal;
            if (emoteDensity > EMOTE_DENSITY_THRESHOLD) {
                const percentage = Math.round(emoteDensity * 100);
                const thresholdPercent = Math.round(EMOTE_DENSITY_THRESHOLD * 100);
                return `Too high emote density (Limit: <span style="color: #00ff00">${thresholdPercent}%</span> | Reached: <span style="color: #ff0000">${percentage}%</span>)`;
            }
        }
        // 2b) Long series of the same emote
        const maxRun = mostCommonRunLength(emoteCodes);
        if (maxRun > MAX_SAME_EMOTE_RUN) return `Emote series (Limit: <span style="color: #00ff00">${MAX_SAME_EMOTE_RUN}</span> | Reached: <span style="color: #ff0000">${maxRun}</span>)`;

        // 2c) Single emote only: handled implicitly by global emote-train (step 5)

        // 2d) Uppercase filter
        if (ENABLE_UPPERCASE_FILTER && isAllUppercase(text)) {
            return 'All uppercase';
        }

        // 2e) Repeated characters filter
        if (ENABLE_REPETITION_FILTER && hasExcessiveRepetition(text)) {
            return `Repeated characters (Limit: <span style="color: #00ff00">${MAX_CHAR_REPETITION}</span>)`;
        }

        // 2f) Braille/ASCII art detection
        if (ENABLE_ART_SPAM_DETECTION) {
            const t = (text || '').replace(/\s+/g, ' ').trim();
            if (t.length >= ART_SPAM_MIN_LENGTH) {
                // Unicode Braille block U+2800–U+28FF, blocks and line elements, Box Drawings, Block Elements, Symbols
                const artRegex = /[\u2800-\u28FF\u2500-\u257F\u2580-\u259F\u25A0-\u25FF\u2200-\u22FF\u0300-\u036F]/g;
                const matches = t.match(artRegex) || [];
                const ratio = matches.length / t.length;
                const lineCount = (text.match(/\n/g) || []).length + 1;
                if (lineCount >= ART_SPAM_MIN_LINES) {
                    if (ratio >= ART_SPAM_MIN_RATIO_WITH_LINES) {
                        const ratioPercent = Math.round(ratio * 100);
                        const thresholdPercent = Math.round(ART_SPAM_MIN_RATIO_WITH_LINES * 100);
                        return `ASCII/Braille Art (Limit: <span style="color: #00ff00">${thresholdPercent}%</span> | Reached: <span style="color: #ff0000">${ratioPercent}%</span>)`;
                    }
                } else if (ratio >= ART_SPAM_MIN_RATIO) {
                    const ratioPercent = Math.round(ratio * 100);
                    const thresholdPercent = Math.round(ART_SPAM_MIN_RATIO * 100);
                    return `ASCII/Braille Art (Limit: <span style="color: #00ff00">${thresholdPercent}%</span> | Reached: <span style="color: #ff0000">${ratioPercent}%</span>)`;
                }
            }
        }

        // 3) repeat per user (ignore very short texts)
        const cleaned = text.toLowerCase().split(/\s+/).filter(w => w.length >= 3).join(' ');
        if (!recentMessages[user]) recentMessages[user] = [];
        if (cleaned && cleaned.length >= 3) {
            recentMessages[user].push({ text: cleaned, raw: text, time: now });
            // keep last 6
            if (recentMessages[user].length > 6) recentMessages[user].shift();
        }
        // count duplicates equal to last message
        const duplicates = cleaned ? recentMessages[user].filter(m => m.text === cleaned && now - m.time < PER_USER_REPEAT_WINDOW_MS).length : 0;
        if (cleaned && cleaned.length >= TEXT_MIN_LENGTH && duplicates >= PER_USER_EXACT_REPEAT_THRESHOLD) return `Repetition (Limit: <span style="color: #00ff00">${PER_USER_EXACT_REPEAT_THRESHOLD}</span> | Reached: <span style="color: #ff0000">${duplicates}</span>)`;
        // fuzzy similarity repeats within last 60s
        let similarCount = 0;
        let bestSimilar = null; // {raw,text,score}
        if (cleaned) {
            const candidates = recentMessages[user].filter(m => now - m.time < PER_USER_REPEAT_WINDOW_MS);
            for (const m of candidates) {
                const score = similarityScoreClean(m.text, cleaned);
                if (score >= SIMILARITY_THRESHOLD) {
                    similarCount++;
                    if (!bestSimilar || score > bestSimilar.score) bestSimilar = { raw: m.raw || m.text, text: m.text, score };
                }
            }
        }
        if (cleaned && cleaned.length >= TEXT_MIN_LENGTH && similarCount >= PER_USER_SIMILAR_REPEAT_THRESHOLD) {
            lastSimilarDebug = { kind: 'per-user-similar', filteredText: text, triggerText: bestSimilar ? bestSimilar.raw : undefined, triggerUser: user };
            return `Similar messages (Threshold: <span style="color: #00ff00">${SIMILARITY_THRESHOLD}</span> | Found: <span style="color: #ff0000">${similarCount}</span>)`;
        }

        // 4) copy-paste global
        recentGlobal = recentGlobal.filter(m => now - m.time < GLOBAL_COPY_PASTE_WINDOW_MS);
        if (cleaned && cleaned.length >= GLOBAL_COPY_PASTE_MIN_LENGTH) {
            const exact = recentGlobal.find(m => m.text === cleaned && m.user !== user);
            if (exact) return 'Copy-Paste (Exact match)';
            let bestGlobal = null; // {user, raw, score}
            for (const m of recentGlobal) {
                if (m.user === user) continue;
                const score = similarityScoreClean(m.text, cleaned);
                if (score >= SIMILARITY_THRESHOLD) {
                    if (!bestGlobal || score > bestGlobal.score) bestGlobal = { user: m.user, raw: m.raw || m.text, score };
                }
            }
            if (bestGlobal) {
                lastSimilarDebug = { kind: 'global-similar', filteredText: text, triggerText: bestGlobal.raw, triggerUser: bestGlobal.user };
                return `Copy-Paste (similar: Threshold <span style="color: #00ff00">${SIMILARITY_THRESHOLD}</span> reached)`;
            }
            recentGlobal.push({ user, text: cleaned, raw: text, time: now });
        }

        // 5) Emote-Train global (same emote signature multiple times from different users)
        recentGlobalEmoteSignatures = recentGlobalEmoteSignatures.filter(m => now - m.time < GLOBAL_EMOTE_SIGNATURE_WINDOW_MS);
        // Only check for emote trains if we have at least 1 emote
        if (emoteCodes && emoteCodes.length > 0) {
            const sig = emoteSignature(emoteCodes);
            if (sig && sig.length) {
                // Count distinct users for this signature in the window
                const distinctUsers = new Set();
                for (const m of recentGlobalEmoteSignatures) {
                    if (m.sig === sig && m.user) distinctUsers.add(m.user);
                }
                const countSig = distinctUsers.has(user) ? distinctUsers.size : distinctUsers.size + 1;
                if (countSig >= GLOBAL_EMOTE_TRAIN_THRESHOLD) {
                    if (DEBUG_VERBOSE_EMOTE_TRAIN) dbg.addLog(`Emote-Train hit: sig="${sig}" users=${countSig}/${GLOBAL_EMOTE_TRAIN_THRESHOLD}`);
                    return `Emote-Train (Limit: <span style="color: #00ff00">${GLOBAL_EMOTE_TRAIN_THRESHOLD}</span> | Reached: <span style="color: #ff0000">${countSig}</span>)`;
                }
                // Add this signature to the list (only if it wasn't filtered)
                recentGlobalEmoteSignatures.push({ user, sig, time: now });
                if (DEBUG_VERBOSE_EMOTE_TRAIN) dbg.addLog(`Emote-Train seen: sig="${sig}" now=${distinctUsers.size + (distinctUsers.has(user) ? 0 : 1)}`);
            }
        }

        return false;
    }

    /*********************
     * Chat Observer
     *********************/
    let chatObserver = null;
    const pendingMsgNodes = [];
    let processingScheduled = false;

    function scheduleProcessing() {
        if (processingScheduled) return;
        processingScheduled = true;
        (window.requestAnimationFrame || window.setTimeout)(processPending, 0);
    }

    function processPending() {
        processingScheduled = false;
        // process up to N nodes per frame to keep UI responsive
        const MAX_PER_TICK = 80;
        let count = 0;
        while (pendingMsgNodes.length && count < MAX_PER_TICK) {
            const { node } = pendingMsgNodes.shift();
            try {
                handleChatNode(node);
            } catch (e) {
                // swallow per-node errors to keep batch alive
            }
            count++;
        }
        if (pendingMsgNodes.length) scheduleProcessing();
    }

    function handleChatNode(msgNode) {
        const root = (msgNode.closest && (msgNode.closest('.chat-line__message-container') || msgNode.closest('[data-test-selector="chat-line"]') || msgNode.closest('.chat-line__message') || msgNode.closest('.chat-line__message-wrapper'))) || msgNode;
        // find user and message (best-effort)
        const userEl = root.querySelector('.chat-author__display-name, .chat-line__username, [data-test-selector="chat-message-username"]') || root.querySelector('[data-a-user]') || null;
        const msgEl = getMessageContainer(root);
        if (!userEl || !msgEl) return;

        // replies ignore
        if (ignoreRepliesEnabled && isReplyMessage(root)) return;

        // privileged check -> mark yellow and skip
        if (isPrivileged(root)) {
            // Nur im Debug gelb markieren (kein Styling im Chat)
            dbg.addLog(`Whitelist/Privileged: ${safeText(userEl)}`, true);
            return;
        }

        const user = getUserLoginFromNode(root) || safeText(userEl) || 'unknown';
        const { text, emoteCount, emoteCodes } = extractTextAndEmotes(msgEl);
        // Allow processing even if text is empty (emote-only messages)
        if (!text && (!emoteCodes || emoteCodes.length === 0)) return;

        const reason = checkForSpamDetailed(user, text, emoteCount, emoteCodes);
        if (reason) {
            if (filterEnabled) {
                root.style.display = 'none';
                dbg.addLog(`Hidden (${reason}) - ${user}`);
                dbg.updateCounter();
            } else {
                if (markEnabled) {
                    root.style.background = "rgba(255,0,0,0.15)";
                    dbg.addLog(`Marked (${reason}) - ${user}`);
                    dbg.updateCounter();
                } else {
                    dbg.addLog(`Detected (${reason}) - ${user}`);
                }
            }
            if (lastSimilarDebug && lastSimilarDebug.filteredText === text) {
                const tUser = lastSimilarDebug.triggerUser ? ` by ${lastSimilarDebug.triggerUser}` : '';
                const filteredPreview = (text || '').slice(0, 180);
                const triggerPreview = (lastSimilarDebug.triggerText || '').slice(0, 180);
                dbg.addLog(`Similar pair → Filtered: "${filteredPreview}" ↔ Trigger: "${triggerPreview}"${tUser}`);
                lastSimilarDebug = null;
            }
        }
    }
    function findChatContainer() {
        const selectors = [
            '.chat-scrollable-area__message-container',
            '[data-test-selector="chat-scroll-list"]',
            '.chat-lines'
        ];
        for (let s of selectors) {
            const el = document.querySelector(s);
            if (el) return el;
        }
        // fallback
        return document.querySelector('[role="log"], section[aria-label*="Chat"], section[aria-label*="chat"]');
    }

    function observeChat() {
        try {
            if (chatObserver) return;
            const chat = findChatContainer();
            if (!chat) {
                dbg.addLog('No chat container found, retry...');
                setTimeout(observeChat, 1000);
                return;
            }
            dbg.addLog('Chat container found.');

            chatObserver = new MutationObserver(mutations => {
                for (let mut of mutations) {
                    for (let node of mut.addedNodes) {
                        if (!(node instanceof HTMLElement)) continue;
                        // robust: node itself might be a chat line or wrapper
                        const msgNode = (node.matches && (node.matches('.chat-line__message') || node.matches('.chat-line__message-wrapper') || node.matches('[data-test-selector="chat-line"]'))) ? node : (node.querySelector && (node.querySelector('.chat-line__message') || node.querySelector('.text-fragment') || node.querySelector('[data-a-user]'))) ? node : null;
                        if (!msgNode) continue;
                        pendingMsgNodes.push({ node: msgNode });
                    }
                }
                if (pendingMsgNodes.length) scheduleProcessing();
            });

            chatObserver.observe(chat, { childList: true, subtree: true });
            dbg.addLog('Chat observer active.');
        } catch (e) {
            dbg.addLog('observeChat error: ' + (e && e.message ? e.message : e));
        }
    }

    // Chat menu integration was removed. Control is exclusively through the overlay.

    /*********************
     * Startup
     *********************/
    function startup() {
        dbg.addLog('Starting Twitch Spam Filter v1.24...');
        observeChat();
    }

    startup();

})();
