Freak
=====

Functional reactive object wrapper

(jtmpl)[https://github.com/atmin/jtmpl] data model.

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
    return this('arr').reduce(function(prev, curr) {
      return prev + curr;
    });
  }

};

// Model wraps object
var model = freak(obj);

// Freak returns accessor function
typeof model; // => 'function'

// Event log in reverse chronological order
var log = [];

// Track property change
model.on('update', 'f', function() {
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

// Get property
model('a'); // => 1

// Get computed property
model('f'); // => 3

// Set property
model('a', 2);

// 'f' update event fires
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
model('sum'); // => 4

// And we are notified when elements are deleted or inserted
log[0]; // => '1 element(s) deleted from 1'

// Array length is the `len` property
model('arr').len; // => 2

// Check this page source to see the other boring test cases :)
```


<!-- js

// Invisible tests
model('arr').push(42);
// log[0]; // => ''

-->
