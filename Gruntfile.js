module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    banner: '/*!\n * <%= pkg.name %> v<%= pkg.version %>\n * <%= pkg.description %>\n * Copyright (c) <%= grunt.template.today("yyyy") %> <%= pkg.author %>\n * <%= pkg.repository.url %>\n * License: <%= pkg.license %>\n**/',

    jshint: {
      options: {
        evil: true,
        regexdash: true,
        browser: true,
        wsh: true,
        trailing: true,
        sub: true,
        white : false
      },
      all: ['src/js/*.js']
    },

    clean: ["build/"],

    sass: {
      dist: {
        files: [
          {
            expand: true,               // Enable dynamic expansion.
            cwd: 'src/css/',            // Src matches are relative to this path.
            src: ['**/*.scss'],         // Actual pattern(s) to match.
            dest: 'build/css/',         // Destination path prefix.
            ext: '.css'                 // Dest filepaths will have this extension.
          }
        ]
      }
    },

    concat: {
      options: {
        banner: '<%= banner %>\n',
        stripBanners: true
      },
      js: {
        files: [
          {
            expand: true,           // Enable dynamic expansion.
            cwd: 'src/js/',         // Src matches are relative to this path.
            src: ['**/*.js'],       // Actual pattern(s) to match.
            dest: 'build/js/',      // Destination path prefix.
            ext: '.js'              // Dest filepaths will have this extension.
          }
        ]
      }
    },

    uglify: {
      min: {
        options: {
          banner: '<%= banner %>\n'
        },
        files: [
          {
            expand: true,               // Enable dynamic expansion.
            cwd: 'src/js/',             // Src matches are relative to this path.
            src: ['**/*.js'],           // Actual pattern(s) to match.
            dest: 'build/js/',  // Destination path prefix.
            ext: '.min.js'              // Dest filepaths will have this extension.
          }
        ]
      }
    },

    cssmin: {
      options: {
        banner: '<%= banner %>'
      },
      minify: {
        expand: true,
        cwd: 'build/css/',
        src: ['*.css', '!*.min.css'],
        dest: 'build/css/',
        ext: '.min.css'
      }
    }

  });

  // Load the plugin that provides the "uglify" task.
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  // Default task(s).
  grunt.registerTask('default', [
    'jshint:all',
    'clean',
    'sass:dist',
    'concat:js',
    'uglify:min',
    'cssmin'
  ]);

};