import * as vscode from "vscode";
import { Template } from "./template_parser";

export default {
  decorate: function (decoratorsData: Template[], editor: vscode.TextEditor) {
    let noneMatchingDecorators: vscode.DecorationOptions[] = [];
    let allMatchingDecorators: vscode.DecorationOptions[] = [];
    let someMatchingDecorators: vscode.DecorationOptions[] = [];

    const maxMatch = decoratorsData.reduce(
      (previous, current) =>
        Math.max(previous, Object.keys(current.variableMatches).length),
      0
    );

    decoratorsData.forEach(data => {
      const startPos = editor.document.positionAt(data.start);
      const endPos = editor.document.positionAt(data.end);
      let decoration;
      if (
        maxMatch > 0 &&
        (Object.keys(data.variableMatches).length > 0 || data.defaultValue)
      ) {
        let hoverMessage = new vscode.MarkdownString(
          `Location | Value
          :--- | ---:
          `);
        if (data.defaultValue) {
          hoverMessage.appendMarkdown("default | " + data.defaultValue + `
          `);
        }
        Object.keys(data.variableMatches).forEach(file => {
          let location = file.replace(/\\/g, " / ");
          hoverMessage.appendMarkdown(location + " | " + data.variableMatches[file] + `
          `);
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

  clearAllDecorations: function (editor: vscode.TextEditor) {
    allMatchingTemplateDecorator.dispose();
    someMatchingTemplateDecorator.dispose();
    noneMatchingTemplateDecorator.dispose();
    this.initiated = false;
  },

  initiated: false,

  init: function () {
    allMatchingTemplateDecorator = vscode.window.createTextEditorDecorationType(
      allMatchingTemplateDecorationRenderOptions
    );
    someMatchingTemplateDecorator = vscode.window.createTextEditorDecorationType(
      someMatchingTemplateDecorationRenderOptions
    );
    noneMatchingTemplateDecorator = vscode.window.createTextEditorDecorationType(
      noneMatchingTemplateDecorationRenderOptions
    );
    this.initiated = true;
  }
};

const allMatchingTemplateDecorationRenderOptions: vscode.DecorationRenderOptions = {
  color: "rgba(0,255,0,0.75)"
};
const someMatchingTemplateDecorationRenderOptions: vscode.DecorationRenderOptions = {
  color: "rgba(255,140,0,0.75)"
};
const noneMatchingTemplateDecorationRenderOptions: vscode.DecorationRenderOptions = {
  color: "rgba(255,0,0,0.9)"
};

var allMatchingTemplateDecorator: vscode.TextEditorDecorationType;
var someMatchingTemplateDecorator: vscode.TextEditorDecorationType;
var noneMatchingTemplateDecorator: vscode.TextEditorDecorationType;
