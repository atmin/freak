'use strict';

function freak(obj, root, parent) {

  // Collect child accessors
  var children = {};
  var i, len;

  function mixin(target, properties) {
    for (var i = 0, props = Object.getOwnPropertyNames(properties), len = props.length;
        i < len; i++) {
      target[props[i]] = properties[props[i]];
    }
  }

  // Functional accessor
  function accessor(prop, arg, refresh) {

    var i, len, result, val;

    var dependents = this.dependents[prop] || [];
    var watchers = this.watchers[prop] || [];

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

      // Parent context?
      if (prop === '..') {
        return this.parent;
      }

      // Root context?
      if (prop === '/') {
        return this.root;
      }

      val = this.values[prop];

      result = (typeof val === 'function') ?
        // Computed property
        val.call(dependencyTracker.bind(this)) :
        // Static property (leaf in the dependency tree)
        val;

      return typeof result === 'object' ? freak(val) : result;
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
      for (i = 0, len = dependents.length; i < len; i++) {
        accessor.call(this, dependents[i], arg, true);
      }

      // Notify watchers
      for (i = 0, len = watchers.length; i < len; i++) {
        watchers[i](arg);
      }

    } // if getter        

  } // end accessor

  parent = parent || null;
  root = root || obj;

  // Accessor context
  var context = {
    children: {},
    accessors: {},
    dependents: {},
    watchers: {},
    arrayWatchers: [],
    values: obj,
    root: root,
    parent: parent
  };

  // Accessor instance
  var instance = {
    values: obj,
    parent: parent,
    root: root,

    watch: function(prop, callback) {
      // Init watchers
      if (!this.watchers[prop]) {
        this.watchers[prop] = [];
      }
      // Already registered?
      if (this.watchers[prop].indexOf(callback) === -1) {
        this.watchers[prop].push(callback);
      }
    }.bind(context),

    unwatch: function(prop, callback) {
      var i;

      if (!this.watchers[prop]) return;

      // Remove all property watchers?
      if (!callback) {
        this.watchers[prop] = [];
      }
      else {
        // Remove specific callback
        i = this.watchers[prop].indexOf(callback);
        if (i > -1) {
          this.watchers.splice(i, 1);
        }
      }

    }.bind(context),

    watchArray: function(callback) {

    }
        
  };

  var notify = function() {

  };

  // Array properties
  var array = {
    // Function prototype already contains length
    len: obj.length,

    pop: function() {
      var result = this.values.pop();
      this.len = this.values.length;
      notify('del', this.len, 1);
      return result;
    },

    push: function() {
      var result = [].push.apply(this.values, arguments);
      this.len = this.values.length;
      notify('ins', this.len - 1, 1);
      return result;
    },

    reverse: function() {
      var result = this.values.reverse();
      this.len = this.values.length;
      notify('del', 0, this.len);
      notify('ins', 0, this.len);
      return result;
    },

    shift: function() {
      var result = this.values.shift();
      this.len = this.values.length;
      notify('del', 0, 1);
      return result;
    },

    unshift: function() {
      var result = [].unshift.apply(this.values, arguments);
      this.len = this.values.length;
      notify('ins', 0, 1);
      return result;
    },

    sort: function() {
      var result = [].sort.apply(this.values, arguments);
      notify('del', 0, this.length);
      notify('ins', 0, this.length);
      return result;
    },

    splice: function() {
      var result = [].splice.apply(this.values, arguments);
      this.len = this.values.length;
      if (arguments[1]) {
        notify('del', arguments[0], arguments[1]);
      }
      if (arguments.length > 2) {
        notify('ins', arguments[0], arguments.length - 2);
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