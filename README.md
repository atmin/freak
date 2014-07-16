Freak
=====

Functional reactive object wrapper

[jtmpl](https://github.com/atmin/jtmpl) data model.

<!-- js
var freak = require('./freak.js');
-->

```js

// Our reactive object. `this` is the current freak instance
var obj = {

  // Simple properties
  a: 1,
  b: 2,

  // Array
  arr: [1, 2, 3],

  // Nested object
  obj: {
    x: 42
  },

  // Computed property
  f: function() {
    return this('a') + this('b');
  },

  // Computed property, array aggregation
  sum: function() {
    return this('arr').values.reduce(function(prev, curr) {
      return prev + curr;
    });
  },

  // Asynchronous computed property
  async: function(callback) {
    setTimeout(function() {
      var answer = 42;
      callback(answer);
    }, 0);
  },

  // Computed property setter
  setab: function(val) {
    this('a', val);
    this('b', val);
  }

};

// Model wraps object
var model = freak(obj);

// Freak returns accessor function
typeof model; // => 'function'

// Event log in reverse chronological order
var log = [];

// Track property change
model.on('change', 'f', function() {
  log.unshift('f = ' + this('f'));
});

// On array insert
model('arr').on('insert', function(index, count) {
  log.unshift(count + ' element(s) inserted at ' + index);
});

// On array delete
model('arr').on('delete', function(index, count) {
  log.unshift(count + ' element(s) deleted from ' + index);
});

// On first array element change
model('arr').on('change', 0, function() {
  log.unshift('arr[0] = ' + this(0));
});

// Get property
model('a'); // => 1

// Get computed property
model('f'); // => 3

// Set property
model('a', 2);

// 'f' change event fires
log[0]; // => 'f = 4'
model('f'); // => 4

// Get child context property
model('obj')('x'); // => 42

// Get array element
model('arr')(0); // => 1

// Raw values
model('arr').values; // => [1, 2, 3]

// Computed properties work for arrays, too
model('sum'); // => 6

// Arrays can mutate
model('arr').splice(1, 1);
model('arr').values; // => [1, 3]
log[0]; // => '1 element(s) deleted from 1'
model('sum'); // => 4

// Array length is the `len` property, because Function.length already exists
model('arr').len; // => 2

// Get computed property asynchronously
model('async', function(val) {
  val; // => 42
});

// Computed properties can be setters
model('setab', 10);
model('f'); // => 20

// You can access parent and root contexts of nested objects
model('obj').parent === model; // => true
model('arr').root === model; // => true
model.root; // => model
model.parent; // => null

// All contexts, but root have a property name, 'prop'
// ('name' is existing read- function property name)
model('obj').prop; // => 'obj'
model('arr').prop; // => 'arr'
model('obj').values === model('obj').parent(model('obj').prop).values; // => true
model.prop; // => null






// Mutating array methods tests

// Set arr[0] to 1 again, change event should fire nonetheless
model('arr')(0, 1);
log[0]; // => 'arr[0] = 1'

model('arr').push(42);
model('arr').values; // => [1, 3, 42]
log[0]; // => '1 element(s) inserted at 2'

model('arr').pop();
model('arr').values; // => [1, 3]
log[0]; // => '1 element(s) deleted from 2'

model('arr').reverse();
model('arr').values; // => [3, 1]
log[1]; // => '2 element(s) deleted from 0'
log[0]; // => '2 element(s) inserted at 0'

model('arr').shift();
model('arr').values; // => [1]
log[0]; // => '1 element(s) deleted from 0'

model('arr').unshift(42);
model('arr').values; // => [42, 1]
log[0]; // => '1 element(s) inserted at 0'

model('arr').sort();
model('arr').values; // => [1, 42]
log[1]; // => '2 element(s) deleted from 0'
log[0]; // => '2 element(s) inserted at 0'


// More tests

model = freak({a: [[1]]});
model('a').unshift([2]);
model('a').values[0] === model('a')(0).values; // => true

```
