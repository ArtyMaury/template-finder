import * as vscode from 'vscode';
import Parser, { Template } from './template_parser';
import Decorator from './template_decorator';
import FilesUtils from './filesUtils';
import { isNullOrUndefined } from 'util';

export function activate(context: vscode.ExtensionContext) {
  var variables: any = {};
  var lastTemplateUpdateDate: number;

  var workspaceConfig = vscode.workspace.getConfiguration('templateFinder');
  vscode.workspace.onDidChangeConfiguration(() => {
    workspaceConfig = vscode.workspace.getConfiguration('templateFinder');
    if (workspaceConfig.get<Array<boolean>>('extension.activated')) {
      triggerUpdate();
    }
  });

  const variablesWatcher = FilesUtils.createVariablesWatcher(workspaceConfig);

  //#region editor triggers
  let activeEditor = vscode.window.activeTextEditor;
  if (activeEditor) {
    triggerUpdate();
  }
  vscode.window.onDidChangeActiveTextEditor(
    editor => {
      activeEditor = editor;
      if (editor) {
        updateTemplates(true);
      }
    },
    null,
    context.subscriptions
  );
  vscode.workspace.onDidChangeTextDocument(
    event => {
      if (activeEditor && event.document === activeEditor.document) {
        updateTemplates(true);
      }
    },
    null,
    context.subscriptions
  );
  //#endregion

  //#region activation command

  vscode.commands.getCommands().then(commands => {
    if (commands.find(command => command === 'extension.activate') === undefined) {
      let disposableActivationCommand = vscode.commands.registerCommand('extension.activate', () => {
        vscode.window.showInformationMessage('Template finder was activated here');
        workspaceConfig.update('extension.activated', true);
      });
      context.subscriptions.push(disposableActivationCommand);
    }
    if (commands.find(command => command === 'extension.deactivate') === undefined) {
      let disposableDeactivationCommand = vscode.commands.registerCommand('extension.deactivate', () => {
        vscode.window.showInformationMessage('Template finder was deactivated here');
        workspaceConfig.update('extension.activated', false);
      });
      context.subscriptions.push(disposableDeactivationCommand);
    }
  });

  //#endregion

  function triggerUpdate() {
    // The extension only scans for templates if this config is true
    if (workspaceConfig.get<Array<boolean>>('extension.activated')) {
      updateAll();

      variablesWatcher.onDidChange(uri => updateVariablesFromFile(uri, variables, true));
      variablesWatcher.onDidCreate(uri => updateVariablesFromFile(uri, variables, true));
      variablesWatcher.onDidDelete(uri => deleteVariables(uri, variables));
    } else {
      variablesWatcher.dispose();
      variables = {};
      if (activeEditor && Decorator.initiated) {
        Decorator.clearAllDecorations(activeEditor);
      }
    }
  }

  function updateTemplates(force = false) {
    const currentDate = Date.now();
    if (
      !workspaceConfig.get<Array<boolean>>('extension.activated') ||
      !activeEditor ||
      (!force && !isNaN(lastTemplateUpdateDate) && currentDate - lastTemplateUpdateDate < 500)
    ) {
      return;
    }
    lastTemplateUpdateDate = Date.now();
    let templates: Template[];
    let currentDocumentObject: any;
    if (activeEditor.document.languageId === 'yaml') {
      Parser.parseFileForVariables(activeEditor.document.uri.fsPath, true).then(currentDocumentObject => {
        if (currentDocumentObject) {
          templates = Parser.parseTextForTemplates(
            //@ts-ignore: Null value not possible
            activeEditor.document.getText(),
            variables,
            currentDocumentObject
          );
          if (!Decorator.initiated) {
            Decorator.init();
          }
          //@ts-ignore: Null value not possible
          Decorator.decorate(templates, activeEditor, workspaceConfig);
        }
      });
    } else {
      templates = Parser.parseTextForTemplates(activeEditor.document.getText(), variables, currentDocumentObject);
      if (!Decorator.initiated) {
        Decorator.init();
      }
      Decorator.decorate(templates, activeEditor, workspaceConfig);
    }
  }

  function updateAll() {
    FilesUtils.findVariablesFiles(workspaceConfig)
      .then(uris => {
        variables = {};
        return Promise.all(uris.map(uri => updateVariablesFromFile(uri, variables)));
      })
      .then(() => {
        updateTemplates();
      });
  }

  function updateVariablesFromFile(uri: vscode.Uri, variables: any, shouldCheckIfFileHasToBeUpdated = false) {
    if (shouldCheckIfFileHasToBeUpdated) {
      FilesUtils.findVariablesFiles(workspaceConfig).then(uris => {
        if (uris.some(uriFound => uri.path === uriFound.path)) {
          return addVariablesFromFile(uri, variables);
        } else {
          return Promise.resolve(deleteVariables(uri, variables));
        }
      });
    } else {
      return addVariablesFromFile(uri, variables);
    }
  }

  function addVariablesFromFile(uri: vscode.Uri, variables: any) {
    return Parser.parseFileForVariables(uri.fsPath).then(parsedVariables => {
      if (!isNullOrUndefined(parsedVariables)) {
        variables[FilesUtils.minimizePathFromWorkspace(uri)] = parsedVariables;
      }
    });
  }

  function deleteVariables(uri: vscode.Uri, variables: any) {
    delete variables[FilesUtils.minimizePathFromWorkspace(uri)];
    return variables;
  }
}
