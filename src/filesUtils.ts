import * as vscode from 'vscode';
import * as fs from 'fs';
import * as readline from 'readline';

export default {
  findVariablesFiles: function (config: vscode.WorkspaceConfiguration) {
    let globPatternsVariables = getGlobPatternVariables(config);
    const files = vscode.workspace.findFiles(globPatternsVariables.globPatternSource);
    return files;
  },

  createVariablesWatcher: function (config: vscode.WorkspaceConfiguration) {
    let globPatternsVariables = getGlobPatternVariables(config);
    return vscode.workspace.createFileSystemWatcher(globPatternsVariables.globPatternSource);
  },

  minimizePathFromWorkspace: function (path: string) {
    const uri = vscode.Uri.parse(path);
    let filePath = uri.fsPath;
    let rootPath = vscode.workspace.getWorkspaceFolder(uri);
    if (rootPath !== undefined) {
      filePath = filePath.split(rootPath.uri.fsPath)[1];
    }
    if (filePath.startsWith('\\')) {
      filePath = filePath.substring(1);
    }
    filePath = filePath.replace(/\\/g, '/');
    return filePath;
  },

  findInFile: function (uri: vscode.Uri, key: string): Promise<vscode.Range> {
    let readInterface = readline.createInterface({
      input: fs.createReadStream(uri.fsPath),
      output: process.stdout,
      terminal: false,
    });
    let count = 0;
    let i;
    return new Promise((resolve, reject) => {
      readInterface.on('line', (line) => {
        if ((i = line.indexOf(key)) >= 0) {
          let start = new vscode.Position(count, i);
          resolve(new vscode.Range(start, start.translate(0, key.length)));
        }
        count++;
      });
      readInterface.on('close', reject);
    });
  },
};

function getGlobPatternVariables(config: vscode.WorkspaceConfiguration) {
  const sourceFolders = config.get<Array<string>>('variables.sourceFolders');
  const ignoredFolders = config.get<Array<string>>('variables.ignoredFolders');

  let globPatternSource = `**/*.${globPatternExtensions}`;
  if (sourceFolders !== undefined && sourceFolders.length > 0) {
    globPatternSource = `{${sourceFolders.join(',')}}/**/*.${globPatternExtensions}`;
  }
  let globPatternIgnore = null;
  if (ignoredFolders !== undefined && ignoredFolders.length > 0) {
    globPatternIgnore = `{${ignoredFolders.join(',')}}/**`;
  }
  return {
    globPatternSource: globPatternSource,
    globPatternIgnore: globPatternIgnore,
  };
}

const globPatternExtensions = '{yml,yaml}';
