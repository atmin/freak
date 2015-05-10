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

It's an alternative to [Object.observe](http://updates.html5rocks.com/2012/11/Respond-to-change-with-Object-observe)
with extra features.

The only concept you have to grasp is: you give up the assignment operator
in favour of the accessor function.


> According to Backus (and many other people), the problem with assignment statements is
> that they divide the programming language into two distinct worlds:
> the world of functions and algebra; and the world of assignments.
> That’s the world on the right-hand side of an assignment statement, and everything else.
>
> That division stinks for a lot of reasons. Just for a start, it can rob a system of
> a lot of its clarity; make code far more complex and hard to read; make code
> far harder to reuse; and make it much harder to build generic code for gluing together
> computations.
>
>
> &mdash; [Backus’s Idea of Functional Programming](http://scienceblogs.com/goodmath/2007/03/20/backuss-idea-of-functional-pro-1/)




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

  // Nested object
  nestedObj: {
    x: 42,
    // Computed property, depending on another context (parent)
    parentArrayLength: function() {
      return this.parent('arr').len;
    }
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
model('nestedObj')('x'); // => 42

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
model('nestedObj').parent === model; // => true
model('arr').root === model; // => true
model.root; // => model
model.parent; // => null

// All contexts, but root have a property name, 'prop'
// ('name' is existing read- function property name)
model('nestedObj').prop; // => 'nestedObj'
model('arr').prop; // => 'arr'
model('nestedObj').values === model('nestedObj').parent(model('nestedObj').prop).values; // => true
model.prop; // => null

// Inter-context computed properties
model('nestedObj')('parentArrayLength'); // => 2
model('nestedObj').on('change', 'parentArrayLength', function() {
  log.unshift('nestedObj.parentArrayLength = ' + model('nestedObj')('parentArrayLength'));
});
model('arr').push(42);
log[0]; // => 'nestedObj.parentArrayLength = 3'
model('arr').pop();
log[0]; // => 'nestedObj.parentArrayLength = 2'
model('nestedObj').off('change', 'parentArrayLength');





// Mutating array methods tests

// Dummy log entry
log.unshift('nope');

// Set arr[0] to 1, change event should NOT fire
model('arr')(0, 1);
log[0]; // => 'nope'
// Set arr[0] to 2, change event fires, value is new
model('arr')(0, 2);
log[0]; // => 'arr[0] = 2'
// Back to 1
model('arr')(0, 1);

model('arr').push(42);
model('arr').values; // => [1, 3, 42]
log[1]; // => '1 element(s) inserted at 2'

model('arr').pop();
model('arr').values; // => [1, 3]
log[1]; // => '1 element(s) deleted from 2'

model('arr').reverse();
model('arr').values; // => [3, 1]
log[1]; // => '2 element(s) deleted from 0'
log[0]; // => '2 element(s) inserted at 0'

model('arr').shift();
model('arr').values; // => [1]
log[1]; // => '1 element(s) deleted from 0'

model('arr').unshift(42);
model('arr').values; // => [42, 1]
log[1]; // => '1 element(s) inserted at 0'

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
model.on('change', 'a', function() {
  log.unshift('a = ' + JSON.stringify(this('a').values));
});
model.on('change', 'even', function() {
  log.unshift('even = ' + JSON.stringify(this('even').values));
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


// Same test for array of objects
model = freak({
  a: [{b: 1}, {b: 2}, {b: 3}, {b: 4}],
  even: function() {
    return this('a').values.filter(function(el) {
      return el.b % 2 === 0;
    });
  },
  evenLength: function() {
    return this('even').len;
  }
});

model.on('change', 'a', function() {
  log.unshift('a = ' + JSON.stringify(this('a').values));
});
model.on('change', 'even', function() {
  log.unshift('even = ' + JSON.stringify(this('even').values));
});
model.on('change', 'evenLength', function() {
  log.unshift('evenLength = ' + this('evenLength'));
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


// Circular dependency tests

model = freak({
  checkboxes: [true, false, true, true],

  // "Toggle All" functionality, when all are checked,
  // `toggleAll` state is checked; setting it affects all checkboxes
  toggleAll: function(newValue) {
    if (typeof newValue === 'boolean') {
      // Setter
      this('checkboxes').values.map(function(val, i) {
        this('checkboxes')(i, newValue);
      }, this);
    }
    else {
      // Getter
      // (typeof newValue === 'function' in this case, callback for async call)
      return this('checkboxes').values.reduce(function(prev, curr) {
        // Logical 'and' of all values
        return prev && curr;
      }, true);
    }
  }
});

model('toggleAll'); // => false
model('checkboxes')(1, true);
model('toggleAll'); // => true
model('toggleAll', false);
model('checkboxes').values; // => [false, false, false, false]



// Same tests, but for array of objects
model = freak({
  checkboxes: [{ checked: true }, { checked: false }],

  toggleAll: function(newValue) {
    if (typeof newValue === 'boolean') {
      // Setter
      this('checkboxes').values.map(function(val, i) {
        this('checkboxes')(i)('checked', newValue);
      }, this);
    }
    else {
      // Getter
      // (typeof newValue === 'function' in this case, callback for async call)
      return this('checkboxes').values.reduce(function(prev, curr) {
        // Logical 'and' of all checked field values
        return prev && curr.checked;
      }, true);
    }
  }
});

model('toggleAll'); // => false
model('checkboxes')(1)('checked', true);
model('toggleAll'); // => true
model('toggleAll', false);
JSON.stringify(model('checkboxes').values); // => '[{"checked":false},{"checked":false}]'


// Serialization / deserialization tests

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
var exported = model.toJSON(); // => '{"a":1,"b":[2,2],"obj":{"a":22},"arr":[{"a":6},{"a",7}]}'
exported = JSON.parse(exported);
exported.a = 40;
model.fromJSON(exported);
model('c'); // => 42
exported.a = 20;
model.fromJSON(JSON.stringify(exported));
model('c'); // => 22


// Cousin dependencies
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
model(1).on('change', 'a', function() {
  log.unshift('a=' + this('a'));
});
model(1)('a'); // => 22
model(2)('a')(0, 42);
log[0]; // => 'a=42'



// 'forEach', 'every', 'some', 'filter', 'find', 'findIndex',
// 'keys', 'map', 'reduce', 'reduceRight'

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



// Event delegation
model('arr').on('change', function(prop) {
  log.unshift(prop + ' changed to ' + this(prop));
});

model('arr')(0, 42);
log[0]; // => '0 changed to 42'

model('arr')(2, 128);
log[0]; // => '2 changed to 128'

```

