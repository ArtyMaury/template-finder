import * as vscode from "vscode";
import { Template } from "./template_parser";

export default {
  decorate: function (decoratorsData: Template[], editor: vscode.TextEditor, config: vscode.WorkspaceConfiguration) {
    let noneMatchingDecorators: vscode.DecorationOptions[] = [];
    let allMatchingDecorators: vscode.DecorationOptions[] = [];
    let someMatchingDecorators: vscode.DecorationOptions[] = [];

    const maxMatch = decoratorsData.reduce(
      (previous, current) =>
        Math.max(previous, Object.keys(current.variableMatches).length),
      0
    );

    const lineSeparator = config.get<Array<boolean>>("display.showLineSeparators") ? `| ${'-'.repeat(25)} |
      ` : ""

    decoratorsData.forEach(data => {
      const startPos = editor.document.positionAt(data.start);
      const endPos = editor.document.positionAt(data.end);
      let decoration;
      if (
        maxMatch > 0 &&
        (Object.keys(data.variableMatches).length > 0 || data.defaultValue || data.objectMatch)
      ) {
        let hoverMessage = new vscode.MarkdownString(
          `| ${'&nbsp;'.repeat(10)} Values ${'&nbsp;'.repeat(10)} |
          | -------------------------- |
          `
        );
        if (data.defaultValue) {
          hoverMessage.appendMarkdown(
            lineSeparator + `| **default** |
          | ${beautifyValue(data.defaultValue)} |
          `);
        }
        if (data.objectMatch) {
          hoverMessage.appendMarkdown(
            lineSeparator + `| **current file** |
          | ${beautifyValue(data.objectMatch)} |
          `);
        }
        Object.keys(data.variableMatches).forEach(file => {
          let location = file.replace(/\\/g, " / ");
          hoverMessage.appendMarkdown(
            lineSeparator + `| **${location}** |
          | ${beautifyValue(data.variableMatches[file])} |
          `);
        });
        decoration = {
          range: new vscode.Range(startPos, endPos),
          hoverMessage: hoverMessage
        };
        if (Object.keys(data.variableMatches).length === maxMatch || data.objectMatch) {
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

function beautifyValue(value: any, addedTab: number = 0, shouldAddLine:boolean = true): String {
  const prefixFirst = shouldAddLine ? `
  ${'&nbsp;'.repeat(addedTab * 2)}` : ""
  const prefixValues = `
  ${'&nbsp;'.repeat(addedTab * 2)}`
  if (typeof value == "object") {
    return Object.keys(value).map((key, index) => {
      if (isNaN(Number.parseInt(key))) {
        // Affichage d'un attribut de l'objet
        return (index === 0 ? prefixFirst : prefixValues) + `${key} : ${beautifyValue(value[key], addedTab + 1)}`
      }
      // Affichages des elements d'un tableau
      return prefixValues + `- ${beautifyValue(value[key], addedTab + 1, false)}`
    }).reduce((p,c)=>p+c)
  }
  return value;
}