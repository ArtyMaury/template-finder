import * as vscode from 'vscode';
import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

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

    parseFileForVariables: function(uri: vscode.Uri): Promise<any> {
        let fileExtension = path.parse(uri.fsPath).ext;
        switch (fileExtension) {
            case '.yml':
                return Promise.resolve(yaml.safeLoad(fs.readFileSync(uri.fsPath, 'utf8')));
            
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