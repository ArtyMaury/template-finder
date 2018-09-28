import * as vscode from "vscode";
import Parser from "./template_parser";
import Decorator from "./template_decorator";
import FilesUtils from "./filesUtils";

export function activate(context: vscode.ExtensionContext) {
  var variables: any = {};

  var workspaceConfig = vscode.workspace.getConfiguration("templateFinder");
  vscode.workspace.onDidChangeConfiguration(() => {
    workspaceConfig = vscode.workspace.getConfiguration("templateFinder");
    if (workspaceConfig.get<Array<boolean>>("extension.activated")) {
      updateAllVariables();
    }
  });

  const variablesWatcher = FilesUtils.createVariablesWatcher(workspaceConfig);

  //#region editor triggers
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdateTemplates();
  }
  vscode.window.onDidChangeActiveTextEditor(
    editor => {
      activeEditor = editor;
      if (editor) {
        triggerUpdateTemplates();
      }
    },
    null,
    context.subscriptions
  );
  vscode.workspace.onDidChangeTextDocument(
    event => {
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateTemplates();
      }
    },
    null,
    context.subscriptions
  );
  //#endregion

  //#region activation command

  let disposableActivationCommand = vscode.commands.registerCommand(
    "extension.activate",
    () => {
      vscode.window.showInformationMessage(
        "Template finder was activated here"
      );
      workspaceConfig.update("extension.activated", true);
    }
  );

  let disposableDeactivationCommand = vscode.commands.registerCommand(
    "extension.deactivate",
    () => {
      vscode.window.showInformationMessage(
        "Template finder was deactivated here"
      );
      workspaceConfig.update("extension.activated", false);
    }
  );

  context.subscriptions.push(disposableActivationCommand);
  context.subscriptions.push(disposableDeactivationCommand);

  //#endregion

  var timeout: NodeJS.Timer;
  function triggerUpdateTemplates() {
    // The extension only scans for templates if this config is true
    if (timeout) {
      clearTimeout(timeout);
    }
    if (workspaceConfig.get<Array<boolean>>("extension.activated")) {
      timeout = setTimeout(findTemplates, 1000);

      updateAllVariables();
      findTemplates();

      variablesWatcher.onDidChange(uri =>
        updateVariables(uri, variables, true)
      );
      variablesWatcher.onDidCreate(uri =>
        updateVariables(uri, variables, true)
      );
      variablesWatcher.onDidDelete(uri => deleteVariables(uri, variables));
    } else {
      variablesWatcher.dispose();
      variables = {};
      if (activeEditor) {
        Decorator.clearAllDecorations(activeEditor);
      }
    }
  }

  function findTemplates() {
    if (!activeEditor) {
      return;
    }
    let templates = Parser.parseTextForTemplates(
      activeEditor.document.getText(),
      variables
    );
    if(!Decorator.initiated) {
      Decorator.init();
    }
    Decorator.decorate(templates, activeEditor);
  }

  function updateAllVariables() {
    FilesUtils.findVariablesFiles(workspaceConfig).then(uris => {
      variables = {};
      uris.forEach(uri => updateVariables(uri, variables));
    });
    findTemplates();
  }

  function updateVariables(uri: vscode.Uri, variables: any, checkFile = false) {
    if (checkFile) {
      FilesUtils.findVariablesFiles(workspaceConfig).then(uris => {
        if (uris.some(uriFound => uri.path === uriFound.path)) {
          variables[
            FilesUtils.minimizePathFromWorkspace(uri)
          ] = Parser.parseFileForVariables(uri);
        } else {
          variables[FilesUtils.minimizePathFromWorkspace(uri)] = {};
        }
      });
    } else {
      variables[
        FilesUtils.minimizePathFromWorkspace(uri)
      ] = Parser.parseFileForVariables(uri);
    }
    return variables;
  }

  function deleteVariables(uri: vscode.Uri, variables: any) {
    variables[FilesUtils.minimizePathFromWorkspace(uri)] = {};
    return variables;
  }
}
