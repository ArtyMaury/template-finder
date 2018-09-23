import * as vscode from 'vscode';
import Parser from './template_parser';
import Decorator from './template_decorator';

export function activate(context: vscode.ExtensionContext) {

    var variables: any = {};

    //#region Initialisation of the extension

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

    var timeout: NodeJS.Timer;
    function triggerUpdateTemplates() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(findTemplates, 1000);

        vscode.workspace.findFiles("**/*.{yml}")
            .then(uris => uris.forEach(uri => updateVariables(uri, variables)))
            .then(() => findTemplates());

        const yamlWatcher = vscode.workspace.createFileSystemWatcher("**/*.{yml}");
        yamlWatcher.onDidChange(uri => updateVariables(uri, variables));
        yamlWatcher.onDidCreate(uri => updateVariables(uri, variables));
        yamlWatcher.onDidDelete(uri => variables[uri.fsPath] = {});
    }
    //#endregion

    function findTemplates() {
        if (!activeEditor) {
            return;
        }
        let templates = Parser.parseTextForTemplates(activeEditor.document.getText(), variables);
        Decorator.decorate(templates, activeEditor);
    }

    function updateVariables(uri: vscode.Uri, variables: any) {
        let filePath = (uri.fsPath);
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
        variables[filePath] = Parser.parseYamlForVariables(uri);
        return variables;
    }
}