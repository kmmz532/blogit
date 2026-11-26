import { mount, type Component } from 'svelte';
import '../styles.css';

export function mountPage(page: Component): void {
  mount(page, { target: document.getElementById('app')! });
}
