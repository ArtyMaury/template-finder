import * as vscode from 'vscode';

export default {
  findVariablesFiles: function(config: vscode.WorkspaceConfiguration) {
    let globPatternsVariables = getGlobPatternVariables(config);
    const files = vscode.workspace.findFiles(
      globPatternsVariables.globPatternSource
    );
    return files;
  },

  createVariablesWatcher: function(config: vscode.WorkspaceConfiguration) {
    let globPatternsVariables = getGlobPatternVariables(config);
    return vscode.workspace.createFileSystemWatcher(
      globPatternsVariables.globPatternSource
    );
  },

  minimizePathFromWorkspace: function(uri: vscode.Uri) {
    let filePath = uri.fsPath;
    let rootPath = vscode.workspace.rootPath;
    if (rootPath !== undefined) {
      let i;
      for (i = 0; i < filePath.length; i++) {
        if (filePath[i] !== rootPath[i]) {
          filePath = filePath.substring(i);
          break;
        }
      }
    }
    if (filePath.startsWith('\\')) {
      filePath = filePath.substring(1);
    }
    return filePath;
  }
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
    globPatternIgnore: globPatternIgnore
  };
}

const globPatternExtensions = '{yml}';
