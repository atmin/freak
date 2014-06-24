'use strict';

function freak(obj, root, parent) {

  /*
  * memoize.js
  * by @philogb and @addyosmani
  * with further optimizations by @mathias
  * and @DmitryBaranovsk
  * perf tests: http://bit.ly/q3zpG3
  * Released under an MIT license.
  */
  function memoize( fn ) {
    return function () {
      var args = Array.prototype.slice.call(arguments),
        hash = "",
        i = args.length,
        currentArg = null;
      while (i--) {
        currentArg = args[i];
        hash += (currentArg === Object(currentArg)) ? 
        JSON.stringify(currentArg) : currentArg;
        fn.memoize || (fn.memoize = {});
      }
      return (hash in fn.memoize) ? fn.memoize[hash] : 
      fn.memoize[hash] = fn.apply(this, args);
    };
  }

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
    var prop = typeof arguments[1] === 'string' ? arguments[1] : null;
    var callback = 
      typeof arguments[1] === 'function' ?
        arguments[1] :
        typeof arguments[2] === 'function' ?
          arguments[2] : null;

    // Args check
    assert(['update', 'insert', 'delete'].indexOf(event) > -1);
    assert(
      (event === 'update' && prop) ||
      ((event === 'insert' || event === 'delete') && !prop)
    );

    // Init listeners
    if (!this.listeners[event][prop]) {
      this.listeners[event][prop] = [];
    }
    // Already registered?
    if (this.listeners[event][prop].indexOf(callback) === -1) {
      this.listeners[event][prop].push(callback);
    }
  }

  function off() {
    var event = arguments[0];
    var prop = typeof arguments[1] === 'string' ? arguments[1] : null;
    var callback = 
      typeof arguments[1] === 'function' ?
        arguments[1] :
        typeof arguments[2] === 'function' ?
          arguments[2] : null;
    var i;

    if (!this.listeners[event][prop]) return;

    // Remove all property watchers?
    if (!callback) {
      this.listeners[event][prop] = [];
    }
    else {
      // Remove specific callback
      i = this.listeners[event][prop].indexOf(callback);
      if (i > -1) {
        this.listeners[event][prop].splice(i, 1);
      }
    }

  }  

  // trigger('update', prop)
  // trigger('insert' or 'delete', index, count)
  function trigger(event, a, b) {
    var listeners =
      ( this &&
        this.listeners &&
        this.listeners[event] && 
        this.listeners[event][event === 'update' ? a : null]
      ) || [];

    listeners.map(function(listener) {
      if (event === 'update') {
        listener.call(bound);
      }
      else {
        listener.call(bound, a, b);
      }
    });
  }

  // Functional accessor
  function accessor(prop, arg, refresh) {

    var i, len, dependents, result, val;

    var getter = function(prop) {
      var result = this.values[prop];
      return typeof result === 'function' ?
        result.call(getter) : 
        result
    };

    var dependencyTracker = function(propToReturn) {
      // Update dependency tree
      if (!this.dependents[propToReturn]) {
        this.dependents[propToReturn] = [];
      }
      if (this.dependents[propToReturn].indexOf(prop) === -1) {
        this.dependents[propToReturn].push(prop);
      }
      return getter.call(this, propToReturn);
    };

    // Getter?
    if ((arg === undefined || typeof arg === 'function') && !refresh) {

      val = this.values[prop];

      result = (typeof val === 'function') ?
        // Computed property
        val.call(dependencyTracker.bind(this)) :
        // Static property (leaf in the dependency tree)
        val;

      return typeof result === 'object' ? memoize(freak)(val) : result;
    }

    // Setter
    else {

      if (!refresh) {
        if (typeof this.values[prop] === 'function') {
          // Computed property setter
          this.values[prop].call(dependencyTracker.bind(this), arg);
        }
        else {
          // Simple property. `arg` is the new value
          this.values[prop] = arg;
        }
      }

      // Notify dependents
      for (i = 0, dependents = this.dependents[prop] || [], len = dependents.length;
          i < len; i++) {
        accessor.call(this, dependents[i], arg, true);
      }

      // Emit update event
      trigger.call(this, 'update', prop);

    } // if getter        

  } // end accessor

  parent = parent || null;
  root = root || obj;

  // Accessor context (private variables)
  var context = {
    accessors: {},
    dependents: {},
    listeners: {
      'update': {},
      'insert': {},
      'delete': {}
    },
    values: obj,
    root: root,
    parent: parent
  };

  // Accessor instance (public interface)
  var instance = {
    values: obj,
    parent: parent,
    root: root,

    // .on(event[, prop], callback)
    on: on.bind(context),
        
    // .off(event[, prop][, callback])
    off: off.bind(context)

  }; // end instance

  // Array properties
  var array = {
    // Function prototype already contains length
    len: obj.length,

    pop: function() {
      var result = this.values.pop();
      this.len = this.values.length;
      trigger('delete', this.len, 1);
      return result;
    },

    push: function() {
      var result = [].push.apply(this.values, arguments);
      this.len = this.values.length;
      trigger('insert', this.len - 1, 1);
      return result;
    },

    reverse: function() {
      var result = this.values.reverse();
      this.len = this.values.length;
      trigger('delete', 0, this.len);
      trigger('insert', 0, this.len);
      return result;
    },

    shift: function() {
      var result = this.values.shift();
      this.len = this.values.length;
      trigger('delete', 0, 1);
      return result;
    },

    unshift: function() {
      var result = [].unshift.apply(this.values, arguments);
      this.len = this.values.length;
      trigger('insert', 0, 1);
      return result;
    },

    sort: function() {
      var result = [].sort.apply(this.values, arguments);
      trigger('delete', 0, this.length);
      trigger('insert', 0, this.length);
      return result;
    },

    splice: function() {
      var result = [].splice.apply(this.values, arguments);
      this.len = this.values.length;
      if (arguments[1]) {
        trigger('delete', arguments[0], arguments[1]);
      }
      if (arguments.length > 2) {
        trigger('insert', arguments[0], arguments.length - 2);
      }
      return result;
    }

  };

  // Attach instance
  var bound = accessor.bind(context);
  mixin(bound, instance);
  if (Array.isArray(obj)) {
    mixin(bound, array);
  }

  return bound;
}

// CommonJS export
if (typeof module === 'object') module.exports = freak;