var gulp = require('gulp')
var concat = require('gulp-concat')
var sourcemaps = require('gulp-sourcemaps')
var uglify = require('gulp-uglify')
var ngAnnotate = require('gulp-ng-annotate')
var jshint = require('gulp-jshint');

// Build the minified javascript file "app.js"
// using the command "gulp js".

gulp.task('js', function () {
    // Place the module setter for Angular before any other code.
    gulp.src(['source/js/cove-module.js', 'source/js/**/*.js'])
    // The source map is needed for debugging with browser tools
    // since the minified source code is being used.
    .pipe(sourcemaps.init())
        // Create a single file from all js sources.
        .pipe(concat('app.js'))
        // Angular support for re-writing dependency injection expressions
        // that won't have meaning changed by uglify process.
        .pipe(ngAnnotate())
        // Make the code compact.
        .pipe(uglify())
    .pipe(sourcemaps.write())
    // Save the file to this directory.
    .pipe(gulp.dest('public/js'))
})

gulp.task('lint', function() {
    return gulp.src('source/js/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});
