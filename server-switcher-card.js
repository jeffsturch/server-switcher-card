/**
 * Server Switcher Card
 * A custom Lovelace card for switching between Home Assistant servers
 * via the Companion app's `homeassistant://navigate/<path>?server=<name>`
 * deep-link mechanism.
 *
 * https://github.com/jeffsturch/server-switcher-card
 *
 * @license MIT
 */

const VERSION = '0.2.2';

// ---------------------------------------------------------------------------
// ha-form schemas (used by the visual editor)
// ---------------------------------------------------------------------------

const CURRENT_SCHEMA = [
  { name: 'name', required: true, selector: { text: {} } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'letter', selector: { text: {} } },
      { name: 'color', selector: { text: {} } },
    ],
  },
  { name: 'subtitle', selector: { text: {} } },
];

const SERVER_SCHEMA = [
  { name: 'name', required: true, selector: { text: {} } },
  {
    type: 'grid',
    name: '',
    schema: [
      { name: 'letter', selector: { text: {} } },
      { name: 'color', selector: { text: {} } },
    ],
  },
  { name: 'subtitle', selector: { text: {} } },
  { name: 'server', required: true, selector: { text: {} } },
  { name: 'path', selector: { text: {} } },
];

const LAYOUT_SCHEMA = [
  { name: 'header', selector: { text: {} } },
  { name: 'size', selector: { number: { min: 24, max: 80, step: 2, mode: 'box' } } },
  {
    name: 'show_placeholder',
    selector: {
      select: {
        mode: 'dropdown',
        options: [
          { value: 'auto', label: 'Auto (only when editing the dashboard)' },
          { value: 'always', label: 'Always show' },
          { value: 'never', label: 'Never show' },
        ],
      },
    },
  },
  {
    type: 'expandable',
    name: 'position',
    title: 'Position',
    schema: [
      {
        type: 'grid',
        name: '',
        schema: [
          { name: 'top', selector: { text: {} } },
          { name: 'right', selector: { text: {} } },
        ],
      },
    ],
  },
];

const LABELS = {
  letter: 'Letter (single character)',
  name: 'Display name',
  color: 'Color (hex, e.g. #4285f4)',
  subtitle: 'Subtitle (optional)',
  server: 'Server name in Companion app (case-sensitive)',
  path: 'Dashboard URL path (e.g. lovelace, dashboard-mobile)',
  header: 'Menu header label',
  size: 'Avatar diameter (px)',
  show_placeholder: 'Show editor placeholder',
  top: 'Top (e.g. 80px)',
  right: 'Right (e.g. 16px)',
  position: 'Position',
};

// ---------------------------------------------------------------------------
// The card itself
// ---------------------------------------------------------------------------

class ServerSwitcherCard extends HTMLElement {
  constructor() {
    super();
    // Inline shadow on the host — used for the editor placeholder.
    // The floating avatar/menu lives separately on document.body.
    this._inlineShadow = this.attachShadow({ mode: 'open' });
    this._floatingHost = null;
    this._floatingShadow = null;
    this._open = false;
    this._editMode = false;
  }

  setConfig(config) {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    if (!config.current || typeof config.current !== 'object') {
      throw new Error('`current` (object) is required');
    }
    if (!Array.isArray(config.servers) || config.servers.length === 0) {
      throw new Error('`servers` (non-empty array) is required');
    }
    for (const s of config.servers) {
      if (!s.name) throw new Error('Each server needs a `name`');
      if (!s.server) throw new Error(`Server "${s.name}" needs a \`server\` field (the Companion app server name)`);
    }
    this._config = config;
    this._mountFloating();
    this._renderInline();
  }

  set hass(hass) {
    this._hass = hass;
  }

  // HA sets this on cards when the dashboard is in edit mode.
  set editMode(value) {
    this._editMode = !!value;
    this._renderInline();
  }

  getCardSize() {
    return 1;
  }

  connectedCallback() {
    if (this._config) this._mountFloating();
    this._renderInline();
  }

  disconnectedCallback() {
    this._unmountFloating();
  }

  _mountFloating() {
    this._unmountFloating();

    const host = document.createElement('div');
    host.className = 'server-switcher-floating';
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = this._template();

    const avatar = shadow.getElementById('avatar');
    const backdrop = shadow.getElementById('backdrop');

    avatar.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleMenu();
    });

    backdrop.addEventListener('click', () => this._closeMenu());

    shadow.querySelectorAll('.item.switchable').forEach((item) => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = item.dataset.path || 'lovelace';
        const server = item.dataset.server;
        this._navigate(path, server);
      });
    });

    this._floatingHost = host;
    this._floatingShadow = shadow;
  }

  _unmountFloating() {
    if (this._floatingHost) {
      this._floatingHost.remove();
      this._floatingHost = null;
      this._floatingShadow = null;
    }
    this._open = false;
  }

  _toggleMenu() {
    if (!this._floatingShadow) return;
    this._open ? this._closeMenu() : this._openMenu();
  }

  _openMenu() {
    if (!this._floatingShadow) return;
    this._open = true;
    this._floatingShadow.getElementById('menu').classList.add('open');
    this._floatingShadow.getElementById('backdrop').classList.add('open');
  }

  _closeMenu() {
    if (!this._floatingShadow) return;
    this._open = false;
    this._floatingShadow.getElementById('menu').classList.remove('open');
    this._floatingShadow.getElementById('backdrop').classList.remove('open');
  }

  // Editor-mode placeholder: lives in the host element so it shows in
  // the dashboard editor as a recognizable card.
  // `show_placeholder` config option:
  //   'auto' (default) — only when editMode is true
  //    true             — always show
  //    false            — never show
  _renderInline() {
    if (!this._inlineShadow) return;

    const mode = this._config && this._config.show_placeholder;
    let show;
    if (mode === 'always' || mode === true) show = true;
    else if (mode === 'never' || mode === false) show = false;
    else show = this._editMode; // 'auto', undefined, null

    if (!show || !this._config) {
      this._inlineShadow.innerHTML = '';
      return;
    }

    const cur = this._config.current || {};
    const letter = this._escape(cur.letter || (cur.name || '?').charAt(0).toUpperCase());
    const color = this._escape(cur.color || '#4285f4');
    const name = this._escape(cur.name || 'Current location');
    const count = (this._config.servers || []).length;
    const subtitle = `${count} location${count === 1 ? '' : 's'} • floating in corner`;

    this._inlineShadow.innerHTML = `
      <style>
        :host { display: block; }
        ha-card, .placeholder {
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          border-radius: var(--ha-card-border-radius, 12px);
          background: var(--ha-card-background, var(--card-background-color, #fff));
          color: var(--primary-text-color, #1a1a1a);
          border: 1px dashed var(--divider-color, rgba(127,127,127,0.3));
        }
        .av {
          width: 36px; height: 36px;
          border-radius: 50%;
          background: ${color};
          color: #fff;
          font-weight: 600;
          font-size: 16px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .meta { flex: 1 1 auto; min-width: 0; }
        .title {
          font-size: 13px;
          font-weight: 500;
          color: var(--primary-text-color);
        }
        .sub {
          font-size: 11px;
          color: var(--secondary-text-color, #666);
          margin-top: 2px;
        }
        .badge {
          font-size: 10px;
          font-weight: 600;
          color: var(--secondary-text-color, #666);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 2px 6px;
          border-radius: 4px;
          background: var(--secondary-background-color, rgba(0,0,0,0.05));
          flex-shrink: 0;
        }
      </style>
      <div class="placeholder">
        <div class="av">${letter}</div>
        <div class="meta">
          <div class="title">Server Switcher — ${name}</div>
          <div class="sub">${subtitle}</div>
        </div>
        <div class="badge">SSC</div>
      </div>
    `;
  }

  _navigate(path, serverName) {
    const url =
      'homeassistant://navigate/' +
      encodeURI(path) +
      '?server=' +
      encodeURIComponent(serverName);
    this._closeMenu();
    window.location.href = url;
  }

  _template() {
    const c = this._config;
    const cur = c.current;

    const top = c.position && c.position.top ? c.position.top : '80px';
    const right = c.position && c.position.right ? c.position.right : '16px';
    const size = Number(c.size) || 40;
    const fontSize = Math.floor(size * 0.45);

    const otherItems = c.servers
      .map((s) => {
        const path = this._escape(s.path || 'lovelace');
        const server = this._escape(s.server || s.name);
        const color = this._escape(s.color || '#0f9d58');
        const letter = this._escape(s.letter || (s.name || '?').charAt(0).toUpperCase());
        const name = this._escape(s.name);
        const subtitle = s.subtitle ? `<div class="subtitle">${this._escape(s.subtitle)}</div>` : '';
        return `
          <div class="item switchable" data-path="${path}" data-server="${server}" role="button" tabindex="0">
            <div class="mini-avatar" style="background: ${color}">${letter}</div>
            <div class="meta"><div class="name">${name}</div>${subtitle}</div>
            <div class="chev">&#x203A;</div>
          </div>`;
      })
      .join('');

    const curColor = this._escape(cur.color || '#4285f4');
    const curLetter = this._escape(cur.letter || (cur.name || '?').charAt(0).toUpperCase());
    const curName = this._escape(cur.name || 'Current');
    const curSubtitle = cur.subtitle ? `<div class="subtitle">${this._escape(cur.subtitle)}</div>` : '';
    const headerLabel = this._escape(c.header || 'Switch location');

    return `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; font-family: var(--paper-font-body1_-_font-family, Roboto, system-ui, sans-serif); }
        .backdrop {
          position: fixed; inset: 0;
          background: transparent;
          z-index: 9998;
          display: none;
        }
        .backdrop.open { display: block; }
        .avatar {
          position: fixed;
          top: ${top};
          right: ${right};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50%;
          background: ${curColor};
          color: #ffffff;
          font-weight: 600;
          font-size: ${fontSize}px;
          line-height: 1;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          z-index: 9999;
          box-shadow: 0 2px 8px rgba(0,0,0,0.28);
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: transform .12s ease, box-shadow .12s ease;
        }
        .avatar:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.32); }
        .avatar:active { transform: scale(0.94); }
        .menu {
          position: fixed;
          top: calc(${top} + ${size + 8}px);
          right: ${right};
          background: var(--ha-card-background, var(--card-background-color, #ffffff));
          color: var(--primary-text-color, #1a1a1a);
          border-radius: 14px;
          box-shadow: 0 6px 24px rgba(0,0,0,0.28);
          min-width: 240px;
          max-width: calc(100vw - 32px);
          padding: 6px;
          z-index: 9999;
          display: none;
          opacity: 0;
          transform: translateY(-6px);
          transition: opacity .14s ease, transform .14s ease;
        }
        .menu.open {
          display: block;
          opacity: 1;
          transform: translateY(0);
        }
        .menu-header {
          padding: 8px 12px 4px;
          font-size: 11px;
          font-weight: 600;
          color: var(--secondary-text-color, #666);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 10px;
          color: var(--primary-text-color, #1a1a1a);
        }
        .item.switchable { cursor: pointer; }
        .item.switchable:hover { background: var(--secondary-background-color, rgba(0,0,0,0.05)); }
        .item.switchable:active { background: var(--state-icon-active-color, rgba(0,0,0,0.08)); }
        .item.current { opacity: 0.85; }
        .item.current .check { color: var(--primary-color, #4285f4); font-weight: 700; }
        .mini-avatar {
          width: 36px; height: 36px;
          border-radius: 50%;
          color: #ffffff;
          font-weight: 600;
          font-size: 16px;
          line-height: 1;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .meta { flex: 1 1 auto; min-width: 0; }
        .name { font-size: 15px; font-weight: 500; line-height: 1.2; }
        .subtitle { font-size: 12px; color: var(--secondary-text-color, #666); margin-top: 2px; }
        .chev { color: var(--secondary-text-color, #666); font-size: 18px; }
        .check { font-size: 18px; }
      </style>
      <div class="backdrop" id="backdrop"></div>
      <div class="avatar" id="avatar" role="button" aria-label="Switch location" tabindex="0">${curLetter}</div>
      <div class="menu" id="menu" role="menu">
        <div class="menu-header">${headerLabel}</div>
        <div class="item current" role="menuitem">
          <div class="mini-avatar" style="background: ${curColor}">${curLetter}</div>
          <div class="meta"><div class="name">${curName}</div>${curSubtitle}</div>
          <div class="check">&#x2713;</div>
        </div>
        ${otherItems}
      </div>
    `;
  }

  _escape(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[c]);
  }

  // ----- Lovelace editor wiring -----

  static getConfigElement() {
    return document.createElement('server-switcher-card-editor');
  }

  static getStubConfig() {
    return {
      current: { letter: 'A', name: 'Server A', color: '#4285f4' },
      servers: [
        {
          letter: 'B',
          name: 'Server B',
          color: '#0f9d58',
          server: 'Server B',
          path: 'lovelace',
        },
      ],
    };
  }
}

// ---------------------------------------------------------------------------
// Visual editor
// ---------------------------------------------------------------------------

class ServerSwitcherCardEditor extends HTMLElement {
  constructor() {
    super();
    this._lastStructuralKey = null;
    this._forms = null;
  }

  setConfig(config) {
    // Deep-clone so internal mutations don't surprise HA.
    this._config = JSON.parse(JSON.stringify(config || {}));
    if (!this._config.current) this._config.current = {};
    if (!Array.isArray(this._config.servers)) this._config.servers = [];
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._forms) {
      if (this._forms.current) this._forms.current.hass = hass;
      if (this._forms.layout) this._forms.layout.hass = hass;
      (this._forms.servers || []).forEach((f) => {
        if (f) f.hass = hass;
      });
    }
  }

  connectedCallback() {
    this._update();
  }

  _structuralKey() {
    return String((this._config && this._config.servers ? this._config.servers.length : 0));
  }

  _update() {
    if (!this._config) return;
    const key = this._structuralKey();
    if (key !== this._lastStructuralKey || !this._forms) {
      this._render();
      this._lastStructuralKey = key;
    } else {
      this._refreshData();
    }
  }

  _refreshData() {
    if (!this._forms) return;
    if (this._forms.current) this._forms.current.data = this._config.current;
    if (this._forms.layout) this._forms.layout.data = this._layoutData();
    (this._config.servers || []).forEach((s, i) => {
      if (this._forms.servers && this._forms.servers[i]) {
        this._forms.servers[i].data = s;
      }
    });
  }

  _layoutData() {
    return {
      header: this._config.header,
      size: this._config.size,
      show_placeholder: this._config.show_placeholder || 'auto',
      position: this._config.position,
    };
  }

  _render() {
    this.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = `
      .ssc-editor { display: flex; flex-direction: column; gap: 8px; padding: 8px 0 16px; }
      .ssc-section-title {
        font-size: 11px;
        font-weight: 600;
        color: var(--secondary-text-color, #666);
        text-transform: uppercase;
        letter-spacing: 0.6px;
        margin: 12px 0 4px;
      }
      .ssc-help {
        font-size: 12px;
        color: var(--secondary-text-color, #666);
        margin: 0 0 4px;
        line-height: 1.4;
      }
      .ssc-server-item {
        background: var(--secondary-background-color, rgba(0,0,0,0.04));
        border-radius: 10px;
        padding: 12px;
        margin-bottom: 8px;
        position: relative;
      }
      .ssc-server-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
      }
      .ssc-server-label {
        font-weight: 500;
        color: var(--primary-text-color);
        font-size: 14px;
      }
      .ssc-remove {
        background: transparent;
        border: none;
        cursor: pointer;
        color: var(--error-color, #db4437);
        font-size: 13px;
        font-weight: 500;
        padding: 4px 8px;
        border-radius: 4px;
      }
      .ssc-remove:hover { background: rgba(219, 68, 55, 0.08); }
      .ssc-empty {
        background: var(--secondary-background-color, rgba(0,0,0,0.04));
        border-radius: 10px;
        padding: 16px;
        text-align: center;
        color: var(--secondary-text-color, #666);
        font-size: 13px;
      }
      .ssc-add {
        background: var(--primary-color, #4285f4);
        color: #fff;
        border: none;
        padding: 10px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        align-self: flex-start;
        margin-top: 4px;
      }
      .ssc-add:hover { opacity: 0.92; }
      .ssc-add:active { opacity: 0.84; }
    `;
    this.appendChild(style);

    const root = document.createElement('div');
    root.className = 'ssc-editor';

    // ---------- Current location ----------
    root.appendChild(this._sectionTitle('Current location'));
    root.appendChild(
      this._helpText("The location you're on now. Shown as the floating avatar and the top item in the menu.")
    );

    const currentForm = document.createElement('ha-form');
    currentForm.hass = this._hass;
    currentForm.data = this._config.current;
    currentForm.schema = CURRENT_SCHEMA;
    currentForm.computeLabel = (s) => LABELS[s.name] || s.name;
    currentForm.addEventListener('value-changed', (ev) => {
      ev.stopPropagation();
      this._fireConfig({ ...this._config, current: ev.detail.value });
    });
    root.appendChild(currentForm);

    // ---------- Locations to switch to ----------
    root.appendChild(this._sectionTitle('Locations to switch to'));
    root.appendChild(
      this._helpText('Each entry becomes a row in the dropdown menu. Tapping it switches the Companion app to that server.')
    );

    const serverForms = [];
    if ((this._config.servers || []).length === 0) {
      const empty = document.createElement('div');
      empty.className = 'ssc-empty';
      empty.textContent = 'No locations yet — click "Add location" below.';
      root.appendChild(empty);
    } else {
      this._config.servers.forEach((server, i) => {
        const item = document.createElement('div');
        item.className = 'ssc-server-item';

        const head = document.createElement('div');
        head.className = 'ssc-server-header';

        const label = document.createElement('div');
        label.className = 'ssc-server-label';
        label.textContent = server.name ? server.name : `Location ${i + 1}`;
        head.appendChild(label);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'ssc-remove';
        remove.textContent = 'Remove';
        remove.addEventListener('click', () => this._removeServer(i));
        head.appendChild(remove);

        item.appendChild(head);

        const form = document.createElement('ha-form');
        form.hass = this._hass;
        form.data = server;
        form.schema = SERVER_SCHEMA;
        form.computeLabel = (s) => LABELS[s.name] || s.name;
        form.addEventListener('value-changed', (ev) => {
          ev.stopPropagation();
          const newServers = [...this._config.servers];
          newServers[i] = { ...ev.detail.value };
          this._fireConfig({ ...this._config, servers: newServers });
        });
        item.appendChild(form);

        serverForms.push(form);
        root.appendChild(item);
      });
    }

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'ssc-add';
    addBtn.textContent = '+ Add location';
    addBtn.addEventListener('click', () => this._addServer());
    root.appendChild(addBtn);

    // ---------- Layout ----------
    root.appendChild(this._sectionTitle('Layout (optional)'));

    const layoutForm = document.createElement('ha-form');
    layoutForm.hass = this._hass;
    layoutForm.data = this._layoutData();
    layoutForm.schema = LAYOUT_SCHEMA;
    layoutForm.computeLabel = (s) => LABELS[s.name] || s.name;
    layoutForm.addEventListener('value-changed', (ev) => {
      ev.stopPropagation();
      const v = ev.detail.value || {};
      const next = { ...this._config };
      if (v.header) next.header = v.header;
      else delete next.header;
      if (v.size) next.size = v.size;
      else delete next.size;
      if (v.show_placeholder && v.show_placeholder !== 'auto') next.show_placeholder = v.show_placeholder;
      else delete next.show_placeholder;
      const pos = v.position || {};
      if (pos.top || pos.right) {
        next.position = {};
        if (pos.top) next.position.top = pos.top;
        if (pos.right) next.position.right = pos.right;
      } else {
        delete next.position;
      }
      this._fireConfig(next);
    });
    root.appendChild(layoutForm);

    this.appendChild(root);

    this._forms = {
      current: currentForm,
      servers: serverForms,
      layout: layoutForm,
    };
  }

  _sectionTitle(text) {
    const el = document.createElement('div');
    el.className = 'ssc-section-title';
    el.textContent = text;
    return el;
  }

  _helpText(text) {
    const el = document.createElement('div');
    el.className = 'ssc-help';
    el.textContent = text;
    return el;
  }

  _addServer() {
    const newServer = {
      letter: '',
      name: '',
      color: '#0f9d58',
      server: '',
      path: 'lovelace',
    };
    const next = {
      ...this._config,
      servers: [...(this._config.servers || []), newServer],
    };
    this._fireConfig(next);
  }

  _removeServer(index) {
    const next = {
      ...this._config,
      servers: (this._config.servers || []).filter((_, i) => i !== index),
    };
    this._fireConfig(next);
  }

  _fireConfig(config) {
    this.dispatchEvent(
      new CustomEvent('config-changed', {
        detail: { config },
        bubbles: true,
        composed: true,
      })
    );
  }
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

if (!customElements.get('server-switcher-card')) {
  customElements.define('server-switcher-card', ServerSwitcherCard);
}
if (!customElements.get('server-switcher-card-editor')) {
  customElements.define('server-switcher-card-editor', ServerSwitcherCardEditor);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'server-switcher-card',
  name: 'Server Switcher Card',
  description:
    'Floating avatar that opens a menu of your other Home Assistant servers and switches the Companion app via deep link.',
  preview: false,
  documentationURL: 'https://github.com/jeffsturch/server-switcher-card',
});

console.info(
  `%c SERVER-SWITCHER-CARD %c v${VERSION} `,
  'color: #fff; background: #4285f4; font-weight: 700; padding: 2px 6px; border-radius: 3px 0 0 3px;',
  'color: #4285f4; background: #fff; font-weight: 700; padding: 2px 6px; border: 1px solid #4285f4; border-radius: 0 3px 3px 0;'
);
