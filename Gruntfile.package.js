/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 */

'use strict';

var assert = require('assert');
var isparta = require('isparta');
var path = require('path');

module.exports = function(grunt) {
  assert(process.env.PACKAGE, 'process.env.PACKAGE must be defined');
  var pkg = require('./packages/' + process.env.PACKAGE + '/package');

  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);
  grunt.loadTasks('tasks');

  grunt.initConfig({
    babel: {
      dist: {
        files: [{
          cwd: './packages/<%= package %>/src',
          dest: './packages/<%= package %>/dist',
          expand: true,
          filter: 'isFile',
          src: '**/*.js'
        }]
      }
    },
    clean: {
      coverage: {
        src: [
          './packages/<%= package %>/.coverage'
        ]
      },
      dist: {
        src: [
          './packages/<%= package %>/dist'
        ]
      }
    },
    concurrent: {
      test: {
        tasks: (function() {
          if (process.env.SKIP_BROWSER_TESTS) {
            return ['test:node'];
          }

          return [
            'test:automation',
            'test:browser',
            'test:node'
          ];
        }()),
        options: {
          logConcurrentOutput: true
        }
      }
    },
    copy: {
      coverage: {
        // There ought to be a better way to get karma coverage to spit out
        // absolute paths, but so far I can't find it.
        files: [{
          cwd: './reports-ng/coverage/<%= package %>',
          expand: true,
          src: '**/*.json',
          dest: './reports-ng/coverage-final/<%= package %>'
        }],
        options: {
          process: function(content) {
            var next = content;
            var current;
            while(next !== current) {
              current = next;
              next = next.replace(process.cwd() + '/', '');
            }

            var c1 = JSON.parse(next);
            var c2 = Object.keys(c1).reduce(function(content, key) {
              if (key.indexOf('test-helper-') !== -1 || key.indexOf('bin-') !== -1 || key.indexOf('xunit-with-logs') !== -1) {
                delete content[key];
              }
              return content;
            }, c1);
            return JSON.stringify(c2);
          }
        }
      }
    },
    documentation: {
      options: {
        destination: './packages/<%= package %>',
        externals: {
          cwd: './packages/<%= package %>/test/documentation/spec',
          dest: '.',
          expand: true,
          src: '**/*.js'
        },
        private: false
      },
      md: {
        src: './packages/<%= package %>/src/index.js',
        options: {
          filename: 'README.md',
          format: 'md'
        }
      },
      json: {
        src: './packages/<%= package %>/src/index.js',
        options: {
          format: 'json'
        }
      },
      html: {
        src: './packages/<%= package %>/src/index.js',
        options: {
          destination: './packages/<%= package %>/doc',
          format: 'html'
        }
      }
    },
    env: {
      default: {
        src: '.env.default.json'
      },
      secrets: {
        src: '.env'
      },
      defaults: {
        BUILD_NUMBER: process.env.BUILD_NUMBER || 'local-' + process.env.USER + '-' + pkg.name + '-' + Date.now()
      }
    },
    eslint: {
      options: {
        format: process.env.XUNIT ? 'junit' : 'stylish',
        outputFile: process.env.XUNIT && './reports-ng/style/eslint-<%= package %>.xml'
      },
      all: [
        './packages/<%= package %>/src/**/*.js',
        './packages/<%= package %>/test/**/*.js',
        '!./packages/<%= package %>/test/**/*.es6.js',
        './packages/<%= package %>/*.js'
      ]
    },
    express: {
      test: {
        options: {
          script: './packages/test-helper-server'
        }
      }
    },
    instrument2: {
      src: {
        files: [{
          cwd: './packages/<%= package %>',
          dest: './packages/<%= package %>/.coverage',
          expand: true,
          src: './src/**/*.js'
        }]
      },
      options: {
        instrumenter: isparta.Instrumenter
      }
    },
    karma: {
      test: {
        options: {
          configFile: 'karma-ng.conf.js',
          // need to put client config here because grunt-mocha clobbers config
          // in karma.conf.js
          client: {
            mocha: {
              retries: 1
            }
          }
        }
      }
    },
    makeReport2: {
      test: {
        files: [{
          cwd: '.',
          expand: true,
          src: './reports-ng/coverage/<%= package %>/mocha-final.json'
        }, {
          cwd: '.',
          expand: true,
          src: './reports-ng/coverage/<%= package %>*/coverage-final.json'
        }],
        options: {
          reporters: {
            'text-summary': {}
          }
        }
      }
    },
    mochaTest: {
      options: {
        reporter: process.env.XUNIT ? path.join(__dirname, './packages/xunit-with-logs') : 'spec',
        // TODO figure out how to detect retried tests
        retries: 1,
        timeout: 30000
      },
      automation: {
        options: {
          require: makeMochaRequires(['babel-register']),
          reporterOptions: {
            output: './reports-ng/test/mocha-<%= package %>-automation.xml'
          }
        },
        src: [
          './packages/<%= package %>/test/automation/spec/**/*.js'
        ]
      },
      integration: {
        options: {
          require: makeMochaRequires(['babel-register']),
          reporterOptions: {
            output: './reports-ng/test/mocha-<%= package %>.xml'
          }
        },
        src: (function() {
          var src = [
            './packages/<%= package %>/test/*/spec/**/*.js',
            '!./packages/<%= package %>/test/automation/spec/**/*.js',
            '!./packages/<%= package %>/test/documentation/spec/**/*.js'
          ];
          if (process.env.PIPELINE) {
            src.push('!./packages/<%= package %>/test/unit/spec/**/*.js');
          }
          return src;
        }())
      },
      doc: {
        options: {
          require: makeMochaRequires(),
          reporterOptions: {
            output: './reports-ng/test/mocha-<%= package %>-doc.xml'
          }
        },
        src: [
          './packages/<%= package %>/test/documentation/spec/**/*.js',
          '!./packages/<%= package %>/test/documentation/spec/**/*.es6.js'
        ]
      },
      'doc-es6': {
        options: {
          require: makeMochaRequires(['babel-register']),
          reporterOptions: {
            output: './reports-ng/test/mocha-<%= package %>-doc-es6.xml'
          }
        },
        src: [
          './packages/<%= package %>/test/documentation/spec/**/*.es6.js'
        ]
      }
    },
    package: process.env.PACKAGE,
    shell: {
      'move-babelrc': {
        command: 'mv .babelrc babelrc'
      },
      'restore-bablrc': {
        command: 'mv babelrc .babelrc'
      }
    },
    storeCoverage2: {
      test: {
        options: {
          dest: './reports-ng/coverage/<%= package %>/mocha-final.json'
        }
      }
    }
  });

  grunt.task.run([
    'env:default',
    'env:secrets'
  ]);

  registerTask('build', [
    'clean:dist',
    'babel',
    'documentation:md'
  ]);

  registerTask('doc', [
    'documentation:md'
  ]);

  registerTask('test:automation', [
    'continue:on',
    !!process.env.SC_TUNNEL_IDENTIFIER || 'selenium_start',
    'mochaTest:automation',
    !!process.env.SC_TUNNEL_IDENTIFIER || 'selenium_stop',
    'continue:off',
    'continue:fail-on-warning'
  ]);

  registerTask('test:browser', [
    'karma'
  ]);

  registerTask('test:node', [
    p(process.env.COVERAGE) && 'instrument2',
    'mochaTest:integration',
    p(process.env.COVERAGE) && 'storeCoverage2'
  ]);

  registerTask('test', [
    'env',
    'clean:coverage',
    'express',
    'concurrent:test',
    p(process.env.COVERAGE) && 'copy:coverage',
    p(process.env.COVERAGE) && 'makeReport2'
  ]);

  function filterNulls(tasks) {
    return tasks.filter(function(key) { return typeof key === 'string';});
  }

  function registerTask(name, tasks) {
    grunt.registerTask(name, filterNulls(tasks));
  }

  registerTask('test:doc', [
    'env',
    // Note: doc must run before doc-es6 because doc-es6 pulls in babel-register
    'mochaTest:doc',
    'mochaTest:doc-es6'
  ]);

  registerTask('default', []);

  try {
    require('./packages/' + process.env.PACKAGE +  '/Gruntfile.js')(grunt, p, makeMochaRequires);
  }
  catch(error) {
    // ignore
  }

  /**
   * Helper function which converts environment strings into
   * undefined/true/false
   * @param {string} env
   * @returns {boolean|undefined}
   * @private
   */
  function p(env) {
    if (typeof env === 'undefined' || env === 'undefined' || env === '') {
      return undefined;
    }
    if (env.toLowerCase() === 'true') {
      return true;
    }
    if (env.toLowerCase() === 'false') {
      return false;
    }
    throw new Error('p(): `env`"' + env + '" is not a recognized string');
  }

  function makeMochaRequires(requires) {
    requires = requires || [];
    // Don't include trace and clarify in environments that can't use them
    if (parseInt(process.versions.node.split('.')[0]) < 4) {
      return requires.concat([
        function() {
          Error.stackTraceLimit = Infinity;
        }
      ]);
    }

    if (parseInt(process.versions.node.split('.')[0]) < 5) {
      return requires.concat([
        'clarify',
        function() {
          Error.stackTraceLimit = Infinity;
        }
      ]);
    }

    return requires.concat([
      'trace',
      'clarify',
      function() {
        Error.stackTraceLimit = Infinity;
      }
    ]);
  }
};
