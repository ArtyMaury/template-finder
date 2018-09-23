import * as vscode from 'vscode';
import Parser from './template_parser';
import Decorator from './template_decorator';

export function activate(context: vscode.ExtensionContext) {

    //#region Initialisation of the extension

    let activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
        triggerUpdateDecorations();
    }

    vscode.window.onDidChangeActiveTextEditor(editor => {
        activeEditor = editor;
        if (editor) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    vscode.workspace.onDidChangeTextDocument(event => {
        if (activeEditor && event.document === activeEditor.document) {
            triggerUpdateDecorations();
        }
    }, null, context.subscriptions);

    var timeout: NodeJS.Timer;
    function triggerUpdateDecorations() {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = setTimeout(findTemplates, 1000);
    }
    //#endregion

    function findTemplates() {
        if (!activeEditor) {
            return;
        }
        let templates = Parser.parseTextForTemplates(activeEditor.document.getText());
        Decorator.decorate(templates, activeEditor);
    }
}