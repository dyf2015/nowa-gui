const { spawn, exec, execFile, fork } = require('child_process');
const { join, delimiter } = require('path');
const npmRunPath = require('npm-run-path');
const fs = require('fs-extra');
const uuid = require('uuid');
const fixPath = require('fix-path');
const ansiHTML = require('ansi-html');
const { tmpdir } = require('os');

const { constants, isWin } = require('../is');
const { getWin } = require('../windowManager');
const task = require('../task');

const { APP_PATH, NPM_PATH, BIN_PATH, NODE_PATH } = constants; 

fixPath();

const npmEnv = npmRunPath.env();
const pathEnv = [process.env.Path, npmEnv.PATH, BIN_PATH, NODE_PATH]
  .filter(p => !!p)
  .join(delimiter);
const env = Object.assign(npmEnv, {
  FORCE_COLOR: 1,
});

if (isWin) {
  env.Path = pathEnv;
} else {
  env.PATH = pathEnv;
}

const newLog = (oldLog, str) => oldLog + ansiHTML(str.replace(/\n/g, '<br>'));

// fs.writeJsonSync(join(APP_PATH, 'env.text'), { prv: process.env, env, npmEnv});
module.exports = {

  installModules(options) {
    const win = getWin();
    const targetPath = join(APP_PATH, 'task', 'install.js');
    const term = fork(targetPath, {
      cwd: APP_PATH,
      silent: true,
      // execArgv: ['--harmony'],
      env: Object.assign(npmEnv, { params: JSON.stringify(options), FORCE_COLOR: 1, }),
    });

    let percent = 0;
    let log = ''; 

    term.stdout.on('data', (data) => {

      const str = data.toString();
      console.log(str);
      if (str.indexOf('INSTALL_PROGRESS') !== -1) {
        const a = str.split('INSTALL_PROGRESS');
        const b = a[1].replace(/[\n\s]/g, '');
        const c = b.slice(1, b.length - 1).split(',').map(i => i.split(':'));
        percent = (c[1][1] / c[0][1] * 100).toFixed(0);
        console.log(percent);
      } else {
        log = newLog(log, str);
      }
      win.webContents.send('install-modules', {
        project: options.root,
        percent,
        finished: false,
        err: false,
        log
      });

    });

    term.stderr.on('data', (data) => {
      log = newLog(log, data.toString());
      console.log('err', data.toString());
      win.webContents.send('install-modules', {
        project: options.root,
        percent,
        finished: false,
        err: false,
        log
      });
    });

    term.on('exit', (code) => {
      console.log('exit install code', code);
      win.webContents.send('install-modules', {
        project: options.root,
        percent,
        finished: true,
        err: code !== 0,
        log
      });
    });

    /*const targetPath = join(APP_PATH, 'task', 'install.js');
    const term = fork(targetPath, {
      cwd: APP_PATH,
      silent: true,
      // execArgv: ['--harmony'],
      env: Object.assign(npmEnv, { params: JSON.stringify(options), FORCE_COLOR: 1, }),
    });
    return term;*/
  },

  importModulesInstall(options) {
    const win = getWin();
    const targetPath = join(APP_PATH, 'task', 'install.js');
    const term = fork(targetPath, {
      cwd: APP_PATH,
      silent: true,
      env: Object.assign(npmEnv, { params: JSON.stringify(options), FORCE_COLOR: 1, }),
    });

    term.on('exit', (code) => {
      console.log('exit importModulesInstall code', code);
      win.webContents.send('import-install-finished', {
        filePath: options.root,
        success: code === 0
      });
    });
  },

  openEditor(projectPath, editor, basePath) {
    let editorPath = '';

    if (editor === 'Sublime') {
      editorPath = join(basePath, isWin ? 'subl.exe' : '/Contents/SharedSupport/bin/subl');
    }

    if (editor === 'VScode') {
      editorPath = join(basePath, isWin ? 'bin/code.cmd' : '/Contents/Resources/app/bin/code');
    }

    return spawn(editorPath,
      ['./'], {
        cwd: projectPath,
      });
  },

  exec({ name, type }) {
    const win = getWin();
    const uid = uuid.v4();
    console.log('exec', type, name);
    const term = fork(NPM_PATH, ['run', type, '--scripts-prepend-node-path=auto'], {
      silent: true,
      cwd: name,
      env: Object.assign(env, { NOWA_UID: uid }),
      detached: true
    });
    task.setTask(type, name, {
      term,
      uid
    });

    term.stdout.on('data', (data) => {
      const log = task.writeLog(type, name, data.toString());
      win.webContents.send('task-ouput', {
        name,
        log,
        type,
      });
    });

    term.stderr.on('data', (data) => {
      const log = task.writeLog(type, name, data.toString());
      win.webContents.send('task-ouput', {
        name,
        log,
        type,
      });
    });

    term.on('exit', (code) => {
      // global.cmd[type][name].term = null;
      task.clearTerm(type, name);
      console.log('exit', code);
      if (!code && typeof code !== 'undefined' && code !== 0) {
        win.webContents.send('task-stopped', {
          name,
          type,
        });
      } else {
        win.webContents.send('task-finished', {
          name,
          type,
          success: code === 0
        });
      }
    });

  },

  stop({ name, type }) {
    const t = task.getTask(type, name);
    if (t.term) {
      t.term.kill();
      if (type === 'start') {
        const uidPath = join(tmpdir(), `.nowa-server-${t.uid}.json`);
        fs.removeSync(uidPath);
      }
    }
  },

  clearLog({ name, type }) {
    task.clearLog(type, name);
  },
  
};

