// --- State ---
let currentTab = 'html';
let autoSaveInterval;
let editors = {};
let currentView = 'both';
let inputEditor, outputEditor;

// --- Editor Settings ---
let editorSettings = {
    fontSize: 14,
    fontFamily: '"JetBrains Mono", monospace',
    lineHeight: 0,
    wordWrap: 'off',
    minimap: true,
    lineNumbers: 'on',
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    tabSize: 4,
    insertSpaces: true,
    renderWhitespace: 'none',
    renderLineHighlight: 'all',
    renderIndentGuides: true,
    cursorStyle: 'line',
    cursorBlinking: 'blink',
    scrollBeyondLastLine: true,
    smoothScrolling: false,
    mouseWheelZoom: false,
    roundedSelection: false,
    formatOnPaste: false,
    formatOnType: false,
    suggestOnTriggerCharacters: true,
    acceptSuggestionOnEnter: 'on',
    quickSuggestions: {
        other: true,
        comments: false,
        strings: true
    },
    quickSuggestionsDelay: 100,
    autoIndent: 'full',
    bracketPairColorization: true,
    colorDecorators: true,
    folding: true,
    showFoldingControls: 'mouseover',
    matchBrackets: 'always',
    occurrencesHighlight: true,
    selectionHighlight: true,
    codeLens: false,
    links: true,
    multiCursorModifier: 'alt',
    dragAndDrop: true,
    emptySelectionClipboard: true,
    copyWithSyntaxHighlighting: true,
    cursorSmoothCaretAnimation: false,
    cursorSurroundingLines: 0,
    cursorSurroundingLinesStyle: 'default',
    stickyScroll: { enabled: false },
    guides: { bracketPairs: true }
};

const bracketSettings = {
    bracketPairColorization: true,
    matchingBrackets: 'always',
    coloredBrackets: true
};

const elements = {
    settingsSidebar: {
        get overlay() { return document.getElementById('settingsOverlay'); },
        get sidebar() { return document.getElementById('settingsSidebar'); },
        get body() { return document.getElementById('settingsSidebarBody'); }
    }
};

loadSettings();

/** Buduje HTML custom select (ja-select-wrap) dla ustawień. options: [{ value, label }], currentValue z editorSettings. */
function buildJaSelect(settingKey, options, currentValue) {
    const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    const currentOption = options.find((o) => String(o.value) === String(currentValue));
    const currentLabel = currentOption ? currentOption.label : options[0].label;
    const items = options
        .map(
            (o) =>
                `<div class="ja-select-item ${String(o.value) === String(currentValue) ? 'ja-selected' : ''}" data-value="${esc(o.value)}"><span class="ja-select-prefix">»</span>${esc(o.label)}</div>`
        )
        .join('');
    return `<div class="ja-select-wrap" data-setting="${esc(settingKey)}">
  <button type="button" class="ja-select-btn">
    <span class="ja-select-label">${esc(currentLabel)}</span>
    <span class="ja-select-arrow">▼</span>
  </button>
  <div class="ja-select-list">${items}</div>
</div>`;
}

function bindJaSelects(container) {
    if (!container) return;
    const closeAll = () => {
        document.querySelectorAll('.ja-select-list.ja-visible').forEach((list) => list.classList.remove('ja-visible'));
        document.querySelectorAll('.ja-select-btn.ja-open').forEach((btn) => btn.classList.remove('ja-open'));
    };
    container.querySelectorAll('.ja-select-wrap').forEach((wrap) => {
        const btn = wrap.querySelector('.ja-select-btn');
        const list = wrap.querySelector('.ja-select-list');
        const labelEl = wrap.querySelector('.ja-select-label');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = list.classList.contains('ja-visible');
            closeAll();
            if (!isOpen) {
                list.classList.add('ja-visible');
                btn.classList.add('ja-open');
            }
        });
        wrap.querySelectorAll('.ja-select-item').forEach((item) => {
            item.addEventListener('click', () => {
                const key = wrap.dataset.setting;
                let v = item.getAttribute('data-value');
                if (v === 'true') v = true;
                else if (v === 'false') v = false;
                updateSetting(key, v);
                const prefix = item.querySelector('.ja-select-prefix');
                labelEl.textContent = prefix ? item.textContent.replace(prefix.textContent, '').trim() : item.textContent.trim();
                wrap.querySelectorAll('.ja-select-item').forEach((i) => i.classList.remove('ja-selected'));
                item.classList.add('ja-selected');
                list.classList.remove('ja-visible');
                btn.classList.remove('ja-open');
            });
        });
    });
    if (!window._jaSelectDocBound) {
        window._jaSelectDocBound = true;
        document.addEventListener('click', (e) => {
            if (e.target.closest('.ja-select-wrap')) return;
            closeAll();
        });
    }
}

function getEditorOptions() {
    const currentTheme = localStorage.getItem('theme') || 'dark';
    const monacoTheme = currentTheme === 'dark' ? 'terminal-dark' : 'terminal-light';

    return {
        fontSize: editorSettings.fontSize,
        fontFamily: editorSettings.fontFamily,
        lineHeight: editorSettings.lineHeight || 0,
        automaticLayout: true,
        wordWrap: editorSettings.wordWrap || 'off',
        minimap: { enabled: editorSettings.minimap },
        lineNumbersMinChars: 2,
        lineDecorationsWidth: 8,
        theme: monacoTheme,
        cursorBlinking: editorSettings.cursorBlinking || 'blink',
        cursorStyle: editorSettings.cursorStyle || 'line',
        cursorSmoothCaretAnimation: editorSettings.cursorSmoothCaretAnimation || false,
        cursorSurroundingLines: editorSettings.cursorSurroundingLines || 0,
        cursorSurroundingLinesStyle: editorSettings.cursorSurroundingLinesStyle || 'default',
        scrollBeyondLastLine: editorSettings.scrollBeyondLastLine !== false,
        roundedSelection: editorSettings.roundedSelection || false,
        renderLineHighlight: editorSettings.renderLineHighlight || 'all',
        renderIndentGuides: editorSettings.renderIndentGuides !== false,
        tabSize: editorSettings.tabSize || 4,
        insertSpaces: editorSettings.insertSpaces !== false,
        renderWhitespace: editorSettings.renderWhitespace || 'none',
        formatOnPaste: editorSettings.formatOnPaste || false,
        formatOnType: editorSettings.formatOnType || false,
        autoIndent: editorSettings.autoIndent || 'full',
        bracketPairColorization: { enabled: editorSettings.bracketPairColorization !== false },
        matchBrackets: editorSettings.matchBrackets || 'always',
        guides: editorSettings.guides || { bracketPairs: true },
        autoClosingBrackets: editorSettings.autoClosingBrackets || 'always',
        autoClosingQuotes: editorSettings.autoClosingQuotes || 'always',
        suggestOnTriggerCharacters: editorSettings.suggestOnTriggerCharacters !== false,
        acceptSuggestionOnEnter: editorSettings.acceptSuggestionOnEnter || 'on',
        acceptSuggestionOnCommitCharacter: true,
        quickSuggestions: editorSettings.quickSuggestions || { other: true, comments: false, strings: true },
        quickSuggestionsDelay: editorSettings.quickSuggestionsDelay || 100,
        snippetSuggestions: 'top',
        wordBasedSuggestions: 'matchingDocuments',
        suggestSelection: 'first',
        tabCompletion: 'on',
        suggestLocality: 'recentFiles',
        suggest: {
            showKeywords: true, showSnippets: true, showClasses: true, showFunctions: true,
            showVariables: true, showFields: true, showInterfaces: true, showStructs: true,
            showModules: true, showProperties: true, showEvents: true, showOperators: true,
            showUnits: true, showValues: true, showConstants: true, showEnums: true,
            showEnumMembers: true, showColors: true, showFiles: true, showReferences: true,
            showFolders: true, showTypeParameters: true, showIssues: true, showUsers: true,
            showText: true, showCustomcolors: true, showIcons: true
        },
        parameterHints: { enabled: true, cycle: false },
        occurrencesHighlight: editorSettings.occurrencesHighlight !== false,
        selectionHighlight: editorSettings.selectionHighlight !== false,
        colorDecorators: editorSettings.colorDecorators !== false,
        folding: editorSettings.folding !== false,
        showFoldingControls: editorSettings.showFoldingControls || 'mouseover',
        codeLens: editorSettings.codeLens || false,
        links: editorSettings.links !== false,
        mouseWheelZoom: editorSettings.mouseWheelZoom || false,
        multiCursorModifier: editorSettings.multiCursorModifier || 'alt',
        dragAndDrop: editorSettings.dragAndDrop !== false,
        emptySelectionClipboard: editorSettings.emptySelectionClipboard !== false,
        copyWithSyntaxHighlighting: editorSettings.copyWithSyntaxHighlighting !== false,
        smoothScrolling: editorSettings.smoothScrolling || false,
        stickyScroll: editorSettings.stickyScroll || { enabled: false }
    };
}

function loadSettings() {
    const saved = localStorage.getItem('codeEditorSettings');
    if (saved) try { editorSettings = { ...editorSettings, ...JSON.parse(saved) }; } catch (e) { }
}

function applyEditorOptions() {
    const opts = getEditorOptions();
    if (inputEditor) inputEditor.updateOptions(opts);
    if (outputEditor) outputEditor.updateOptions({ ...opts, readOnly: true });
}

function closeSettings() {
    const s = elements.settingsSidebar;
    if (s.sidebar) s.sidebar.classList.remove('active');
    if (s.overlay) s.overlay.classList.remove('active');
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.settings-tab-content').forEach(el => el.classList.remove('active'));
    const tab = document.querySelector('.settings-tab[onclick*="' + tabId + '"]');
    if (tab) tab.classList.add('active');
    const content = document.getElementById('settings-' + tabId);
    if (content) content.classList.add('active');
}

function updateSetting(key, value) {
    editorSettings[key] = value;
    localStorage.setItem('codeEditorSettings', JSON.stringify(editorSettings));
    applyEditorOptions();
}

function showSettings() {
    const sb = elements.settingsSidebar.body;
    const s = elements.settingsSidebar;
    if (!sb || !s.sidebar || !s.overlay) return;
    const html = `
                <div class="settings-tabs">
                    <div class="settings-tab active" onclick="switchSettingsTab('general')">
                        <i class="fas fa-cog"></i> GENERAL
                    </div>
                    <div class="settings-tab" onclick="switchSettingsTab('cursor')">
                        <i class="fas fa-mouse-pointer"></i> CURSOR
                    </div>
                    <div class="settings-tab" onclick="switchSettingsTab('formatting')">
                        <i class="fas fa-code"></i> FORMATTING
                    </div>
                    <div class="settings-tab" onclick="switchSettingsTab('display')">
                        <i class="fas fa-eye"></i> DISPLAY
                    </div>
                    <div class="settings-tab" onclick="switchSettingsTab('advanced')">
                        <i class="fas fa-sliders-h"></i> ADVANCED
                    </div>
                </div>
                <div id="settings-general" class="settings-tab-content active">
                    <div class="setting-item setting-range">
                        <label class="setting-label">
                            <i class="fas fa-font setting-icon"></i>
                            <span>Font Size</span>
                        </label>
                        <div class="setting-control">
                            <input type="range" min="10" max="24" value="${editorSettings.fontSize}" 
                                onchange="updateSetting('fontSize', parseInt(this.value))" 
                                oninput="this.nextElementSibling.textContent = this.value + 'px'">
                            <span class="setting-value">${editorSettings.fontSize}px</span>
                        </div>
                    </div>
                    <div class="setting-item setting-range">
                        <label class="setting-label">
                            <i class="fas fa-text-height setting-icon"></i>
                            <span>Line Height</span>
                        </label>
                        <div class="setting-control">
                            <input type="range" min="0" max="50" value="${editorSettings.lineHeight || 0}" 
                                onchange="updateSetting('lineHeight', parseInt(this.value))" 
                                oninput="this.nextElementSibling.textContent = (this.value == 0 ? 'Auto' : this.value + 'px')">
                            <span class="setting-value">${editorSettings.lineHeight === 0 ? 'Auto' : editorSettings.lineHeight + 'px'}</span>
                        </div>
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-font setting-icon"></i>
                            <span>Font Family</span>
                        </label>
                        ${buildJaSelect('fontFamily', [
                            { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
                            { value: '"Share Tech Mono", monospace', label: 'Share Tech Mono' },
                            { value: '"Courier New", monospace', label: 'Courier New' },
                            { value: 'monospace', label: 'System Monospace' }
                        ], editorSettings.fontFamily)}
                    </div>
                    <div class="setting-item setting-range">
                        <label class="setting-label">
                            <i class="fas fa-indent setting-icon"></i>
                            <span>Tab Size</span>
                        </label>
                        <div class="setting-control">
                            <input type="range" min="2" max="8" value="${editorSettings.tabSize}" 
                                onchange="updateSetting('tabSize', parseInt(this.value))"
                                oninput="this.nextElementSibling.textContent = this.value">
                            <span class="setting-value">${editorSettings.tabSize}</span>
                        </div>
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-text-width setting-icon"></i>
                            <span>Word Wrap</span>
                        </label>
                        ${buildJaSelect('wordWrap', [{ value: 'on', label: 'ON' }, { value: 'off', label: 'OFF' }], editorSettings.wordWrap)}
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-map setting-icon"></i>
                            <span>Minimap</span>
                            <input type="checkbox" ${editorSettings.minimap ? 'checked' : ''} 
                                onchange="updateSetting('minimap', this.checked)">
                        </label>
                    </div>
                </div>
                <div id="settings-cursor" class="settings-tab-content">
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-mouse-pointer setting-icon"></i>
                            <span>Cursor Style</span>
                        </label>
                        ${buildJaSelect('cursorStyle', [
                            { value: 'line', label: 'LINE' }, { value: 'block', label: 'BLOCK' },
                            { value: 'underline', label: 'UNDERLINE' }, { value: 'line-thin', label: 'LINE THIN' },
                            { value: 'block-outline', label: 'BLOCK OUTLINE' }
                        ], editorSettings.cursorStyle)}
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-circle setting-icon"></i>
                            <span>Cursor Blinking</span>
                        </label>
                        ${buildJaSelect('cursorBlinking', [
                            { value: 'blink', label: 'BLINK' }, { value: 'smooth', label: 'SMOOTH' },
                            { value: 'phase', label: 'PHASE' }, { value: 'expand', label: 'EXPAND' },
                            { value: 'solid', label: 'SOLID' }
                        ], editorSettings.cursorBlinking)}
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-magic setting-icon"></i>
                            <span>Smooth Caret Animation</span>
                            <input type="checkbox" ${editorSettings.cursorSmoothCaretAnimation ? 'checked' : ''} 
                                onchange="updateSetting('cursorSmoothCaretAnimation', this.checked)">
                        </label>
                    </div>
                </div>
                <div id="settings-formatting" class="settings-tab-content">
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-brackets-curly setting-icon"></i>
                            <span>Auto Close Brackets</span>
                        </label>
                        ${buildJaSelect('autoClosingBrackets', [
                            { value: 'always', label: 'ALWAYS' }, { value: 'languageDefined', label: 'LANGUAGE DEFINED' },
                            { value: 'beforeWhitespace', label: 'BEFORE WHITESPACE' }, { value: 'never', label: 'NEVER' }
                        ], editorSettings.autoClosingBrackets)}
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-quote-right setting-icon"></i>
                            <span>Auto Close Quotes</span>
                        </label>
                        ${buildJaSelect('autoClosingQuotes', [
                            { value: 'always', label: 'ALWAYS' }, { value: 'languageDefined', label: 'LANGUAGE DEFINED' },
                            { value: 'beforeWhitespace', label: 'BEFORE WHITESPACE' }, { value: 'never', label: 'NEVER' }
                        ], editorSettings.autoClosingQuotes)}
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-palette setting-icon"></i>
                            <span>Bracket Pair Colorization</span>
                            <input type="checkbox" ${editorSettings.bracketPairColorization ? 'checked' : ''} 
                                onchange="updateSetting('bracketPairColorization', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-code-branch setting-icon"></i>
                            <span>Folding</span>
                            <input type="checkbox" ${editorSettings.folding ? 'checked' : ''} 
                                onchange="updateSetting('folding', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-indent setting-icon"></i>
                            <span>Insert Spaces</span>
                        </label>
                        ${buildJaSelect('insertSpaces', [{ value: 'true', label: 'SPACES' }, { value: 'false', label: 'TABS' }], editorSettings.insertSpaces)}
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-align-left setting-icon"></i>
                            <span>Auto Indent</span>
                        </label>
                        ${buildJaSelect('autoIndent', [
                            { value: 'none', label: 'NONE' }, { value: 'keep', label: 'KEEP' },
                            { value: 'brackets', label: 'BRACKETS' }, { value: 'advanced', label: 'ADVANCED' },
                            { value: 'full', label: 'FULL' }
                        ], editorSettings.autoIndent)}
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-paste setting-icon"></i>
                            <span>Format on Paste</span>
                            <input type="checkbox" ${editorSettings.formatOnPaste ? 'checked' : ''} 
                                onchange="updateSetting('formatOnPaste', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-keyboard setting-icon"></i>
                            <span>Format on Type</span>
                            <input type="checkbox" ${editorSettings.formatOnType ? 'checked' : ''} 
                                onchange="updateSetting('formatOnType', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-brackets-curly setting-icon"></i>
                            <span>Match Brackets</span>
                        </label>
                        ${buildJaSelect('matchBrackets', [
                            { value: 'always', label: 'ALWAYS' }, { value: 'near', label: 'NEAR' },
                            { value: 'never', label: 'NEVER' }
                        ], editorSettings.matchBrackets)}
                    </div>
                </div>
                <div id="settings-display" class="settings-tab-content">
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-eye-slash setting-icon"></i>
                            <span>Render Whitespace</span>
                        </label>
                        ${buildJaSelect('renderWhitespace', [
                            { value: 'none', label: 'NONE' }, { value: 'boundary', label: 'BOUNDARY' },
                            { value: 'selection', label: 'SELECTION' }, { value: 'trailing', label: 'TRAILING' },
                            { value: 'all', label: 'ALL' }
                        ], editorSettings.renderWhitespace)}
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-align-left setting-icon"></i>
                            <span>Render Indent Guides</span>
                            <input type="checkbox" ${editorSettings.renderIndentGuides ? 'checked' : ''} 
                                onchange="updateSetting('renderIndentGuides', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-arrows-alt-v setting-icon"></i>
                            <span>Scroll Beyond Last Line</span>
                            <input type="checkbox" ${editorSettings.scrollBeyondLastLine ? 'checked' : ''} 
                                onchange="updateSetting('scrollBeyondLastLine', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-search-plus setting-icon"></i>
                            <span>Mouse Wheel Zoom</span>
                            <input type="checkbox" ${editorSettings.mouseWheelZoom ? 'checked' : ''} 
                                onchange="updateSetting('mouseWheelZoom', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-highlighter setting-icon"></i>
                            <span>Occurrences Highlight</span>
                            <input type="checkbox" ${editorSettings.occurrencesHighlight ? 'checked' : ''} 
                                onchange="updateSetting('occurrencesHighlight', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-marker setting-icon"></i>
                            <span>Selection Highlight</span>
                            <input type="checkbox" ${editorSettings.selectionHighlight ? 'checked' : ''} 
                                onchange="updateSetting('selectionHighlight', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-highlighter setting-icon"></i>
                            <span>Render Line Highlight</span>
                        </label>
                        ${buildJaSelect('renderLineHighlight', [
                            { value: 'none', label: 'NONE' }, { value: 'gutter', label: 'GUTTER' },
                            { value: 'line', label: 'LINE' }, { value: 'all', label: 'ALL' }
                        ], editorSettings.renderLineHighlight)}
                    </div>
                </div>
                <div id="settings-advanced" class="settings-tab-content">
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-palette setting-icon"></i>
                            <span>Color Decorators</span>
                            <input type="checkbox" ${editorSettings.colorDecorators ? 'checked' : ''} 
                                onchange="updateSetting('colorDecorators', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-link setting-icon"></i>
                            <span>Links</span>
                            <input type="checkbox" ${editorSettings.links !== false ? 'checked' : ''} 
                                onchange="updateSetting('links', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-code setting-icon"></i>
                            <span>Code Lens</span>
                            <input type="checkbox" ${editorSettings.codeLens ? 'checked' : ''} 
                                onchange="updateSetting('codeLens', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-mouse setting-icon"></i>
                            <span>Drag and Drop</span>
                            <input type="checkbox" ${editorSettings.dragAndDrop !== false ? 'checked' : ''} 
                                onchange="updateSetting('dragAndDrop', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-copy setting-icon"></i>
                            <span>Empty Selection Clipboard</span>
                            <input type="checkbox" ${editorSettings.emptySelectionClipboard !== false ? 'checked' : ''} 
                                onchange="updateSetting('emptySelectionClipboard', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-highlighter setting-icon"></i>
                            <span>Copy with Syntax Highlighting</span>
                            <input type="checkbox" ${editorSettings.copyWithSyntaxHighlighting !== false ? 'checked' : ''} 
                                onchange="updateSetting('copyWithSyntaxHighlighting', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-sliders-h setting-icon"></i>
                            <span>Smooth Scrolling</span>
                            <input type="checkbox" ${editorSettings.smoothScrolling ? 'checked' : ''} 
                                onchange="updateSetting('smoothScrolling', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-circle setting-icon"></i>
                            <span>Rounded Selection</span>
                            <input type="checkbox" ${editorSettings.roundedSelection ? 'checked' : ''} 
                                onchange="updateSetting('roundedSelection', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-mouse-pointer setting-icon"></i>
                            <span>Multi Cursor Modifier</span>
                        </label>
                        ${buildJaSelect('multiCursorModifier', [
                            { value: 'ctrlCmd', label: 'CTRL/CMD' },
                            { value: 'alt', label: 'ALT' }
                        ], editorSettings.multiCursorModifier)}
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-code-branch setting-icon"></i>
                            <span>Show Folding Controls</span>
                        </label>
                        ${buildJaSelect('showFoldingControls', [
                            { value: 'always', label: 'ALWAYS' }, { value: 'mouseover', label: 'MOUSEOVER' },
                            { value: 'never', label: 'NEVER' }
                        ], editorSettings.showFoldingControls)}
                    </div>
                    <div class="setting-item">
                        <label class="setting-label">
                            <i class="fas fa-lightbulb setting-icon"></i>
                            <span>Suggest on Trigger Characters</span>
                            <input type="checkbox" ${editorSettings.suggestOnTriggerCharacters !== false ? 'checked' : ''} 
                                onchange="updateSetting('suggestOnTriggerCharacters', this.checked)">
                        </label>
                    </div>
                    <div class="setting-item setting-select">
                        <label class="setting-label">
                            <i class="fas fa-keyboard setting-icon"></i>
                            <span>Accept Suggestion on Enter</span>
                        </label>
                        ${buildJaSelect('acceptSuggestionOnEnter', [
                            { value: 'on', label: 'ON' }, { value: 'smart', label: 'SMART' },
                            { value: 'off', label: 'OFF' }
                        ], editorSettings.acceptSuggestionOnEnter)}
                    </div>
                    <div class="setting-item setting-range">
                        <label class="setting-label">
                            <i class="fas fa-clock setting-icon"></i>
                            <span>Quick Suggestions Delay</span>
                        </label>
                        <div class="setting-control">
                            <input type="range" min="0" max="1000" step="50" value="${editorSettings.quickSuggestionsDelay || 100}" 
                                onchange="updateSetting('quickSuggestionsDelay', parseInt(this.value))"
                                oninput="this.nextElementSibling.textContent = this.value + 'ms'">
                            <span class="setting-value">${editorSettings.quickSuggestionsDelay || 100}ms</span>
                        </div>
                    </div>
                </div>
            `;
    sb.innerHTML = html;
    bindJaSelects(sb);
    s.sidebar.classList.add('active');
    s.overlay.classList.add('active');
}

const EDITOR_INPUT_STORAGE_KEY = 'cssExtractorInput';

function getStoredInput() {
    try {
        const saved = localStorage.getItem(EDITOR_INPUT_STORAGE_KEY);
        return saved !== null && saved.trim() !== '' ? saved : null;
    } catch (e) {
        return null;
    }
}

function saveInputToStorage(value) {
    try {
        localStorage.setItem(EDITOR_INPUT_STORAGE_KEY, value);
    } catch (e) {}
}

// Inicjalizacja Monaco
require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs' } });
require(['vs/editor/editor.main'], function () {
    if (typeof defineMonacoThemes === 'function') defineMonacoThemes();
    const commonOptions = {
        language: 'css',
        padding: { top: 15, bottom: 15 },
        ...getEditorOptions()
    };

    const defaultInput = '/* Wklej kod CSS tutaj... */\n.example {\n  color: #f36c00;\n  background: rgba(243, 108, 0, 0.1);\n  border: 1px solid var(--border-color);\n}';
    const initialInput = getStoredInput() || defaultInput;

    inputEditor = monaco.editor.create(document.getElementById('inputEditor'), {
        ...commonOptions,
        value: initialInput
    });
    editors.input = inputEditor;

    let saveInputTimeout;
    inputEditor.onDidChangeModelContent(function () {
        clearTimeout(saveInputTimeout);
        saveInputTimeout = setTimeout(function () {
            saveInputToStorage(inputEditor.getValue());
        }, 400);
    });

    outputEditor = monaco.editor.create(document.getElementById('outputEditor'), {
        ...commonOptions,
        value: '/* Oczyszczony kod pojawi się tutaj... */',
        readOnly: true
    });
    editors.output = outputEditor;

    console.log("MONACO_SYSTEM_ONLINE");
});

const targetProps = [
    'background', 'background-image', 'background-color',
    'filter', 'box-shadow', 'text-shadow', 'color',
    'border', 'border-top', 'border-bottom', 'border-left', 'border-right',
    'border-color', 'border-top-color', 'border-bottom-color',
    'border-left-color', 'border-right-color', 'outline-color', 'fill', 'stroke'
];

function hasColor(val) {
    const v = val.toLowerCase();
    return v.includes('#') || v.includes('rgb') || v.includes('hsl') ||
        v.includes('var(') || v.includes('gradient') || v.includes('drop-shadow') ||
        ['white', 'black', 'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'transparent', 'currentcolor'].some(c => v.includes(c));
}

function runExtraction() {
    if (!inputEditor) return;
    const input = inputEditor.getValue();
    const counter = document.getElementById('counter');
    const status = document.getElementById('status');

    status.innerText = "STATUS: PROCESSING...";

    const cleanSource = input.replace(/\/\*[\s\S]*?\*\//g, "");
    const blocks = cleanSource.match(/[^{}]+\{[^{}]+\}/g) || [];

    let finalOutput = "";
    let nodes = [];

    blocks.forEach(block => {
        const parts = block.split('{');
        const selector = parts[0].trim();
        const content = parts[1].replace('}', '').trim();
        const lines = content.split(';');
        const filteredLines = [];

        lines.forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
                const prop = line.substring(0, colonIndex).trim().toLowerCase();
                const val = line.substring(colonIndex + 1).trim();

                if (targetProps.includes(prop) && hasColor(val)) {
                    filteredLines.push(`    ${prop}: ${val};`);
                    nodes.push({ selector, prop, val });
                }
            }
        });

        if (filteredLines.length > 0) {
            finalOutput += `${selector} {\n${filteredLines.join('\n')}\n}\n\n`;
        }
    });

    outputEditor.setValue(finalOutput || "/* BRAK_DANYCH_KOLORYSTYCZNYCH */");
    counter.innerText = `MAPPED: ${nodes.length}`;
    status.innerText = "STATUS: COMPLETE";

    renderNodes(nodes);
    updateTimestamp();
}

function renderNodes(nodes) {
    const container = document.getElementById('previewArea');
    container.innerHTML = "";
    nodes.forEach(node => {
        const card = document.createElement('div');
        card.className = 'color-node';
        let previewStyle = "";
        if (node.prop.includes('background') || node.prop.includes('image')) {
            previewStyle = `background: ${node.val};`;
        } else if (node.prop === 'filter') {
            previewStyle = `background: var(--highlight-color); filter: ${node.val};`;
        } else {
            const hexMatch = node.val.match(/(#[a-f0-9]{3,8}|rgba?\(.+?\)|hsla?\(.+?\))/i);
            previewStyle = `background-color: ${hexMatch ? hexMatch[0] : 'transparent'};`;
        }
        card.innerHTML = `
                    <div class="swatch" style="${previewStyle}"></div>
                    <div class="node-info">
                        <span class="node-selector">${node.selector}</span>
                        <div class="node-data"><b style="color:var(--text-primary)">${node.prop}:</b> ${node.val}</div>
                    </div>
                `;
        container.appendChild(card);
    });
}

function copyOutput() {
    const val = outputEditor.getValue();
    navigator.clipboard.writeText(val);
    const btn = event.target;
    btn.innerText = "SKOPIOWANO!";
    setTimeout(() => btn.innerText = "Kopiuj_Wynik", 2000);
}

function clearAll() {
    inputEditor.setValue("");
    outputEditor.setValue("");
    document.getElementById('previewArea').innerHTML = "";
    document.getElementById('status').innerText = "STATUS: STANDBY";
    document.getElementById('counter').innerText = "MAPPED: 0";
}

function toggleTheme() {
    const root = document.documentElement;
    const current = root.getAttribute('theme');
    const newTheme = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('theme', newTheme);
    localStorage.setItem('theme', newTheme);

    // Synchronizacja motywu Monaco (style-monaco.js)
    if (typeof monaco !== 'undefined') {
        monaco.editor.setTheme(newTheme === 'dark' ? 'terminal-dark' : 'terminal-light');
    }
}

function updateTimestamp() {
    const now = new Date();
    const ts = now.toTimeString().split(' ')[0];
    const timeEl = document.querySelector('#timestamp .time');
    if (timeEl) timeEl.textContent = ts;
}
setInterval(updateTimestamp, 1000);
updateTimestamp();