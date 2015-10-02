'use strict';

function freak(obj, root, parent, prop) {

  var listeners = {'change': [], 'update': [], 'insert': [], 'delete': []};
  var deps = {};
  var cache = {};
  var children = {};

  // Mix properties into target
  function mixin(target, properties) {
    Object.keys(properties).forEach(function(prop) {
      target[prop] = properties[prop];
    });
  }

  function deepEqual(x, y) {
    if (typeof x === "object" && x !== null &&
        typeof y === "object" && y !== null) {

      if (Object.keys(x).length !== Object.keys(y).length) {
        return false;
      }

      for (var prop in x) {
        if (x.hasOwnProperty(prop)) {
          if (y.hasOwnProperty(prop)) {
            if (!deepEqual(x[prop], y[prop])) {
              return false;
            }
          }
          else {
            return false;
          }
        }
      }

      return true;
    }
    else if (x !== y) {
      return false;
    }

    return true;
  }

  // Event functions

  // on('change', function(prop) { ... })
  // on('update', function(prop) { ... })
  // on('insert', function(index, count) { ... })
  // on('delete', function(index, count) { ... })
  function on(event, callback) {
    if ( (['change', 'insert', 'delete', 'update'].indexOf(event) === -1) ||
         (typeof callback !== 'function') ) throw('invalid arguments');
    if (listeners[event].indexOf(callback) === -1) listeners[event].push(callback);
  }

  // Remove all or specified listeners given event and property
  function off(event, callback) {
    if (callback) {
      // Remove specific callback
      var i = listeners[event].indexOf(callback);
      if (i > -1) listeners[event].splice(i, 1);
    }
    else {
      // Remove all property watchers
      listeners[event] = [];
    }

  }

  // trigger('change' or 'update', prop)
  // trigger('insert' or 'delete', index, count)
  function trigger(event, a, b) {
    (listeners[event] || []).forEach(function(handler) {
      handler.call(instance, a, b);
    });
  }

  // Export model to JSON string. Not exported:
  // - properties starting with _ (Python private properties convention)
  // - computed properties (derived from normal properties)
  function toJSON() {
    function filter(obj) {
      return Object.keys(obj)
        .filter(function(key) {
          return typeof obj[key] !== 'function' && key[0] !== '_';
        })
        .reduce(function(clone, key) {
          clone[key] = typeof obj[key] !== 'object' ?
            obj[key] : filter(obj[key]);
          return clone;
        }, Array.isArray(obj) ? [] : {});
    }
    return JSON.stringify(filter(obj));
  }

  // Update handler
  function update(prop) {
    // trigger change if necessary
    if (!deepEqual(cache[prop], _get(prop))) {
      trigger('change', prop);
    }
    // Notify dependents
    (deps[prop] || []).forEach(function(dep) {
      delete children[dep[0]];
      dep[1].trigger('update', dep[0]);
    });
    // Notify computed properties, depending on parent object
    if (instance.parent) {
      instance.parent.trigger('update', instance.prop);
    }
  }

  // Proxy the accessor function to record all accessed properties
  function tracker(prop) {
    function _tracker(context) {
      return function(_prop, _arg) {
        context.deps[_prop] = context.deps[_prop] || [];
        if (!context.deps[_prop].reduce(function found(prev, curr) {
              return prev || (curr[0] === prop);
            }, false)) {
          context.deps[_prop].push([prop, instance]);
        }
        return context(_prop, _arg, true);
      }
    }
    var result = _tracker(instance);
    construct(result);
    result.parent = parent ? _tracker(parent) : null;
    result.root = _tracker(root || instance);
    return result;
  }

  // Getter for prop
  function _get(prop) {
    var val = obj[prop];
    return cache[prop] = (typeof val === 'function') ?
      val.call(tracker(prop)) : val;
  }

  function getter(prop) {
    var val = _get(prop);
    return val && typeof val === 'object' ?
      // Wrap object
      children[prop] ?
        children[prop] :
        children[prop] = freak(val, root || instance, instance, prop) :
      // Simple value
      val;
  }

  // Set prop to val
  function setter(prop, val) {
    var oldVal = _get(prop);

    if (typeof obj[prop] === 'function') {
      // Computed property setter
      obj[prop].call(tracker(prop), val);
    }
    else {
      // Simple property
      obj[prop] = val;
    }

    delete cache[prop];
    delete children[prop];

    return (oldVal !== val) && trigger('update', prop);
  }

  // Functional accessor, unify getter and setter
  function accessor(prop, arg) {
    return (arg === undefined) ? getter(prop) : setter(prop, arg);
  }

  // Attach instance members
  function construct(target) {
    mixin(target, {
      values: obj,
      parent: parent || null,
      root: root || target,
      prop: prop === undefined ? null : prop,
      // .on(event[, prop], callback)
      on: on,
      // .off(event[, prop][, callback])
      off: off,
      // .trigger(event[, prop])
      trigger: trigger,
      toJSON: toJSON,
      // internal: dependency tracking
      deps: deps
    });

    // Wrap mutating array method to update
    // state and notify listeners
    function wrapMutatingArrayMethod(method, func) {
      return function() {
        var result = [][method].apply(obj, arguments);
        this.len = this.values.length;
        cache = {};
        children = {};
        func.apply(this, arguments);
        target.parent.trigger('update', target.prop);
        return result;
      };
    }

    // Wrap callback of an array method to
    // provide this content to the currently processed item
    function proxyArrayMethod(method) {
      return function(callback) {
        return [][method].apply(
          obj,
          callback ?
            [function(el, i) {
              return callback.apply(target(i), arguments);
            }].concat([].slice.call(arguments, 1)) :
            arguments
        );
      };
    }

    if (Array.isArray(obj)) {
      mixin(target, {
        // Function prototype already contains length
        // `len` specifies array length
        len: obj.length,

        pop: wrapMutatingArrayMethod('pop', function() {
          trigger('delete', this.len, 1);
        }),

        push: wrapMutatingArrayMethod('push', function() {
          trigger('insert', this.len - 1, 1);
        }),

        reverse: wrapMutatingArrayMethod('reverse', function() {
          trigger('delete', 0, this.len);
          trigger('insert', 0, this.len);
        }),

        shift: wrapMutatingArrayMethod('shift', function() {
          trigger('delete', 0, 1);
        }),

        unshift: wrapMutatingArrayMethod('unshift', function() {
          trigger('insert', 0, 1);
        }),

        sort: wrapMutatingArrayMethod('sort', function() {
          trigger('delete', 0, this.len);
          trigger('insert', 0, this.len);
        }),

        splice: wrapMutatingArrayMethod('splice', function() {
          if (arguments[1]) {
            trigger('delete', arguments[0], arguments[1]);
          }
          if (arguments.length > 2) {
            trigger('insert', arguments[0], arguments.length - 2);
          }
        })

      });

      [ 'forEach', 'every', 'some', 'filter', 'find', 'findIndex',
        'keys', 'map', 'reduce', 'reduceRight'
      ].forEach(function(method) {
        target[method] = proxyArrayMethod(method);
      });
    }
  }

  on('update', update);

  // Create freak instance
  var instance = accessor.bind(null);

  // Attach instance members
  construct(instance);

  return instance;
}

// CommonJS export
if (typeof module === 'object') module.exports = freak;
