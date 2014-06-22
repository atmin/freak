function freak(obj, root, parent) {

  // Collect child accessors
  var children = {};
  var i, len;

  function identity(x) {
    return x;
  }

  function isDefined(x) {
    return x !== null && x !== undefined;
  }

  // Functional accessor
  function accessor(prop, arg, transformer, signal) {

    var i, len, result, val;

    var dependents = this.dependents[prop] || [];
    var watchers = this.watchers[prop] || [];

    var formatter = transformer || identity;

    var getter = function(prop) {
      var result = this.values[prop];
      return formatter(
        typeof result === 'function' ?
          result.call(getter) : 
          result
      );
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
    if ((arg === undefined || typeof arg === 'function') && !signal) {

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

      return Array.isArray(result) ?
        // Collection
        typeof transformer === 'function' ?
          // Transformer provided, map, then filter not defined values
          result.map(transformer).filter(isDefined) :
          // No transformer
          result :

        typeof result === 'object' ?
          // Child context
          freak(val) :

          // Single value
          formatter(result);

    }

    else {

      // Setter?
      if (!signal) {
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
        accessor.call(this, dependents[i], arg, null, 'refresh');
      }

      // Notify watchers
      for (i = 0, len = watchers.length; i < len; i++) {
        watchers[i](accessor(prop));
      }

    } // if getter        

  } // accessor


  // Accessor context
  var context = {
    children: {},
    accessors: {},
    dependents: {},
    watchers: {},
    arrayWatchers: [],
    values: obj,
    root: root || obj,
    parent: parent || null
  };

  return accessor.bind(context);
}

// CommonJS export
if (typeof module === 'object') module.exports = freak;