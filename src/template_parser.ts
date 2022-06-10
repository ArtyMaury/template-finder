import * as fs from 'fs'
import * as yaml from 'js-yaml'
import * as path from 'path'
import { isArray, isNullOrUndefined } from 'util'

// [^ ]{1} -> to match at least a character
// [^\|\n ]* -> to match only the variable and not the options (like default)
//  *\|* *(.*) -> to match the jinja templates options separated by |
const jinjaVariableRegex = /{{ *([^ ]{1}[^\|\n ]*) *\|* *(.*?)}}/g
const jinjaForLoopRegex = /{% for ([^ ]+) in ([^%]+) %}/g
const defaultRegex = /default\((.+?)\)/

export default {
  parseTextForTemplates: function (text: string, variables: any, currentObject?: any): Array<Template> {
    const localVariables = JSON.parse(JSON.stringify(variables))
    let templates: Array<Template> = new Array()
    let match
    while ((match = jinjaForLoopRegex.exec(text))) {
      const template = createTemplateFromForLoopMatch(match, localVariables, currentObject)
      templates.push(template)
    }
    while ((match = jinjaVariableRegex.exec(text))) {
      const template = createTemplateFromVariableMatch(match, localVariables, currentObject)
      templates.push(template)
    }
    return templates
  },

  parseFileForVariables: function (uri: string, recursiveYaml: boolean = false): Promise<any> {
    let fileExtension = path.parse(uri).ext
    if (/(\.ya?ml)/.test(fileExtension)) {
      try {
        let fileContent = fs.readFileSync(uri, 'utf8')
        return Promise.resolve(yaml.safeLoad(fileContent)).then(yamlObject => {
          if (recursiveYaml && !isNullOrUndefined(yamlObject)) {
            return this.extraireVarsFiles(yamlObject, uri).then(subYamlObjects => {
              yamlObject.vars_files = subYamlObjects
              return yamlObject
            })
          }
          return Promise.resolve(yamlObject)
        })
      } catch (e) {
        return Promise.resolve({})
      }
    } else {
      return Promise.resolve({})
    }
  },

  extraireVarsFiles: function (yamlObject: any, uri: string) {
    let promises: Promise<any>[] = []
    let varsFiles = findTemplateInObject('vars_files', yamlObject)
    if (!isNullOrUndefined(varsFiles)) {
      promises = (varsFiles as string[]).map(yamlFile => {
        let uriNextFile = path.join(path.parse(uri).dir, yamlFile)
        return this.parseFileForVariables(uriNextFile)
      })
    }
    return Promise.all(promises)
  },
}

export interface Template {
  name: string
  start: number
  end: number
  variableMatches: any
  defaultValue?: any
  objectMatch?: any
  unhandledJinjaOptions: string[]
  isExternal?: boolean
}

function createTemplateFromVariableMatch(match: RegExpExecArray, variables: any, currentObject: any) {
  let templateName = match[1].trim()
  let variableMatches = findTemplateInVariables(templateName, variables)
  let objectMatch
  if (currentObject) {
    objectMatch = findTemplateInObject(templateName, currentObject)
  }
  // To match the jinja templates options

  let defaultValue
  let unhandledJinjaOptions: string[] = []
  let jinjaOptions = match[2]
    .split('|')
    .map(option => option.trim())
    .filter(option => option !== '')
  let defaultOption = jinjaOptions.find(option => defaultRegex.test(option))
  unhandledJinjaOptions = jinjaOptions.filter(option => option !== defaultOption)
  if (defaultOption) {
    //@ts-ignore: Null value not possible
    defaultValue = defaultRegex.exec(defaultOption)[1]
  }
  const template: Template = {
    name: templateName,
    start: match.index,
    end: match.index + match[0].length,
    variableMatches,
    objectMatch,
    defaultValue,
    unhandledJinjaOptions,
  }
  return template
}

function createTemplateFromForLoopMatch(match: RegExpExecArray, variables: any, currentObject: any) {
  let variableName = match[1].trim()
  let listName = match[2].trim()
  let listeMatches = findTemplateInVariables(listName, variables)
  duplicateTemplateVariables(listName, variableName, variables)
  const template: Template = {
    name: listName,
    start: match.index,
    end: match.index + match[0].length,
    variableMatches: listeMatches,
    unhandledJinjaOptions: [],
  }
  return template
}

function findTemplateInVariables(templateName: string, variables: any) {
  var results: any = {}
  for (const file in variables) {
    const objectTemplateValue = getObjectAttributeValue(variables[file], templateName)
    if (objectTemplateValue) {
      results[file] = objectTemplateValue
    }
  }
  return results
}

function findTemplateInObject(templateName: string, object: any) {
  if (!isNullOrUndefined(object)) {
    const objectTemplateValue = getObjectAttributeValue(object, templateName)
    if (objectTemplateValue) {
      return objectTemplateValue
    }
    for (const key in object) {
      if (typeof object[key] === 'object') {
        let foundTemplate: any = findTemplateInObject(templateName, object[key])
        if (foundTemplate) {
          return foundTemplate
        }
      }
    }
  }
  return
}

function duplicateTemplateVariables(variableName1: string, variableName2: string, variablesList: any) {
  const variable1Matches = findTemplateInVariables(variableName1, variablesList)
  for (const file in variable1Matches) {
    variablesList[file][variableName2] = JSON.parse(JSON.stringify(getObjectAttributeValue(variablesList[file], variableName1)))
  }
}

function getObjectAttributeValue(object: any, attributeName?: string): any {
  if (attributeName) {
    if (attributeName.includes('.')) {
      let attributes = attributeName.split('.')
      return getObjectFinalAttribute(object, attributes)
    } else {
      return getObjectAttributeValue(object[attributeName])
    }
  }
  if (!isNullOrUndefined(object) && Object.keys(object).every(key => key !== '[object Object]')) {
    return object
  }
  return
}

function getObjectFinalAttribute(object: any, attributes: string[]): any {
  if (attributes.length === 0) {
    return object
  }
  if (isNullOrUndefined(object)) {
    return
  }
  if (isArray(object)) {
    let listFinalItems = (object as Array<any>).map(item => getObjectFinalAttribute(item, attributes))
    if (listFinalItems.filter(item => !!item && !JSON.stringify(item).includes('undefined')).length > 0) {
      return listFinalItems.filter(item => !!item && !JSON.stringify(item).includes('undefined'))
    }
  }
  return getObjectFinalAttribute(object[attributes[0]], attributes.slice(1))
}
