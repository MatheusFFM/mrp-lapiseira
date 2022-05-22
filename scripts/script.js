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

    initTree(productName, matrix) {
      const productMatrix = matrix[productName]
      const needsIndex = 0;
      const needs = productMatrix[needsIndex];
      const baseNeeds = matrix['lapiseiraP207'][needsIndex];
      const treeQuantity = this.findQuantity(this.productionTree, productName, 1);
      for(const index in needs) {
        needs[index] = baseNeeds[index] * treeQuantity;
      }
    },

    findQuantity(product, productName, sum) {
      if (product.product === productName) {
        return sum * product.quantity;
      } else {
        for(const input of product.inputs) {
          const result = this.findQuantity(input, productName, sum);
          if(result !== sum) {
            return result * product.quantity;
          }
        }
        return sum;
      }
    },

    clearMatrix(productName, matrix) {
      for(let i = 1; i < matrix[productName].length; i++) {
        matrix[productName][i] = Array(8).fill(0);
      }
    },

    calcMrp(productName, product, matrix) {
      let stock = product.initialStock;
      const productMatrix = matrix[productName]
      const needs = productMatrix[0];
      const projectedStock = productMatrix[2];
      const receivingPlannedOrders = productMatrix[3];
      const releasePlannedOrders = productMatrix[4];
      
      for (const cycle in needs) {
        debugger
        stock -= needs[cycle];

        if(cycle == 0 && stock < product.safetyStock) {
          let lotToStart = product.minimumLot;

          while(stock + lotToStart < product.safetyStock) {
            lotToStart += product.minimumLot;
          }

          receivingPlannedOrders[cycle] = lotToStart;
        }

        stock += receivingPlannedOrders[cycle];

        if(stock < product.safetyStock) {
          cyleToRelease = cycle - product.leadTime;

          if(cyleToRelease >= 0) {
            let lotToRelease = product.minimumLot;

            while(stock + lotToRelease < product.safetyStock) {
              lotToRelease += product.minimumLot;
            }

            releasePlannedOrders[cyleToRelease] = lotToRelease;
            receivingPlannedOrders[cycle] = lotToRelease;
            stock += lotToRelease;
          };

        };

        projectedStock[cycle] = stock; 
      }
    },

    updateMatrix() {
      const matrix = JSON.parse(JSON.stringify(Object.assign({}, this.matrix)));
      
      for (const productName in matrix) {
        this.initTree(productName, matrix)
        this.clearMatrix(productName, matrix);
        this.calcMrp(productName, this.products[productName], matrix);
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
