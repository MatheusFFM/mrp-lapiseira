document.querySelectorAll('[x-component]').forEach(component => {
  const componentName = `x-${component.getAttribute('x-component')}`;

  class Component extends HTMLElement {
    connectedCallback() {
      this.append(component.content.cloneNode(true));
      Alpine.initTree(component);
    }
  }

  customElements.define(componentName, Component);
});
