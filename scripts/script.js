const pantryId = 'baf380be-ff05-40cc-a2e2-b40291a95716';
const apiEndpoint = `https://getpantry.cloud/apiv1/pantry/${pantryId}/basket/data`;

document.addEventListener('alpine:init', () => {
  Alpine.data('data', () => ({
    ready: false,

    init() {
      document.body.classList.remove('hidden');
      this.setState(this.getOfflineState());

      const debounceSave = debounce(() => this.saveOnlineState());
      const handleChanges = () => {
        this.updateMatrix();
        this.saveOfflineState();
        debounceSave();
      };

      ['products', 'productionTree'].forEach(prop => {
        this.$watch(prop, () => handleChanges());
      });

      fetch(apiEndpoint)
        .then(res => res.json())
        .then(this.setState.bind(this))
        .finally(() => this.ready = true);
    },

    setState({ products, productionTree, matrix }) {
      this.products = structuredClone(products);
      this.productionTree = structuredClone(productionTree);
      this.matrix = structuredClone(matrix);

      this.refs = getRefs(this.productionTree);
    },

    getOfflineState() {
      return JSON.parse(localStorage.getItem('data')) ?? {
        products, productionTree, matrix,
      };
    },

    saveOfflineState() {
      localStorage.setItem('data', JSON.stringify({
        products: this.products,
        productionTree: this.productionTree,
        matrix: this.matrix,
      }));
    },

    saveOnlineState() {
      fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          products: this.products,
          productionTree: this.productionTree,
          matrix: this.matrix,
        }),
      });
    },

    reset() {
      this.setState({ products, productionTree, matrix });
    },

    getQuantity(key) {
      return this.refs[key].reduce((acc, cur) => acc + cur.quantity, 0);
    },

    handleInput(event, obj, key, min, max) {
      event.preventDefault();
      const value = +event.target.textContent;

      if (value >= min && value <= max) {
        obj[key] = value;
      }

      event.target.textContent = obj[key];
    },

    updateMatrix() {
      const matrix = JSON.parse(JSON.stringify(Object.assign({}, this.matrix)));

      for (const product in matrix) {
        for (let i = 0; i < 5; i++) {
          for (let j = 0; j < 8; j++) {
            matrix[product][i][j] = Math.floor(Math.random() * 5) + 1;
          }
        }
      }

      this.matrix = matrix;
    },
  }));
});

function debounce(func, timeout = 500) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func.apply(this, args), timeout);
  };
}

function getRefs(productionTree) {
  const refs = {};

  (function transverse(node) {
    refs[node.product] = (refs[node.product] ?? []).concat(node);
    node.inputs.forEach(transverse);
  })(productionTree)

  return refs;
}
