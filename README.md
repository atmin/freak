freak
=====

Functional reactive object wrapper

```js

var freak = require('./freak.js');

var obj = {
  a: 1,
  b: 2,
  arr: [1, 2, 3],
  obj: {
    x: 42
  },
  f: function() {
    return this('a') + this('b');
  },
  sum: function() {
    return this('arr').reduce(function(prev, curr) {
      return prev + curr;
    });
  }
};


var model = freak(obj);

// Freak returns accessor function
typeof model; // => 'function'

// Log changes of `f` property
// model.watch('f', function() {
//   console.log('f has changed and is now ' + this('f'));
// });

// Get property
model('a'); // => 1

// Get computed property
model('f'); // => 3

// Set property
model('a', 2);

// Get computed property
model('f'); // => 4

// Get child context property
model('obj')('x'); // => 42

// Arrays can mutate
// model('arr').splice(1, 1);
// And we can see raw values
// model('arr').values; // => [1, 3]

// Computed properties work for arrays, too
// model('sum'); // => 4
```
