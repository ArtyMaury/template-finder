import * as fs from 'fs';
import * as yaml from 'js-yaml';
import * as path from 'path';
import { isNullOrUndefined } from 'util';

// [^ ]{1} -> to match at least a character
// [^\|\n ]* -> to match only the variable and not the options (like default)
//  *\|* *(.*) -> to match the jinja templates options separated by |
const jinjaRegex = /{{ *([^ ]{1}[^\|\n ]*) *\|* *(.*)}}/g;
const defaultRegex = /default\((.+?)\)/;

export default {
  parseTextForTemplates: function(
    text: string,
    variables: any,
    currentObject?: any
  ): Array<Template> {
    let templates: Array<Template> = new Array();
    let match;
    while ((match = jinjaRegex.exec(text))) {
      let templateName = match[1].trim();
      let variableMatches = findTemplateInVariables(templateName, variables);
      let objectMatch;
      if (currentObject) {
        objectMatch = findTemplateInObject(templateName, currentObject);
      }
      // To match the jinja templates options
      let jinjaOptions = match[2].split('|').map(option => option.trim());
      let defaultOption = jinjaOptions.find(option =>
        defaultRegex.test(option)
      );
      let unhandledJinjaOptions = jinjaOptions.filter(
        option => option !== defaultOption
      );
      let defaultValue;
      if (defaultOption) {
        //@ts-ignore: Null value not possible
        defaultValue = defaultRegex.exec(defaultOption)[1];
      }
      const template: Template = {
        name: templateName,
        start: match.index,
        end: match.index + match[0].length,
        variableMatches: variableMatches,
        objectMatch: objectMatch,
        defaultValue: defaultValue,
        unhandledJinjaOptions: unhandledJinjaOptions
      };

      templates.push(template);
    }
    return templates;
  },

  parseFileForVariables: function(
    uri: string,
    recursiveYaml: boolean = false
  ): Promise<any> {
    let fileExtension = path.parse(uri).ext;
    let fileContent;
    switch (fileExtension) {
      case '.yml':
        try {
          fileContent = fs.readFileSync(uri, 'utf8');
          return Promise.resolve(yaml.safeLoad(fileContent)).then(
            yamlObject => {
              if (recursiveYaml && !isNullOrUndefined(yamlObject)) {
                return this.extraireVarsFiles(yamlObject, uri).then(
                  subYamlObjects => {
                    yamlObject.vars_files = subYamlObjects;
                    return yamlObject;
                  }
                );
              }
              return Promise.resolve(yamlObject);
            }
          );
        } catch (e) {
          return Promise.resolve({});
        }

      default:
        return Promise.resolve({});
    }
  },

  extraireVarsFiles: function(yamlObject: any, uri: string) {
    let promises: Promise<any>[] = [];
    let varsFiles = findTemplateInObject('vars_files', yamlObject);
    if (!isNullOrUndefined(varsFiles)) {
      promises = (varsFiles as string[]).map(yamlFile => {
        let uriNextFile = path.join(path.parse(uri).dir, yamlFile);
        return this.parseFileForVariables(uriNextFile);
      });
    }
    return Promise.all(promises);
  }
};

export interface Template {
  name: string;
  start: number;
  end: number;
  variableMatches: any;
  defaultValue?: any;
  objectMatch?: any;
  unhandledJinjaOptions: string[];
}

function findTemplateInVariables(templateName: string, variables: any) {
  var results: any = {};
  Object.keys(variables).forEach(file => {
    if (
      !isNullOrUndefined(variables[file]) &&
      isGoodObject(variables[file][templateName])
    ) {
      results[file] = variables[file][templateName];
    }
  });
  return results;
}

function findTemplateInObject(templateName: string, object: any) {
  if (isNullOrUndefined(object)) {
    return undefined;
  }
  if (isGoodObject(object[templateName])) {
    return object[templateName];
  }
  for (const key in object) {
    if (typeof object[key] === 'object') {
      let foundTemplate: any = findTemplateInObject(templateName, object[key]);
      if (foundTemplate) {
        return foundTemplate;
      }
    }
  }
  return undefined;
}

function isGoodObject(object: any) {
  return (
    !isNullOrUndefined(object) &&
    Object.keys(object).every(key => key !== '[object Object]')
  );
}
