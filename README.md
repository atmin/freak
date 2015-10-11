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

- each property is observable, `model.on('change', function(prop)...)`,
including arrays

It's an alternative to [Object.observe](http://updates.html5rocks.com/2012/11/Respond-to-change-with-Object-observe)
that also provides observable computed properties with automatic dependency management.

Traditional object member access:

    var value = this.member;    // getter
    this.member = 3.14;         // setter

Freak style:

    var value = this('member'); // getter
    this('member', 3.14);       // setter


### Breaking change in v1.0.0

Async get, `model('asyncProp', callbackFunc)` it not supported anymore. *All* 2 argument calls are handled by
the setter, allowing defining new computed properties on the fly. If you need async values, use Promise.



Specification
-------------

Following literate tests are processed by [jsmd](https://github.com/vesln/jsmd)

<!-- js
function requireFromString(src, filename) {
  var Module = module.constructor;
  var m = new Module();
  m._compile(src, filename);
  return m.exports;
}

var FILENAME = 'freak.js';
var fs = require('fs');
var file = fs.readFileSync(FILENAME).toString();
var istanbul = require('istanbul');
var instrumenter = new istanbul.Instrumenter();
var instrumented = instrumenter.instrumentSync(file, FILENAME);
var freak = requireFromString(instrumented);
-->


### Example object

To illustrate most capabilities. `this` is the accessor function of
current context.

```js

var obj = {

  // Simple properties
  a: 1,
  b: 2,

  // Array
  arr: [1, 2, 3],

  // Computed property
  f: function() {
    return this('a') + this('b');
  },

  // Computed property, array aggregation
  sum: function() {
    return this('arr').reduce(function(prev, curr) {
      return prev + curr;
    });
  },

  // Nested object
  nestedObj: {
    x: 42,
    // Computed property, depending on another context (parent)
    parentArrayLength: function() {
      return this.parent('arr').len;
    }
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
model.on('change', function(prop) {
  if (prop === 'f') log.unshift('f = ' + this('f'));
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
var arr0change = function(prop) {
  if (prop === 0) log.unshift('arr[0] = ' + this(0));
};
model('arr').on('change', arr0change);
```

### Property access

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
model('nestedObj')('x'); // => 42

// Get array element
model('arr')(0); // => 1

// Raw values
model('arr').values; // => [1, 2, 3]

// Computed properties work for arrays, too
model('sum'); // => 6

// Computed properties can be setters
model('setab', 10);
model('f'); // => 20
```

### Contexts, computed properties

You can access parent and root contexts of nested objects

``` js
model('nestedObj').parent === model; // => true
model('arr').root === model; // => true
model.root; // => model
model.parent; // => null
```

All contexts, but root have a property name, `prop`
(`name` is existing read-only function property name)

``` js
model('nestedObj').prop; // => 'nestedObj'
model('arr').prop; // => 'arr'
model('nestedObj').values === model('nestedObj').parent(model('nestedObj').prop).values; // => true
model.prop; // => null
```

Inter-context computed properties

``` js
model('nestedObj')('parentArrayLength'); // => 3
model('nestedObj').on('change', function(prop) {
  if (prop === 'parentArrayLength')
    log.unshift('nestedObj.parentArrayLength = ' + model('nestedObj')('parentArrayLength'));
});
model('arr').push(42);
log[0]; // => 'nestedObj.parentArrayLength = 4'
model('arr').pop();
log[0]; // => 'nestedObj.parentArrayLength = 3'
model('nestedObj').off('change');
```

### Array methods

Arrays can mutate

``` js
model('arr').splice(1, 1);
model('arr').values; // => [1, 3]
log[0]; // => '1 element(s) deleted from 1'
model('sum'); // => 4
```

Array length is the `len` property, because Function.length already exists

``` js
model('arr').len; // => 2
```

Mutating array methods tests

``` js
// Dummy log entry
log.unshift('nope');

// Set arr[0] to 1, change event should NOT fire
model('arr')(0, 1);
log[0]; // => 'nope'
// Set arr[0] to 2, change event fires, value is new
model('arr')(0, 2);
log[0]; // => 'arr[0] = 2'
// Remove event handler
model('arr').off('change', arr0change);
// Back to 1
model('arr')(0, 1);
// Change not handled, log unchanged
log[0]; // => 'arr[0] = 2'

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
```

`forEach`, `every`, `some`, `filter`, `find`, `findIndex`,
`keys`, `map`, `reduce`, `reduceRight`

```js
model = freak({
  arr: [{a: 1}, {a: 2}, {a: 3}]
});

model('arr').forEach(function() { this('b', this('a') + 1); });

model('arr').map(function() { return this('b'); }); // => [2, 3, 4]

model('arr').every(function() { return this('a'); }); // => true

model('arr').every(function() { return this('a') - 1; }); // => false

model('arr').some(function() { return this('a') - 1; }); // => true

model('arr').some(function() { return false; }); // => false

model('arr').filter(function() { return this('a') === 1; }); // => [{a:1,b:2}]
```



### Serialization test

```js
model = freak({
  a: 1,
  b: [2, 2],
  c: function() {
    return this('a') + this('b')(0);
  },
  _d: 'not serialized',
  obj: {
    a: 22,
    _d: 'not serialized, as well'
  },
  arr: [{a: 6}, {a: 7, _: 'nothing'}]
});
model('c'); // => 3
model.toJSON(); // => '{"a":1,"b":[2,2],"obj":{"a":22},"arr":[{"a":6},{"a":7}]}'
```


### More tests


Proper `.values` references

```js
model = freak({a: [[1]]});
model('a').unshift([2]);
model('a').values[0] === model('a')(0).values; // => true

model = freak({a: {b: 22}});
model('a', {c: 42});
model('a').values.c === 42; // => true
model('a', null);
model('a'); // => null
```

Computed properties, depending on array,
are notified when element changes

```js
model = freak({
  a: [1, 2, 3],
  s: function() {
    return this('a').reduce(function(a,b) { return a + b });
  }
});
model.on('change', function(prop) {
  if (prop === 's') log.unshift('s=' + this('s'));
});
model('s'); // init dependency tracking
model('a')(0, 2);
log[0]; // => 's=7'
model('a').push(3);
log[0]; // => 's=10'

model = freak({
  a: [{b: 1}, {b: 2}, {b: 3}],
  s: function() {
    return this('a').reduce(function(a,b) { return { b: a.b + b.b }; }).b;
  }
});
model.on('change', function(prop) {
  if (prop === 's') log.unshift('s=' + this('s'));
});
model('s'); // init dependency tracking
model('a')(0)('b', 2);
log[0]; // => 's=7'
model('a').splice(model('a').len, 0, {b: 3});
log[0]; // => 's=10'
```

Computed properties returning object/array

```js
model = freak({
  a: [1, 2, 3, 4],
  even: function() {
    return this('a').filter(function(el) {
      return el % 2 === 0;
    });
  }
});
model.on('change', function(prop) {
  if (prop === 'a' || prop === 'even')
    log.unshift(prop + ' = ' + JSON.stringify(this(prop).values));
});
model('a').on('insert', function() {
  log.unshift('insert into a');
});
model('a').on('delete', function() {
  log.unshift('delete from a');
});
model('even').on('insert', function() {
  log.unshift('insert into even');
});
model('even').on('delete', function() {
  log.unshift('delete from even');
});

model('even').values; // => [2, 4]

// model('even') should NOT change after following pushes
model('a').push(5);
model('a').push(7);
log[0]; // => 'insert into a'

// Now it should change, as we push even element
model('a').push(6);
log[0]; // => 'even = [2,4,6]'
```

Same test again, but for array of objects

```js
model = freak({
  a: [{b: 1}, {b: 2}, {b: 3}, {b: 4}],
  even: function() {
    return this('a').filter(function(el) {
      return el.b % 2 === 0;
    });
  },
  evenLength: function() {
    return this('even').len;
  }
});

model.on('change', function(prop) {
  var val = this(prop);
  log.unshift(prop + ' = ' + (typeof val === 'function' ? JSON.stringify(val.values) : val));
});
model('a').on('insert', function() {
  log.unshift('insert into a');
});
model('a').on('delete', function() {
  log.unshift('delete from a');
});
model('even').on('insert', function() {
  log.unshift('insert into even');
});
model('even').on('delete', function() {
  log.unshift('delete from even');
});

model('even').values; // => [{"b":2}, {"b":4}]
model('evenLength'); // => 2

// model('even') should NOT change after following pushes
model('a').push({b: 5});
model('a').push({b: 7});
log[0]; // => 'insert into a'

// Now it should change, as we push even element
model('a').push({b: 6});
log[0]; // => 'evenLength = 3'
log[1]; // => 'even = [{"b":2},{"b":4},{"b":6}]'

// Changing an `a` element should trigger `even` change
model('a')(1)('b', 1);
log[0]; // => 'evenLength = 2'
log[1]; // => 'even = [{"b":4},{"b":6}]'
```

Complex computed getter/setter

```js
model = freak({
  checkboxes: [true, false, true, true],

  // "Toggle All" functionality, when all are checked,
  // `toggleAll` state is checked; setting it affects all checkboxes
  toggleAll: function(newValue) {
    var checkboxes = this('checkboxes');
    return newValue === undefined ?
      // Getter
      checkboxes.reduce(function(prev, curr) {
        // Logical 'and' of all values
        return prev && curr;
      }) :
      // Setter
      checkboxes.forEach(function(val, i) {
        checkboxes(i, newValue);
      });
  }
});

model('toggleAll'); // => false
model('checkboxes')(1, true);
model('toggleAll'); // => true
model('toggleAll', false);
model('checkboxes').values; // => [false, false, false, false]
```

Same tests, but for array of objects

```js
model = freak({
  checkboxes: [{ checked: true }, { checked: false }],

  toggleAll: function(newValue) {
    var checkboxes = this('checkboxes');
    return newValue === undefined ?
      // Getter
      checkboxes.reduce(function(prev, curr) {
        // Logical 'and' of all values
        return prev && curr.checked;
      }) :
      // Setter
      checkboxes.forEach(function(val, i) {
        checkboxes(i)('checked', newValue);
      });
  }
});

model('toggleAll'); // => false
model('checkboxes')(1)('checked', true);
model('toggleAll'); // => true
model('toggleAll', false);
JSON.stringify(model('checkboxes').values); // => '[{"checked":false},{"checked":false}]'
```

Cousin dependencies

```js
model = freak({
  1: {
    a: function() {
      return this.parent(2)('a')(0);
    }
  },
  2: {
    a: [22]
  }
});
model(1).on('change', function(prop) {
  if (prop === 'a') log.unshift('a=' + this('a'));
});
model(1)('a'); // => 22
model(2)('a')(0, 42);
log[0]; // => 'a=42'
```

Change event, again

```js
model = freak({arr: [1, 1, 1]});
model('arr').on('change', function(prop) {
  log.unshift(prop + ' changed to ' + this(prop));
});

model('arr')(0, 42);
log[0]; // => '0 changed to 42'

model('arr')(2, 128);
log[0]; // => '2 changed to 128'

```

<!-- js
var reporter = new istanbul.Reporter();
var collector = new istanbul.Collector();
collector.add(__coverage__);
reporter.addAll(['html', 'text-summary']);
reporter.write(collector, true, Function.prototype);
-->
