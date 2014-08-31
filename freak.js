'use strict';

function freak(obj, root, parent, prop) {

  var listeners = {
    'change': {},
    'update': {},
    'insert': {},
    'delete': {}
  };
  var dependents = {};
  var cache = {};

  // Assert condition
  function assert(cond, msg) {
    if (!cond) {
      throw msg || 'assertion failed';
    }
  }

  // Mix properties into target
  function mixin(target, properties) {
    for (var i = 0, props = Object.getOwnPropertyNames(properties), len = props.length;
        i < len; i++) {
      target[props[i]] = properties[props[i]];
    }
  }

  // Event functions
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
    assert(['change', 'update', 'insert', 'delete'].indexOf(event) > -1);
    assert(
      (['change'].indexOf(event) > -1 && prop !== null) ||
      (['insert', 'delete', 'update'].indexOf(event) > -1 && prop === null)
    );

    // Init listeners for prop
    if (!listeners[event][prop]) {
      listeners[event][prop] = [];
    }
    // Already registered?
    if (listeners[event][prop].indexOf(callback) === -1) {
      listeners[event][prop].push(callback);
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

    if (!listeners[event][prop]) return;

    // Remove all property watchers?
    if (!callback) {
      listeners[event][prop] = [];
    }
    else {
      // Remove specific callback
      i = listeners[event][prop].indexOf(callback);
      if (i > -1) {
        listeners[event][prop].splice(i, 1);
      }
    }

  }

  // trigger('change', prop)
  // trigger('update', prop)
  // trigger('insert' or 'delete', index, count)
  function trigger(event, a, b) {
    (listeners[event][['change'].indexOf(event) > -1 ? a : null] || [])
      .map(function(listener) {
        listener.call(instance, a, b);
      });
  }

  // Update handler: recalculate dependent properties,
  // trigger change if necessary
  function update(prop) {
    if (cache[prop] !== getter(prop)) {
      trigger('change', prop);
    }

    // Notify dependents
    for (var i = 0, dep = dependents[prop] || [], len = dep.length;
        i < len; i++) {
      instance.trigger('update', dep[i]);
    }

    if (instance.parent) {
      // Notify computed properties, depending on parent object
      instance.parent.trigger('update', instance.prop);
    }
  }

  // Proxy the accessor function to record
  // all accessed properties
  function getDependencyTracker(prop) {
    return function(_prop, _arg) {
      if (!dependents[_prop]) {
        dependents[_prop] = [];
      }
      if (dependents[_prop].indexOf(prop) === -1) {
        dependents[_prop].push(prop);
      }
      return accessor(_prop, _arg);
    }
  }

  // Getter for prop, if callback is given
  // can return async value
  function getter(prop, callback) {
    var val = obj[prop];

    var result = (typeof val === 'function') ?
      // Computed property
      cache[prop] = val.call(getDependencyTracker(prop), callback) :
      // Static property (leaf in the dependency tree)
      val;

    return result && typeof result === 'object' ?

      typeof cache[prop] === 'function' ?
        cache[prop] :
        cache[prop] = freak(val, root || instance, instance, prop) :

      result;
  }

  // Set prop to val
  function setter(prop, val) {
    if (typeof obj[prop] === 'function') {
      // Computed property setter
      obj[prop].call(getDependencyTracker(prop), val);
    }
    else {
      // Simple property
      obj[prop] = val;
      if (val && typeof val === 'object') {
        delete cache[prop];
      }
    }

    trigger('update', prop);
  }

  // Functional accessor, unify getter and setter
  function accessor(prop, arg) {
    return (
      (arg === undefined || typeof arg === 'function') ?
        getter : setter
    )(prop, arg);
  }

  // Create freak instance
  var instance = function() {
    return accessor.apply(null, arguments);
  };

  // Attach instance properties
  mixin(instance, {
    values: obj,
    parent: parent || null,
    root: root || instance,
    prop: prop || null,
    // .on(event[, prop], callback)
    on: on,
    // .off(event[, prop][, callback])
    off: off,
    // .trigger(event[, prop])
    trigger: trigger
  });

  // Wrap mutating array method to update
  // state and notify listeners
  function wrapArrayMethod(method, func) {
    return function() {
      var result = [][method].apply(obj, arguments);
      this.len = this.values.length;
      func.apply(this, arguments);
      instance.parent.trigger('update', instance.prop);
      return result;
    };
  }

  if (Array.isArray(obj)) {
    mixin(instance, {
      // Function prototype already contains length
      // This specifies array length
      len: obj.length,

      pop: wrapArrayMethod('pop', function() {
        trigger('delete', this.len, 1);
      }),

      push: wrapArrayMethod('push', function() {
        trigger('insert', this.len - 1, 1);
      }),

      reverse: wrapArrayMethod('reverse', function() {
        cache = {};
        trigger('delete', 0, this.len);
        trigger('insert', 0, this.len);
      }),

      shift: wrapArrayMethod('shift', function() {
        cache = {};
        trigger('delete', 0, 1);
      }),

      unshift: wrapArrayMethod('unshift', function() {
        cache = {};
        trigger('insert', 0, 1);
      }),

      sort: wrapArrayMethod('sort', function() {
        cache = {};
        trigger('delete', 0, this.len);
        trigger('insert', 0, this.len);
      }),

      splice: wrapArrayMethod('splice', function() {
        cache = {};
        if (arguments[1]) {
          trigger('delete', arguments[0], arguments[1]);
        }
        if (arguments.length > 2) {
          trigger('insert', arguments[0], arguments.length - 2);
        }
      })

    });
  }

  on('update', update);

  return instance;
}

// CommonJS export
if (typeof module === 'object') module.exports = freak;
