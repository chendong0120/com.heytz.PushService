#!/usr/bin/env node

module.exports = function (context) {
  var path = context.requireCordovaModule('path'),
    fs = context.requireCordovaModule('fs'),
    shell = context.requireCordovaModule('shelljs'),
    projectRoot = context.opts.projectRoot,
    // ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser,
    ConfigParser = context.requireCordovaModule('cordova-lib/src/configparser/ConfigParser'),
    config = new ConfigParser(path.join(context.opts.projectRoot, "config.xml")),
    packageName = config.android_packageName() || config.packageName();

  console.info("Running android-install.Hook: " + context.hook + ", Package: " + packageName + ", Path: " + projectRoot + ".");

  if (!packageName) {
    console.error("Package name could not be found!");
    return;
  }

  // android platform available?
  if (context.opts.cordova.platforms.indexOf("android") === -1) {
    console.info("Android platform has not been added.");
    return;
  }

  var targetDir = path.join(projectRoot, "platforms", "android", "src", "com", "heytz", "pushService"),
  targetFile = path.join(targetDir, "Service.java");

  // var targetFiles = ["Service.java"];

  console.log(targetDir);

  if (['after_plugin_add', 'after_plugin_install', 'after_platform_add'].indexOf(context.hook) === -1) {
    // try {
    //   if(context.opts.plugins && context.opts.plugins.indexOf(context.opts.plugin.id) !== -1){
    //     targetFiles.forEach(function(file){
    //       var targetFile = path.join(targetDir, file);
    //       fs.unlinkSync(targetFile);
    //     });
    //   }
    // } catch (err) {}
    try {
      fs.unlinkSync(targetFile);
    } catch (err) {}
  } else {
    // create directory
    shell.mkdir('-p', targetDir);

    // sync the content
    fs.readFile(path.join(context.opts.plugin.dir, 'src', 'android', 'Service.java'), { encoding: 'utf-8' }, function (err, data) {
      if (err) {
        throw err;
      }
      data = data.replace(/_____PACKAGE_NAME_____/ig, packageName);
      // data = data.replace(/^import __ANDROID_PACKAGE__.R;/m, 'import ' + packageName + '.R;');
      // data = data.replace(/^import _____PACKAGE_NAME_____.MainActivity;/m, 'import ' + packageName + '.MainActivity;');
      // data = data.replace(/^import _____PACKAGE_NAME_____.R;/m, 'import ' + packageName + '.R;');
      fs.writeFileSync(targetFile, data);
    });


    // targetFiles.forEach(function(file){
    //   var targetFile = path.join(targetDir, file);
    //   fs.readFile(targetFile, {encoding: 'utf-8'}, function (err, data) {
    //     if (err) {
    //       throw err;
    //     }
    //     // data = data.replace(/^import __ANDROID_PACKAGE__.R;/m, 'import ' + packageName + '.R;');
    //     data = data.replace(/^_____PACKAGE_NAME_____/ig, packageName);
    //     fs.writeFileSync(targetFile, data);
    //   });
    // });
  }
};