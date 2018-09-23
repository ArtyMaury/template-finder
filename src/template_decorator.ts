import * as vscode from 'vscode';
import { Template } from './template_parser';

export default {

    decorate: function(decoratorsData: Template[], editor: vscode.TextEditor) {
        const noMatchDecorators: vscode.DecorationOptions[] = [];
        const matchingDecorators: vscode.DecorationOptions[] = [];
        const semiMatchingDecorators: vscode.DecorationOptions[] = [];

        const maxMatch = decoratorsData.reduce((previous, current) => Math.max(previous, Object.keys(current.variableMatches).length), 0);

        decoratorsData.forEach(data => {
            const startPos = editor.document.positionAt(data.start);
            const endPos = editor.document.positionAt(data.end);
            let decoration;
            if (Object.keys(data.variableMatches).length > 0) {
                let hoverMessage = Object.keys(data.variableMatches).map(file => {
                    return file + ":\n" + data.variableMatches[file];
                });
                decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: hoverMessage };
                if (Object.keys(data.variableMatches).length === maxMatch) {
                    matchingDecorators.push(decoration);
                } else {
                    semiMatchingDecorators.push(decoration);
                }
            } else {
                decoration = { range: new vscode.Range(startPos, endPos), hoverMessage: "No Match Found" };
                noMatchDecorators.push(decoration);
            }
        });
        editor.setDecorations(matchingTemplateDecorator, matchingDecorators);
        editor.setDecorations(semiMatchingTemplateDecorator, semiMatchingDecorators);
        editor.setDecorations(noMatchTemplateDecorator, noMatchDecorators);
    }
};

const matchingTemplateDecorator = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(0,255,0,0.15)'
});

const semiMatchingTemplateDecorator = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,140,0,0.15)'
});

const noMatchTemplateDecorator = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(255,0,0,0.15)'
});