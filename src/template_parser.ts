import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';

const templateRegex = /{{(.+)}}/g;

export default {
    parseTextForTemplates: function (text: string, variables: any): Array<Template> {
        let templates: Array<Template> = new Array;
        let match;
        while (match = templateRegex.exec(text)) {
            let templateName = match[1].trim();
            let variableMatches = findTemplateInVariables(templateName, variables);
            const template: Template = {
                name: templateName,
                start: match.index,
                end: match.index + match[0].length,
                variableMatches: variableMatches
            };

            templates.push(template);
        }
        return templates;
    },

    parseYamlForVariables: function(uri: vscode.Uri): object {
        return yaml.safeLoad(fs.readFileSync(uri.fsPath, 'utf8'));
    }
};

export interface Template {
    name: string;
    start: number;
    end: number;
    variableMatches: any;
}

function findTemplateInVariables(templateName: string, variables: any) {
    var results: any = {};
    Object.keys(variables).forEach(file => {
        results[file] = variables[file][templateName];
    });
    return results;
}