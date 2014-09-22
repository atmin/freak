Freak
=====

Functional reactive object wrapper

[jtmpl](https://github.com/atmin/jtmpl) data model.


What
----

Freak recursively wraps a plain JavaScript object into an accessor function,
`model = freak(obj)`, which:

- given `prop` argument returns property value: `foo = model('foo')`

- given `prop` and `value` arguments sets `prop` to `value`:
  `model('foo', 42)`

- a property can be computed (defined as a function) and it can
access other properties via the `this` accessor function, which serves
as the [destiny
operator](http://paulstovell.com/blog/reactive-programming)

- each property is observable: `model.on('change', 'foo', function...)`
(including arrays: `model('arr').on('insert', function...)`)


Specification
-------------

Tests are processed by [jsmd](https://github.com/vesln/jsmd)

<!-- js
var freak = require('./freak.js');
-->


### Example object

Illustrates all capabilities. `this` is the accessor function of
current context.

```js

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
```

Model wraps object

``` js
var model = freak(obj);
```


Freak returns accessor function

``` js
typeof model; // => 'function'
```

Implement simple event log and attach some event handlers to model.

``` js
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
```

### Literate tests

``` js
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

// Set arr[0] to 1, change event should NOT fire
model('arr')(0, 1);
log[0]; // => 'f = 20'
// Set arr[0] to 2, change event fires, value is new
model('arr')(0, 2);
log[0]; // => 'arr[0] = 2'
// Back to 1
model('arr')(0, 1);

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

model = freak({a: {b: 22}});
model('a', {c: 42});
model('a').values.c === 42; // => true
model('a', null);
model('a'); // => null


// Computed properties, depending on array,
// are notified when element changes

model = freak({
  a: [1, 2, 3],
  s: function() {
    return this('a').values.reduce(function(a,b) { return a + b });
  }
});
model.on('change', 's', function() {
  log.unshift('s=' + this('s'));
});
model('s'); // init dependency tracking
model('a')(0, 2);
log[0]; // => 's=7'
model('a').push(3);
log[0]; // => 's=10'

model = freak({
  a: [{b: 1}, {b: 2}, {b: 3}],
  s: function() {
    return this('a').values.reduce(function(a,b) { return { b: a.b + b.b }; }).b;
  }
});
model.on('change', 's', function() {
  log.unshift('s=' + this('s'));
});
model('s'); // init dependency tracking
model('a')(0)('b', 2);
log[0]; // => 's=7'
model('a').push({b: 3});
log[0]; // => 's=10'


// Computed properties returning object/array
model = freak({
  a: [1, 2, 3, 4],
  even: function() {
    return this('a').values.filter(function(el) {
      return el % 2 === 0;
    });
  }
});
model.on('change', 'even', function() {
  log.unshift('even = ' + this('even').values.toString());
});

// Put an "anchor" log entry
log.unshift('no change');

model('even').values; // => [2, 4]

// model('even') should NOT change after following pushes
model('a').push(5);
model('a').push(7);
log[0]; // => 'no change'

// Now it should change, as we push even element
model('a').push(6);
log[0]; // => 'even = 2,4,6'

// Same test for array of objects
model = freak({
  a: [{b: 1}, {b: 2}, {b: 3}, {b: 4}],
  even: function() {
    return this('a').values.filter(function(el) {
      return el.b % 2 === 0;
    });
  }
});
model.on('change', 'even', function() {
  log.unshift('even = ' + JSON.stringify(this('even').values));
});

// Put an "anchor" log entry
log.unshift('no change');

model('even').values; // => [{"b":2}, {"b":4}]

// model('even') should NOT change after following pushes
model('a').push({b: 5});
model('a').push({b: 7});
log[0]; // => 'no change'

// Now it should change, as we push even element
model('a').push({b: 6});
log[0]; // => 'even = [{"b":2},{"b":4},{"b":6}]'
```

