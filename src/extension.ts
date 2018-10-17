import * as vscode from "vscode";
import Parser, {Template} from "./template_parser";
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


  vscode.commands.getCommands().then(commands => {
    if (commands.find(command => command === "extension.activate") === undefined) {
      let disposableActivationCommand = vscode.commands.registerCommand(
        "extension.activate",
        () => {
          vscode.window.showInformationMessage(
            "Template finder was activated here"
          );
          workspaceConfig.update("extension.activated", true);
        }
      );
      context.subscriptions.push(disposableActivationCommand);
    }
    if (commands.find(command => command === "extension.deactivate") === undefined) {
      let disposableDeactivationCommand = vscode.commands.registerCommand(
        "extension.deactivate",
        () => {
          vscode.window.showInformationMessage(
            "Template finder was deactivated here"
          );
          workspaceConfig.update("extension.activated", false);
        }
      );
      context.subscriptions.push(disposableDeactivationCommand);
    }

  })

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
      if (activeEditor && Decorator.initiated) {
        Decorator.clearAllDecorations(activeEditor);
      }
    }
  }

  function findTemplates() {
    if (!activeEditor) {
      return;
    }
    let templates: Template[];
    let currentDocumentObject: any;
    if (activeEditor.document.languageId === "yaml") {
      Parser.parseFileForVariables(activeEditor.document.uri).then(currentDocumentObject => {
        templates = Parser.parseTextForTemplates(
          //@ts-ignore: Null value not possible
          activeEditor.document.getText(),
          variables, currentDocumentObject
        );
        if (!Decorator.initiated) {
          Decorator.init();
        }
          //@ts-ignore: Null value not possible
        Decorator.decorate(templates, activeEditor, workspaceConfig);
      })
    } else {
      templates = Parser.parseTextForTemplates(
        activeEditor.document.getText(),
        variables, currentDocumentObject
      );
      if (!Decorator.initiated) {
        Decorator.init();
      }
      Decorator.decorate(templates, activeEditor, workspaceConfig);
    }
    
  }

  function updateAllVariables() {
    console.log("updating all variables")
    FilesUtils.findVariablesFiles(workspaceConfig).then(uris => {
      variables = {};
      return Promise.all(uris.map(uri => updateVariables(uri, variables)));
    }).then(() => findTemplates());
  }

  function updateVariables(uri: vscode.Uri, variables: any, checkFile = false) {
    if (checkFile) {
      FilesUtils.findVariablesFiles(workspaceConfig).then(uris => {
        if (uris.some(uriFound => uri.path === uriFound.path)) {
          return Parser.parseFileForVariables(uri).then(parsedVariables => {
            variables[FilesUtils.minimizePathFromWorkspace(uri)] = parsedVariables;
          });
        } else {
          return Promise.resolve(delete variables[FilesUtils.minimizePathFromWorkspace(uri)]);
        }
      });
    } else {
      return Parser.parseFileForVariables(uri).then(parsedVariables => {
        variables[FilesUtils.minimizePathFromWorkspace(uri)] = parsedVariables;
      });
    }
  }

  function deleteVariables(uri: vscode.Uri, variables: any) {
    variables[FilesUtils.minimizePathFromWorkspace(uri)] = {};
    return variables;
  }
}
