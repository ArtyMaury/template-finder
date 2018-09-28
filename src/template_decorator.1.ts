import * as vscode from "vscode";
import { Template } from "./template_parser";

export default {
  currentDecorators: Array<vscode.Disposable>(),

  decorate: function(decoratorsData: Template[], editor: vscode.TextEditor) {
    let noneMatchingDecorators: vscode.DecorationOptions[] = [];
    let allMatchingDecorators: vscode.DecorationOptions[] = [];
    let someMatchingDecorators: vscode.DecorationOptions[] = [];

    allMatchingTemplateDecorator = vscode.window.createTextEditorDecorationType(
      allMatchingTemplateDecorationRenderOptions
    );
    someMatchingTemplateDecorator = vscode.window.createTextEditorDecorationType(
      someMatchingTemplateDecorationRenderOptions
    );
    noneMatchingTemplateDecorator = vscode.window.createTextEditorDecorationType(
      noneMatchingTemplateDecorationRenderOptions
    );

    const maxMatch = decoratorsData.reduce(
      (previous, current) =>
        Math.max(previous, Object.keys(current.variableMatches).length),
      0
    );
    if (maxMatch === 0) {
      this.clearAllDecorations(editor);
    }

    decoratorsData.forEach(data => {
      const startPos = editor.document.positionAt(data.start);
      const endPos = editor.document.positionAt(data.end);
      let decoration;
      if (Object.keys(data.variableMatches).length > 0) {
        let hoverMessage = Object.keys(data.variableMatches).map(file => {
          return file + ":\n" + data.variableMatches[file];
        });
        decoration = {
          range: new vscode.Range(startPos, endPos),
          hoverMessage: hoverMessage
        };
        if (Object.keys(data.variableMatches).length === maxMatch) {
          allMatchingDecorators.push(decoration);
        } else {
          someMatchingDecorators.push(decoration);
        }
      } else {
        decoration = {
          range: new vscode.Range(startPos, endPos),
          hoverMessage: "No Match Found"
        };
        noneMatchingDecorators.push(decoration);
      }
    });

    this.currentDecorators.push(allMatchingTemplateDecorator);
    this.currentDecorators.push(someMatchingTemplateDecorator);
    this.currentDecorators.push(noneMatchingTemplateDecorator);
    editor.setDecorations(allMatchingTemplateDecorator, allMatchingDecorators);
    editor.setDecorations(
      someMatchingTemplateDecorator,
      someMatchingDecorators
    );
    editor.setDecorations(
      noneMatchingTemplateDecorator,
      noneMatchingDecorators
    );
  },

  clearAllDecorations: function(editor: vscode.TextEditor) {
    this.currentDecorators.forEach(disposable => disposable.dispose);
  }
};

var allMatchingTemplateDecorator: vscode.TextEditorDecorationType;
var someMatchingTemplateDecorator: vscode.TextEditorDecorationType;
var noneMatchingTemplateDecorator: vscode.TextEditorDecorationType;

const allMatchingTemplateDecorationRenderOptions: vscode.DecorationRenderOptions = {
  backgroundColor: "rgba(0,255,0,0.15)"
};
const someMatchingTemplateDecorationRenderOptions: vscode.DecorationRenderOptions = {
  backgroundColor: "rgba(255,140,0,0.15)"
};
const noneMatchingTemplateDecorationRenderOptions: vscode.DecorationRenderOptions = {
  backgroundColor: "rgba(255,0,0,0.15)"
};
