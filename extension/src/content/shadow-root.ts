import { EXTENSION_ROOT_TAG } from './jira/selectors';
import styles from '../styles/index.css?inline';

let host: HTMLElement | null = null;
let shadow: ShadowRoot | null = null;
let mountNode: HTMLElement | null = null;

export function ensureShadowMount(): { host: HTMLElement; shadow: ShadowRoot; mountNode: HTMLElement } {
  if (host && shadow && mountNode && document.contains(host)) {
    return { host, shadow, mountNode };
  }

  const existing = document.querySelector(EXTENSION_ROOT_TAG);
  if (existing instanceof HTMLElement && existing.shadowRoot) {
    host = existing;
    shadow = existing.shadowRoot;
    mountNode = shadow.querySelector('#jeg-root') as HTMLElement;
    if (!mountNode) {
      mountNode = document.createElement('div');
      mountNode.id = 'jeg-root';
      shadow.appendChild(mountNode);
    }
    return { host, shadow, mountNode };
  }

  host = document.createElement(EXTENSION_ROOT_TAG);
  Object.assign(host.style, {
    all: 'initial',
    position: 'fixed',
    zIndex: '2147483000',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
  } as CSSStyleDeclaration);

  shadow = host.attachShadow({ mode: 'open' });
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadow.appendChild(styleEl);

  mountNode = document.createElement('div');
  mountNode.id = 'jeg-root';
  shadow.appendChild(mountNode);

  document.documentElement.appendChild(host);
  return { host, shadow, mountNode };
}

export function getShadowRoot(): ShadowRoot | null {
  return shadow;
}
