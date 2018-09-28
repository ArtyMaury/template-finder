import * as vscode from "vscode";
import * as yaml from "js-yaml";
import * as fs from "fs";
import * as path from "path";
import { isNullOrUndefined } from "util";

// [^ ]{1} -> to match at least a character
// [^\|\n ]* -> to match only the variable and not the options (like default)
// (?:\| *([^\|\n ]*) *)* -> to match the dirty jinja templates options but not keep them in the match
// ([^\|\n ]*) -> to match the clean jinja templates options and keep them in the match
const jinjaRegex = /{{ *([^ ]{1}[^\|\n ]*) *(?:\| *([^\|\n ]*) *)*}}/g;
const defaultRegex = /default\((.+)\)/;

export default {
  parseTextForTemplates: function(
    text: string,
    variables: any
  ): Array<Template> {
    let templates: Array<Template> = new Array();
    let match;
    while ((match = jinjaRegex.exec(text))) {
      let templateName = match[1].trim();
      let variableMatches = findTemplateInVariables(templateName, variables);
      // To match the jinja templates options
      let defaultOption = match
        .slice(2)
        .filter(
          templateOption =>
            templateOption !== undefined &&
            defaultRegex.test(templateOption.trim())
        )[0];
      let defaultValue;
      if (!isNullOrUndefined(defaultOption)) {
        //@ts-ignore: Null value not possible
        defaultValue = defaultRegex.exec(defaultOption.trim())[1];
      }
      const template: Template = {
        name: templateName,
        start: match.index,
        end: match.index + match[0].length,
        variableMatches: variableMatches,
        defaultValue: defaultValue
      };

      templates.push(template);
    }
    return templates;
  },

  parseFileForVariables: function(uri: vscode.Uri): Promise<any> {
    let fileExtension = path.parse(uri.fsPath).ext;
    switch (fileExtension) {
      case ".yml":
        return Promise.resolve(
          yaml.safeLoad(fs.readFileSync(uri.fsPath, "utf8"))
        );

      default:
        return Promise.resolve();
    }
  }
};

export interface Template {
  name: string;
  start: number;
  end: number;
  variableMatches: any;
  defaultValue: any;
}

function findTemplateInVariables(templateName: string, variables: any) {
  var results: any = {};
  Object.keys(variables).forEach(file => {
    if (variables[file][templateName] !== undefined) {
      results[file] = variables[file][templateName];
    }
  });
  return results;
}
