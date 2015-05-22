'use strict';
angular.module('hackstack.common', [])
  
  .factory('hackStackUtils', function ($timeout, $window) {
    /**
     * A random number will be generated between 0 and MAX_ERROR_DISTRIBUTION.
     * The number generated will be used to determine which error will be produced.
     * Note when defining distributions of errors that you need to leave room
     * for a clean return.  So try not to make your distributions add up to this
     * number.
     *
     * 100 - sum_of_distributions = the chance of a clean return.
     */
    var MAX_ERROR_DISTRIBUTION = 100;
    /**
     * Set a specific error to be returned.  Pass in the HTTP error code.
     *
     * @type {Number} The HTTP Error code to return.
     */
    var nextError = null;

    /**
     * Set to ensure you get a 200 return from the the API.  This will
     * bypass the random error generation.
     *
     * @type {boolean} False to produce errors, true to prevent errors.
     */
    var errorsDisabled = false;

    var errorTriggers = [];

    function _getErrorTriggers() {
      return errorTriggers;
    }

    var defaults = {
      maxTime: 2000,
      minTime: 0,
      absoluteTime: null
    };

    var options = defaults;

    /**
     * The default list of errors to be randomly produced.
     * Contains three properties:
     *   status: The HTTP status code of the error.
     *   statusText: The status text associated with the error.
     *   distribution: The chance out of 100 that the error will occure.
     *      i.e. a 5 means the error will be produced 5 percent of the time.
     *
     * @type {*[]} An array of error objects.
     */
    var errors = [{
      status: 0, //Dropped connection
      statusText: '',
      distribution: 5
    }, {
      status: 400,
      statusText: 'Bad request',
      distribution: 1
    }, {
      status: 401,
      statusText: 'Not authorized',
      distribution: 3
    }, {
      status: 403,
      statusText: 'Forbidden',
      distribution: 3
    }, {
      status: 404,
      statusText: 'Not found',
      distribution: 6
    }, {
      status: 405,
      statusText: 'Method not allowed',
      distribution: 2
    }, {
      status: 406,
      statusText: 'Not acceptable',
      distribution: 2
    }, {
      status: 407,
      statusText: 'Proxy Authentication Required',
      distribution: 0
    }, {
      status: 408,
      statusText: 'Request timeout',
      distribution: 2
    }, {
      status: 409,
      statusText: 'Conflict',
      distribution: 1
    }, {
      status: 410,
      statusText: 'Gone',
      distribution: 1
    }, {
      status: 411,
      statusText: 'Length required',
      distribution: 1
    }, {
      status: 412,
      statusText: 'Precondition Failed',
      distribution: 1
    }, {
      status: 413,
      statusText: 'Request entity too large',
      distribution: 1
    }, {
      status: 414,
      statusText: 'Request-URI too long',
      distribution: 1
    }, {
      status: 415,
      statusText: 'Unsupported media type',
      distribution: 1
    }, {
      status: 416,
      statusText: 'Requested range not satisfiable',
      distribution: 1
    }, {
      status: 417,
      statusText: 'Expectation failed',
      distribution: 1
    }, {
      status: 500,
      statusText: 'Internal server error',
      distribution: 5
    }, {
      status: 501,
      statusText: 'Not implemented',
      distribution: 1
    }, {
      status: 502,
      statusText: 'Bad gateway',
      distribution: 0
    }, {
      status: 503,
      statusText: 'Service unavailable',
      distribution: 1
    }, {
      status: 504,
      statusText: 'Gateway timeout',
      distribution: 0
    }, {
      status: 505,
      statusText: 'HTTP version not supported',
      distribution: 0
    }];

    /**
     * Set whether or not the hack stack should randomly produce server errors
     *
     * @param {boolean} disabled true to disable errors, false (default)
     * otherwise.
     * @returns {boolean} If called without a parameter, acts as a getter.
     */
    function disableRandomErrors(disabled) {
      if (disabled || disabled === false) {
        errorsDisabled = disabled;
      } else {
        return errorsDisabled;
      }
    }

    /**
     * Retrieve the full error object from the errors array.
     *
     * @param errorCode The HTTP error code to be retrieved.
     * @returns {*} The object as is appears in the errors Array.
     */
    function getErrorByCode(errorCode) {
      if (typeof errorCode !== 'number') {
        throw new Error('Must provide an integer error code');
      }

      var error = R.filter(function (errorItem) {
        return errorItem.status === errorCode;
      }, errors);

      if (error.length === 0 || error.length > 1) {
        return false;
      }
      return cleanError(error[0]);
    }

    /**
     * Set the error code to the desired HTTP error.
     *
     * @param errorCode
     */
    function forceError(errorCode) {
      if (errorCode === null) {
        nextError = null;
      } else if (getErrorByCode(errorCode) !== false) {
        nextError = errorCode;
      } else {
        throw new Error('Unsupported HTTP Code');
      }
    }

    /**
     * Cleans the entry in the error array to the actual return doesn't
     * contain unwanted information.
     *
     * @param error The error from the error aray.
     * @returns {{status: *, statusText: *, data: string}} The mock $HTTP
     * return object.
     *
     */
    function cleanError(error) {
      return {
        status: error.status,
        statusText: error.statusText,
        data: error.statusText.concat(' -- generated by hackStack')
      };
    }

    /**
     * Generate a random integer.
     *
     * @param min The minimum number you want to see.
     * @param max The highest number you want to see.
     *
     * @returns {*} A random integer within the specified range.
     */
    function randomInt(min, max) {
      return Math.floor(Math.random() * (max - min)) + min;
    }

    /**
     * Produce a random HTTP error from the 400 or 500 series errors.  The
     * errors come from the internal list of possible errors by default and have
     * weights assigned to them that indicate the relative frequency that
     * the error should occur.
     *
     * @param errorArray The list of possible errors to choose from.  Defaults
     * to the internal list of errors.
     *
     * @returns {*} A object representing an HTTP error or null if there is no
     * error.
     */
    function randomError(errorArray) {
      errorArray = errorArray || errors;

      var totalWeight = R.reduce(function (acc, value) {
        return acc + value.distribution;
      }, 0, errorArray);

      if (totalWeight > MAX_ERROR_DISTRIBUTION) {
        throw new Error(
          'Sum of distributions is greater than defined max');
      }

      var randomNumber = randomInt(0, MAX_ERROR_DISTRIBUTION);
      var error = null;
      var weightedSum = 0;

      if (nextError === null) {
        if (errorsDisabled === false) {
          R.forEach(function (item) {
            weightedSum += item.distribution;
            if (randomNumber <= weightedSum && error === null) {
              error = cleanError(item);
            }
          }, errorArray);
        }
      } else {
        return cleanError(getErrorByCode(nextError));
      }


      return error;
    }

    function evaluateTriggers(data, method) {
      var error = null;
      if(!data && data !== 0) {
        return error;
      }
      if(errorTriggers.length > 0) {
        R.forEach(function (trigger) {
          if (trigger.fn(data) === true) {
            error = cleanError(getErrorByCode(trigger.errorCode));
          }
        }, R.filter(R.propEq('method', method), errorTriggers));
      }
      
      return error;
    }
    
    function produceError(data, method, errorArray) {
      var error = evaluateTriggers(data, method);
      if (null === error) {
        error = randomError(errorArray);
      }
      return error;
    }

    function addErrorTrigger(errorFn, errorCode, method) {
      var validMethods = [
        'get',
        'post',
        'all'
      ];
      var validErrorCodes = R.pluck('status')(errors);

      if (!errorFn || typeof errorFn !== 'function') {
        throw new Error('generateError function requires a function' +
          ' as its first parameter');
      }
      if (!errorCode || R.indexOf(errorCode, validErrorCodes) === -1) {
        throw new Error('error code must be on of: ' +
          validErrorCodes.toString());
      }
      method = method || 'all';
      if (R.indexOf(method.toLowerCase(), validMethods) === -1) {
        throw new Error('method must be one of: ' + validMethods.toString());
      }

      var id = 0;
      if (errorTriggers.length > 0) {
        id = R.max(R.pluck('id', errorTriggers)) + 1;
      }

      errorTriggers.push({
        id: id,
        fn: errorFn,
        errorCode: errorCode,
        method: method.toLowerCase()
      });

      return function removeTrigger() {
        var myId = id;
        var removeIndex = R.findIndex(R.propEq('id', myId))(errorTriggers);
        errorTriggers.splice(removeIndex, 1);
      };

    }

    /**
     * Add a false latency to any requests made.
     *
     * @returns {*} True, always.
     */
    function waitForTime() {
      var time;
      if (options.absoluteTime !== null) {
        time = options.absoluteTime;
      } else {
        time = randomInt(options.minTime, options.maxTime);
      }

      return $timeout(function () {
        return true;
      }, time);
    }

    function setOptions(newOptions) {
      options = R.merge(options, newOptions);
    }

    $window.hackStackUtils = {
      forceError: forceError,
      disableRandomErrors: disableRandomErrors
    };

    return {
      addErrorTrigger: addErrorTrigger,
      disableRandomErrors: disableRandomErrors,
      forceError: forceError,
      getErrorByCode: getErrorByCode,
      produceError: produceError,
      randomError: randomError,
      randomInt: randomInt,
      setOptions: setOptions,
      waitForTime: waitForTime,
      _getErrorTriggers: _getErrorTriggers
    };
  });
