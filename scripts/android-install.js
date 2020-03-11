#!/usr/bin/env node

module.exports = function (context) {
  var path = require('path'),
    fs = require('fs'),
    projectRoot = context.opts.projectRoot,
    plugins = context.opts.plugins || [];


  // The plugins array will be empty during platform add
  if (plugins.length > 0 && plugins.indexOf('cordova-plugin-pushService') === -1) {
    return;
  }
  var ConfigParser = null;
  try {
    ConfigParser = context.requireCordovaModule('cordova-common').ConfigParser;
  } catch (e) {
    // fallback
    ConfigParser = context.requireCordovaModule('cordova-lib/src/configparser/ConfigParser');
  }

  var config = new ConfigParser(path.join(context.opts.projectRoot, "config.xml")),
    packageName = config.android_packageName() || config.packageName();

  // replace dash (-) with underscore (_)
  packageName = packageName.replace(/-/g, "_");

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
  var srcDir = path.join(projectRoot, "platforms", "android", "src");
  if (!fs.existsSync(targetDir)) {
    srcDir = path.join(projectRoot, "platforms", "android", "app", "src", "main", "java");
  }
  var activityFilePath = srcDir + '/' + packageName.replace(/\./ig, '/');
  var targetDir = path.join(projectRoot, "platforms", "android", "src", "heytz", "pushService");
  if (!fs.existsSync(targetDir)) {
    targetDir = path.join(projectRoot, "platforms", "android", "app", "src", "main", "java", "com", "heytz", "pushService");
  }
  console.log('activityFilePath:', activityFilePath);
  var targetFiles = ["Service.java"];
  console.log("cordova-plugin-pushService targetDir:", targetDir, "packageName:", packageName, targetFiles);
  if (['after_plugin_add', 'after_plugin_install'].indexOf(context.hook) === -1) {
    // remove it?
    targetFiles.forEach(function (f) {
      try {
        fs.unlinkSync(path.join(targetDir, f));
      } catch (err) { }
    });
  } else {
    // 递归创建目录 同步方法
    function mkdirsSync(dirname) {
      if (fs.existsSync(dirname)) {
        return true;
      } else {
        if (mkdirsSync(path.dirname(dirname))) {
          fs.mkdirSync(dirname);
          return true;
        }
      }
    }
    mkdirsSync(targetDir);
    // sync the content
    targetFiles.forEach(function (f) {
      var fileFullPath = path.join(context.opts.plugin.dir, 'src', 'android', f)
      var replaceFileFullPath = path.join(targetDir, f)
      console.log('fileFullPath', fileFullPath);
      console.log('replaceFileFullPath', replaceFileFullPath);
      fs.readFile(fileFullPath, { encoding: 'utf-8' }, function (err, data) {
        if (err) {
          throw err;
        }
        data = data.replace(/_____PACKAGE_NAME_____/ig, packageName);
        // fs.writeFileSync(fileFullPath, data);
        if (fs.existsSync(replaceFileFullPath)) {
          console.log('文件存在,并且更新：', replaceFileFullPath)
          fs.writeFileSync(replaceFileFullPath, data);
        } else {
          console.log('文件不存在：', replaceFileFullPath)
        }
      });
    });
    overrideFile(activityFilePath);
  }
};

function overrideFile(activityFilePath) {
  var overriderF = activityFilePath + '/MainActivity.java';
  console.log('overrideFile', activityFilePath)
  var imports = [`import android.app.NotificationManager;`,
    `import android.content.Intent;`],
    onCreateContent = `      String action = this.getIntent().getAction();
      if (action != null && action.indexOf("NOTI#") != -1) {
          NotificationManager mNotifMan = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
          String[] actionArr = action.split("#");
          mNotifMan.cancel(Integer.parseInt(actionArr[2]));
          launchUrl = launchUrl + actionArr[1];
      }
      `,
    onNewIntentContent = `    @Override
  public void onNewIntent(Intent intent) {
      String action = intent.getAction();
      if (action != null && action.indexOf("NOTI#") != -1) {
          NotificationManager mNotifMan = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
          String[] actionArr = action.split("#");
          mNotifMan.cancel(Integer.parseInt(actionArr[2]));
          String rootUrl = launchUrl.substring(0, launchUrl.indexOf("/", 8) + 1);
          rootUrl = rootUrl + actionArr[1];
          final String page=actionArr[1];
          loadUrl("javascript:" + "Router.go('" + page + "')");
      }
      super.onNewIntent(intent);
  }`
  var fs = require('fs');
  fs.readFile(overriderF, { encoding: 'utf-8' }, function (err, data) {
    if (err) {
      return err;
    }
    var loadUrlDis = `loadUrl(launchUrl);`;
    var importDis = `import `;
    var mainActivityClassDis = `public class MainActivity extends CordovaActivity
{`;
    var loadUrlDisIndex = data.indexOf(loadUrlDis);
    data = data.slice(0, loadUrlDisIndex)
      + onCreateContent
      + data.slice(loadUrlDisIndex);

    imports.forEach(function (importContent) {
      var importDisIndex = data.indexOf(importDis);
      if (data.indexOf(importContent) === -1) {
        data = data.slice(0, importDisIndex)
          + importContent + '\n'
          + data.slice(importDisIndex);
      }
    })
    var mainActivityClassDisIndex = data.indexOf(mainActivityClassDis)
    data = data.slice(0, mainActivityClassDisIndex + mainActivityClassDis.length)
      + onNewIntentContent + '\n'
      + data.slice(mainActivityClassDisIndex + mainActivityClassDis.length);
    fs.writeFileSync(overriderF, data);
  })

}