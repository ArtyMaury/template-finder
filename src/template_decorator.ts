import * as vscode from 'vscode';
import { Template } from './template_parser';

export default {

    decorate: function(decoratorsData: Template[], editor: vscode.TextEditor) {
        const decorators: vscode.DecorationOptions[] = [];
        decoratorsData.forEach(data => {
            const startPos = editor.document.positionAt(data.start);
            const endPos = editor.document.positionAt(data.end);
            const decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: data.name };
            decorators.push(decoration);
        });
        editor.setDecorations(templateDecorator, decorators);
    }
};

const templateDecorator = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,0,0,0.3)'
});