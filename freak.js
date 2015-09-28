'use strict';

function freak(obj, root, parent, prop) {

  var listeners = {'change': [], 'update': [], 'insert': [], 'delete': []};
  var registeredListeners = {'change': [], 'update': [], 'insert': [], 'delete': []};
  var deps = {};
  var cache = {};
  var children = {};

  // Mix properties into target
  function mixin(target, properties) {
    Object.getOwnPropertyNames(properties).forEach(function(prop) {
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
  // on('change', 'prop', function() { ... })
  // on('update', function(prop) { ... })
  // on('insert', function(index, count) { ... })
  // on('delete', function(index, count) { ... })
  function on() {
    var event = arguments[0];
    var prop = ['string', 'number'].indexOf(typeof arguments[1]) > -1 ?
      arguments[1] : null;
    var callback =
      typeof arguments[1] === 'function' ?
        arguments[1] :
        typeof arguments[2] === 'function' ?
          arguments[2] : null;

    // Args check
    if (!(
      (event === 'change') ||
      (['insert', 'delete', 'update'].indexOf(event) > -1 && prop === null)
    )) throw('invalid arguments');

    // Already registered?
    if (registeredListeners[event].indexOf(callback) === -1) {
      registeredListeners[event].push(callback);
      listeners[event].push(
        (event === 'change' && prop !== null) ?
          // on('change', 'prop', function() { ... })
          function(_prop) { if (_prop === prop) callback.call(instance) } :
          callback
      );
    }
  }

  // Remove all or specified listeners given event and property
  function off() {
    var event = arguments[0];
    var prop = typeof arguments[1] === 'string' ? arguments[1] : null;
    var callback =
      typeof arguments[1] === 'function' ?
        arguments[1] :
        typeof arguments[2] === 'function' ?
          arguments[2] : null;
    var i;

    // Remove all property watchers?
    if (!callback) {
      registeredListeners[event] = [];
      listeners[event] = [];
    }
    else {
      // Remove specific callback
      i = registeredListeners[event].indexOf(callback);
      if (i > -1) {
        registeredListeners[event].splice(i, 1);
        listeners[event].splice(i, 1);
      }
    }

  }

  // trigger('change', prop)
  // trigger('update', prop)
  // trigger('insert' or 'delete', index, count)
  function trigger(event, a, b) {
    (listeners[event] || []).forEach(function(handler) {
      handler.call(instance, a, b);
    });
  }

  // Export model to JSON string
  // NOT exported:
  // - properties starting with _ (Python private properties convention)
  // - computed properties (derived from normal properties)
  function toJSON() {
    function filter(obj) {
      var key, filtered = Array.isArray(obj) ? [] : {};
      for (key in obj) {
        if (typeof obj[key] === 'object') {
          filtered[key] = filter(obj[key]);
        }
        else if (typeof obj[key] !== 'function' && key[0] !== '_') {
          filtered[key] = obj[key];
        }
      }
      return filtered;
    }
    return JSON.stringify(filter(obj));
  }

  // Update handler
  function update(prop) {
    // trigger change if necessary
    if (!deepEqual(cache[prop], _get(prop, true))) {
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
  function getDependencyTracker(prop) {
    function tracker(context) {
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
    var result = tracker(instance);
    construct(result);
    result.parent = parent ? tracker(parent) : null;
    result.root = tracker(root || instance);
    return result;
  }

  // Shallow clone an object
  function shallowClone(obj) {
    var key, clone;
    if (obj && typeof obj === 'object') {
      clone = {};
      for (key in obj) {
        clone[key] = obj[key];
      }
    }
    else {
      clone = obj;
    }
    return clone;
  }

  // Getter for prop, if callback is given
  // can return async value
  function _get(prop, skipCaching) {
    var val = obj[prop];
    if (typeof val === 'function') {
      val = val.call(getDependencyTracker(prop));
      if (!skipCaching) {
        cache[prop] = shallowClone(val);
      }
    }
    else if (!skipCaching) {
      cache[prop] = val;
    }
    return val;
  }

  function getter(prop, skipCaching) {
    var result = _get(prop, skipCaching);

    return result && typeof result === 'object' ?
      // Wrap object
      children[prop] ?
        children[prop] :
        children[prop] = freak(result, root || instance, instance, prop) :
      // Simple value
      result;
  }

  // Set prop to val
  function setter(prop, val) {
    var oldVal = _get(prop);

    if (typeof obj[prop] === 'function') {
      // Computed property setter
      obj[prop].call(getDependencyTracker(prop), val);
    }
    else {
      // Simple property
      obj[prop] = val;
      if (val && typeof val === 'object') {
        delete cache[prop];
        delete children[prop];
      }
    }

    if (oldVal !== val) {
      trigger('update', prop);
    }
  }

  // Functional accessor, unify getter and setter
  function accessor(prop, arg, skipCaching) {
    return (arg === undefined) ? getter(prop, skipCaching) : setter(prop, arg);
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
      return function() {
        var callback = arguments[0];
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
