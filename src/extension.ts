import * as vscode from 'vscode';
import Parser from './template_parser';
import Decorator from './template_decorator';
import FilesUtils from "./filesUtils";

export function activate(context: vscode.ExtensionContext) {

    var variables: any = {};

    var workspaceConfig = vscode.workspace.getConfiguration("templateFinder");
    vscode.workspace.onDidChangeConfiguration(() => {
        workspaceConfig = vscode.workspace.getConfiguration("templateFinder");
        updateAllVariables();
    });

    const variablesWatcher = FilesUtils.createVariablesWatcher(workspaceConfig);
    variablesWatcher.onDidChange(uri => updateVariables(uri, variables, true));
    variablesWatcher.onDidCreate(uri => updateVariables(uri, variables, true));
    variablesWatcher.onDidDelete(uri => deleteVariables(uri, variables));

    //#region Triggers à checker

    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        triggerUpdateTemplates();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateTemplates();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateTemplates();
        }
    }, null, context.subscriptions);
    //#endregion

    var timeout: NodeJS.Timer;
    function triggerUpdateTemplates() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(findTemplates, 1000);

        updateAllVariables();
        findTemplates();

    }

    function findTemplates() {
        if (!activeEditor) {
            return;
        }
        let templates = Parser.parseTextForTemplates(activeEditor.document.getText(), variables);
        Decorator.decorate(templates, activeEditor);
    }

    function updateAllVariables() {
        FilesUtils.findVariablesFiles(workspaceConfig)
            .then(uris => {
                variables = {};
                uris.forEach(uri => updateVariables(uri, variables));
            });
        findTemplates();
    }

    function updateVariables(uri: vscode.Uri, variables: any, checkFile = false) {
        if (checkFile) {
            FilesUtils.findVariablesFiles(workspaceConfig).then(uris => {
                if (uris.some(uriFound => uri.path === uriFound.path)) {
                    variables[FilesUtils.minimizePathFromWorkspace(uri)] = Parser.parseFileForVariables(uri);
                } else {
                    variables[FilesUtils.minimizePathFromWorkspace(uri)] = {};
                }
            });
        } else {
            variables[FilesUtils.minimizePathFromWorkspace(uri)] = Parser.parseFileForVariables(uri);
        }
        return variables;
    }

    function deleteVariables(uri: vscode.Uri, variables: any) {
        variables[FilesUtils.minimizePathFromWorkspace(uri)] = {};
        return variables;
    }
}