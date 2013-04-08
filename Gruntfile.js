module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> - <%= pkg.description %> Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %> */\n'
      },
      min: {
        files: {
          'build/js/ui-tree.min.js': ['src/js/ui-tree.js'],
          'build/js/ui-tabs.min.js': ['src/js/ui-tabs.js'],
          'build/js/ui-util.min.js': ['src/js/ui-util.js'],
          //'build/js/ui-dialog.min.js': ['src/js/ui-dialog.js'],
          'build/js/ui-dropdown.min.js': ['src/js/ui-dropdown.js'],
          'build/js/ui-autocomplete.min.js': ['src/js/ui-autocomplete.js']
        }
      },
      build: {
        options: {
          mangle: false,
          compress: false
        },
        files: {
          'build/js/ui-tree.js': ['src/js/ui-tree.js'],
          'build/js/ui-tabs.js': ['src/js/ui-tabs.js'],
          'build/js/ui-util.js': ['src/js/ui-util.js'],
          //'build/js/ui-dialog.js': ['src/js/ui-dialog.js'],
          'build/js/ui-dropdown.js': ['src/js/ui-dropdown.js'],
          'build/js/ui-autocomplete.js': ['src/js/ui-autocomplete.js']
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-uglify');

  // Default task(s).
  grunt.registerTask('default', ['uglify:min', 'uglify:build']);

};