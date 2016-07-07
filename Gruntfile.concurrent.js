/**!
 *
 * Copyright (c) 2015-2016 Cisco Systems, Inc. See LICENSE file.
 */

'use strict';

module.exports = function gruntConfig(grunt) {
  require('load-grunt-tasks')(grunt);
  require('time-grunt')(grunt);
  grunt.loadTasks('tasks');

  var PACKAGES = grunt.file.expand({
    cwd: 'packages'
  }, [
      'generator-ciscospark',
      'common',
      'helper-html',
      'http-core',
      'spark-core',
      'plugin-wdm',
      'plugin-mercury',
      'plugin-locus',
      'ciscospark',
      'plugin-phone',
      'phone',
      'example-phone',
      '*',
      '!example*',
      '!test-helper*',
      '!bin*',
      '!xunit-with-logs'
  ]);

  var config = {
    concurrent: {
      build: {
        tasks: [],
        options: {
          logConcurrentOutput: true
        }
      },
      test: {
        tasks: [],
        options: {
          // Run sequentially for now - port management is hard
          limit: 1,
          logConcurrentOutput: true
        }
      }
    },
    clean: {
      reports: {
        src: [
          './reports-ng'
        ]
      }
    },
    documentation: {
      options: {
        private: false
      },
      html: {
        src: [
          './packages/ciscospark/src/index.js',
          './packages/plugin-phone/src/index.js'
        ],
        options: {
          destination: './docs/api/',
          format: 'html',
          github: true,
          theme: './docs/_theme'
        }
      }
    },
    env: {
      default: {
        src: '.env.default.json'
      },
      secrets: {
        src: '.env'
      }
    },
    // Note: eslint for builds is in Gruntfile.package.js; this is just for
    // local testing
    eslint: {
      all: [
        './packages/*/src/**/*.js',
        './packages/*/test/**/*.js',
        '!./packages/*/test/**/*.es6.js',
        './packages/*/*.js'
      ]
    },
    'gh-pages': {
      options: {
        base: 'docs'
      },
      docs: {
        src: ['**']
      }
    },
    makeReport2: {
      all: {
        files: [{
          cwd: './reports-ng/coverage-final/',
          expand: true,
          src: '**/*.json'
        }],
        options: {
          reporters: {
            cobertura: {
              file: './reports-ng/cobertura-coverage.xml'
            },
            json: {
              file: './reports-ng/coverage.json'
            },
            html: {},
            'text-summary': {}
          }
        }
      }
    },
    shell: {}
  };

  if (process.env.COVERAGE && (process.env.JENKINS || process.env.CI)) {
    delete config.makeReport2.all.options.reporters.html;
  }

  PACKAGES.forEach(function(packageName) {
    var shellBuildKey = 'build_' + packageName;
    var buildKey = 'build:' + packageName;
    var shellTestKey = 'test_' + packageName;
    var testKey = 'test:' + packageName;

    config.shell[shellBuildKey] = {
      command: 'PACKAGE=' + packageName + ' grunt --gruntfile Gruntfile.package.js --no-color build'
    };
    grunt.registerTask(buildKey, 'shell:' + shellBuildKey);
    config.concurrent.build.tasks.push(buildKey);

    config.shell[shellTestKey] = {
      command: 'PACKAGE=' + packageName + ' grunt --gruntfile Gruntfile.package.js --no-color test'
    };
    grunt.registerTask(testKey, 'shell:' + shellTestKey);
    config.concurrent.test.tasks.push(testKey);
  });

  grunt.registerTask('test', [
    'clean:reports',
    'eslint',
    'concurrent:test',
    p(process.env.COVERAGE) && 'makeReport2'
  ].filter(function(key) {
    return typeof key === 'string';
  }));

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

  grunt.registerTask('build', [
    'concurrent:build'
  ]);

  grunt.registerTask('publish-docs', [
    'documentation',
    'gh-pages:docs'
  ]);

  grunt.initConfig(config);
  grunt.task.run([
    'env:default',
    'env:secrets'
  ]);

  grunt.registerTask('default', []);
};
